// @ts-check
/**
 * 构建期菜谱摄取脚本（离线运行，不进运行时 / 不打进客户端包）
 *
 * 用法：
 *   node scripts/ingest-recipes.mjs
 *
 * 流程：
 *   1. git clone --depth 1 拉取 Anduin2017/HowToCook（MIT）到临时目录
 *   2. 遍历 dishes/<category>/*.md，解析菜名 / 原料 / 步骤
 *   3. 规则引擎富化：目录定 kind + 默认 emoji，关键词细化 emoji
 *   4. 过滤脏数据（非菜谱目录、步骤 < 2、无原料）
 *   5. 产出 src/config/datasets/recipes.generated.json（按 id 排序，带 MIT 署名）
 *
 * 设计原则：目录是主分类信号（比菜名关键词可靠），关键词仅用于细化 emoji。
 */

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_URL = "https://github.com/Anduin2017/HowToCook.git";
const REPO_SLUG = "Anduin2017/HowToCook";
const LICENSE = "MIT";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const OUT_PATH = join(PROJECT_ROOT, "src/config/datasets/recipes.generated.json");
const INDEX_PATH = join(PROJECT_ROOT, "src/config/datasets/recipes.index.json");

/**
 * 源目录 → 种类 + 默认 emoji。
 * 不在此表里的目录（condiment / semi-finished / template）视为「非独立菜」直接跳过。
 * @type {Record<string, { kind: "main" | "drink"; emoji: string }>}
 */
const CATEGORY_RULES = {
  drink: { kind: "drink", emoji: "🥤" },
  aquatic: { kind: "main", emoji: "🐟" },
  breakfast: { kind: "main", emoji: "🥢" },
  dessert: { kind: "main", emoji: "🍰" },
  meat_dish: { kind: "main", emoji: "🍖" },
  soup: { kind: "main", emoji: "🍲" },
  staple: { kind: "main", emoji: "🍚" },
  vegetable_dish: { kind: "main", emoji: "🥬" },
};

/**
 * 关键词 → emoji，用于在目录默认值之上细化（命中第一个即用）。
 * 顺序有意义：更具体的排前面。
 * @type {Array<[RegExp, string]>}
 */
const KEYWORD_EMOJI = [
  [/(面|粉|米线|乌冬|意面|拉面)/, "🍜"],
  [/(饺|馄饨|云吞|抄手)/, "🥟"],
  [/(包|馒头|花卷)/, "🥟"],
  [/(粥|羹)/, "🥣"],
  [/(炒饭|盖饭|饭|焖饭|煲仔)/, "🍚"],
  [/(鸡|鸭|鹅)/, "🍗"],
  [/(鱼|虾|蟹|贝|蛤|鱿|章鱼|海鲜)/, "🦐"],
  [/(牛|猪|羊|肉|排骨|培根|香肠|腊肠)/, "🍖"],
  [/(蛋挞|蛋糕|布丁|慕斯|曲奇|饼干|甜品|布朗尼)/, "🍰"],
  [/(汤|煲|羹)/, "🍲"],
  [/(咖啡|拿铁|美式|卡布)/, "☕"],
  [/(茶|奶茶|柠檬)/, "🧋"],
  [/(奶昔|拉西|酸奶)/, "🥛"],
  [/(汁|果汁|柠檬水)/, "🧃"],
  [/(沙拉|蔬菜|青菜|西兰花|菠菜|生菜)/, "🥗"],
  [/(豆腐|豆制品)/, "🍢"],
  [/(土豆|薯)/, "🥔"],
  [/(蘑菇|菌|香菇)/, "🍄"],
];

/** 把菜名 slug 化成 ascii-friendly 的 id；中文则退化为去空格 + 索引兜底 */
function slugify(name, index) {
  const base = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[（）()【】[\]·、，。!！?？]/g, "")
    .toLowerCase();
  return base.length > 0 ? `htc-${base}-${index}` : `htc-recipe-${index}`;
}

/** 从一段 markdown 中，抽取某个 `## 标题` 段落下、到下一个 `## ` 之前的内容行 */
function sectionLines(md, headingRegex) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      // 命中目标小节开始；命中其它二级标题则结束
      inSection = headingRegex.test(line);
      continue;
    }
    if (inSection) out.push(line);
  }
  return out;
}

/** 清掉 markdown 强调标记、行内编号/项目符号，得到纯文本 */
function cleanText(s) {
  return s
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .trim();
}

/** 解析单个菜谱 md，返回 { name, ingredients, steps } 或 null（格式不符） */
function parseRecipe(md) {
  const titleMatch = md.match(/^#\s+(.+?)\s*$/m);
  if (!titleMatch) return null;
  const name = titleMatch[1].replace(/的做法\s*$/, "").trim();
  if (!name) return null;

  const ingredients = sectionLines(md, /必备原料|原料和工具|原料/)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map(cleanText)
    .filter(Boolean);

  const steps = sectionLines(md, /操作/)
    .filter((l) => /^\s*\d+[.)]\s+/.test(l))
    .map(cleanText)
    .filter(Boolean);

  return { name, ingredients, steps };
}

/** 规则引擎：按目录定 kind/默认 emoji，再用关键词细化 emoji */
function enrich(category, name) {
  const rule = CATEGORY_RULES[category];
  let emoji = rule.emoji;
  for (const [re, e] of KEYWORD_EMOJI) {
    if (re.test(name)) {
      // 饮品目录下不该被「鸡/肉」类关键词污染，只接受饮品类 emoji
      if (rule.kind === "drink" && !["☕", "🧋", "🥛", "🧃", "🥤"].includes(e)) continue;
      emoji = e;
      break;
    }
  }
  return { kind: rule.kind, emoji };
}

function main() {
  const tmp = mkdtempSync(join(tmpdir(), "howtocook-"));
  console.log(`[1/4] 克隆 ${REPO_SLUG} → ${tmp} …`);
  execSync(`git clone --depth 1 ${REPO_URL} "${tmp}"`, { stdio: ["ignore", "ignore", "inherit"] });

  const dishesDir = join(tmp, "dishes");
  if (!existsSync(dishesDir)) {
    console.error("✗ 未找到 dishes/ 目录，仓库结构可能已变。");
    process.exit(1);
  }

  const stats = {
    scanned: 0,
    skippedCategory: 0,
    skippedDirty: 0,
    kept: 0,
    byCategory: /** @type {Record<string, number>} */ ({}),
    emojiDefault: 0,
    emojiRefined: 0,
  };

  /** @type {import("../src/config/datasets/types").GeneratedRecipe[]} */
  const recipes = [];
  let index = 0;

  for (const category of readdirSync(dishesDir)) {
    const catPath = join(dishesDir, category);
    if (!statSync(catPath).isDirectory()) continue;

    // 非独立菜目录直接跳过（condiment / semi-finished / template）
    if (!CATEGORY_RULES[category]) {
      const skipped = readdirSync(catPath).filter((f) => f.endsWith(".md")).length;
      stats.skippedCategory += skipped;
      continue;
    }

    // 每道菜可能是 <category>/<name>.md，或 <category>/<name>/<name>.md
    const mdFiles = collectMd(catPath);
    for (const file of mdFiles) {
      stats.scanned++;
      const md = readFileSync(file, "utf8");
      const parsed = parseRecipe(md);

      // 脏数据过滤：解析失败 / 步骤 < 2 / 无原料
      if (!parsed || parsed.steps.length < 2 || parsed.ingredients.length === 0) {
        stats.skippedDirty++;
        continue;
      }

      const { kind, emoji } = enrich(category, parsed.name);
      const def = CATEGORY_RULES[category].emoji;
      if (emoji === def) stats.emojiDefault++;
      else stats.emojiRefined++;

      recipes.push({
        id: slugify(parsed.name, index++),
        name: parsed.name,
        kind,
        category: /** @type {any} */ (category),
        emoji,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
      });
      stats.kept++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }
  }

  console.log("[2/4] 解析 + 富化完成");
  console.log("[3/4] 排序 + 写出 …");

  recipes.sort((a, b) => a.id.localeCompare(b.id));

  /** @type {import("../src/config/datasets/types").GeneratedRecipeDataset} */
  const dataset = {
    source: {
      repo: REPO_SLUG,
      url: "https://github.com/Anduin2017/HowToCook",
      license: LICENSE,
      generatedBy: "scripts/ingest-recipes.mjs",
    },
    count: recipes.length,
    recipes,
  };

  writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2) + "\n", "utf8");

  // 额外产出轻量索引（仅 id/name/emoji/kind/category）：
  // 这个文件小，可安全 client-import 用于滚轮 + 菜谱库列表/搜索；
  // 完整食材/步骤按 id 走 /api/recipes 服务端拉取，不进客户端包。
  /** @type {import("../src/config/datasets/types").RecipeIndex} */
  const indexFile = {
    count: recipes.length,
    recipes: recipes.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      category: r.category,
      emoji: r.emoji,
    })),
  };
  writeFileSync(INDEX_PATH, JSON.stringify(indexFile, null, 2) + "\n", "utf8");

  // 清理临时克隆
  rmSync(tmp, { recursive: true, force: true });

  console.log("[4/4] 完成 ✅\n");
  console.log("===== 摄取报告 =====");
  console.log(`扫描 md 文件   : ${stats.scanned}`);
  console.log(`跳过(非菜目录) : ${stats.skippedCategory}`);
  console.log(`跳过(脏数据)   : ${stats.skippedDirty}`);
  console.log(`保留           : ${stats.kept}`);
  console.log(`emoji 默认/细化: ${stats.emojiDefault} / ${stats.emojiRefined}`);
  console.log("各分类产出     :", stats.byCategory);
  console.log(`\n产出 → ${OUT_PATH}`);
  console.log(`索引 → ${INDEX_PATH}`);
}

/** 递归收集一个分类目录下的所有 .md（排除 README/模板类） */
function collectMd(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      out.push(...collectMd(p));
    } else if (entry.endsWith(".md") && !/^readme/i.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

main();
