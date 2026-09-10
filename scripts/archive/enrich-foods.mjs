// @ts-nocheck
/**
 * enrich-foods.mjs —— 给 foods.ts 现有食物回填 cuisine/role/priceTier/spicy 四个新字段。
 *
 * 用法：
 *   node scripts/enrich-foods.mjs          # 干跑：只推断 + 写报告，不改源文件
 *   node scripts/enrich-foods.mjs --write   # 确认无误后真正写回 foods.ts
 *
 * 解析策略：字符串感知的花括号扫描，取出 foods 数组里每个顶层对象，
 * 从其 id/name/kind/regions/tags 推断四个字段，插在 kind: 行之后。
 * 推断是确定性规则；拿不准的标 TODO，报告里单列，由人工精修。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOODS_PATH = join(__dirname, "..", "src", "config", "foods.ts");
const REPORT_PATH = join(__dirname, "enrich-report.txt");
const WRITE = process.argv.includes("--write");

const src = readFileSync(FOODS_PATH, "utf8");

// ---- 1. 定位 foods 数组体 ----
const startMarker = "export const foods: Food[] = [";
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) throw new Error("找不到 foods 数组起点");
// marker 末尾那个 [ 才是数组开口（别用 indexOf("[")，那会命中 Food[] 里的 [）
const arrayOpen = startIdx + startMarker.length - 1;

// ---- 2. 字符串感知扫描，切出每个顶层 { ... } 对象的 [start,end) ----
function topLevelObjects(text, openBracketIdx) {
  const objs = [];
  let depth = 0; // 相对 [ 的深度：进入 [ 后为 1
  let inStr = false;
  let strCh = "";
  let objStart = -1;
  for (let i = openBracketIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === "[") { depth++; continue; }
    if (c === "]") { depth--; if (depth === 0) break; continue; }
    if (c === "{") { if (depth === 1) objStart = i; depth++; continue; }
    if (c === "}") {
      depth--;
      if (depth === 1 && objStart !== -1) { objs.push([objStart, i + 1]); objStart = -1; }
      continue;
    }
  }
  return objs;
}

const objSpans = topLevelObjects(src, arrayOpen);

// ---- 3. 字段提取小工具 ----
const field = (block, key) => {
  const m = block.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  return m ? m[1] : null;
};
const arrField = (block, key) => {
  const m = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

// ---- 4. 推断规则 ----
// 中餐地区 → 细分菜系
const REGION_TO_CUISINE = {
  dongbei: "cn-dongbei", chuanyu: "cn-chuanyu", hunan: "cn-hunan",
  guangdong: "cn-guangdong", jiangzhe: "cn-jiangzhe", xibei: "cn-xibei",
  yunguigui: "cn-yunguigui", beifang: "cn-beifang",
};
// 名称关键词 → 菜系（有序，先匹配先赢）
const NAME_CUISINE = [
  [/寿司|豚骨|日式|章鱼小丸子|关东煮|烧鸟|天妇罗|乌冬|亲子|照烧|寿喜/, "japanese"],
  [/韩式|石锅|部队锅|泡菜|年糕|紫菜包饭|冷面/, "korean"],
  [/披萨|意面|意大利|肉酱|萨莉亚|焗饭|帕尼尼/, "western-italian"],
  [/汉堡|薯条|麦当劳|肯德基|汉堡王|华莱士|塔斯汀|赛百味|三明治|华夫|热狗|炸鸡块/, "western-american"],
  [/冬阴功|泰式|菠萝炒饭|青咖喱|船面/, "thai"],
  [/星洲|新加坡|越南|河粉|沙嗲|肉骨茶|叻沙|咖喱/, "sea"],
  [/土耳其|中东|沙威玛|烤肉饭/, "mideast"],
];
function inferCuisine(name, regions) {
  if (regions.length && REGION_TO_CUISINE[regions[0]]) {
    return { v: REGION_TO_CUISINE[regions[0]], todo: false };
  }
  for (const [re, c] of NAME_CUISINE) if (re.test(name)) return { v: c, todo: false };
  // 无地区、无国际关键词 → 通用中餐；但标 TODO 以便人工确认是否真中餐
  return { v: "cn-generic", todo: true };
}

// 轻小吃关键词
const SNACK_RE = /蛋挞|华夫|蛋糕|曲奇|饼干|汤圆|薯条|章鱼小丸子|红豆派|双皮奶|姜撞奶|仙草|臭豆腐|鸡柳|盐酥鸡|烤面筋|酱香饼|千层饼|锅盔|包子|油条|豆腐脑|生煎|虾饺|烧卖|煎饼|关东煮|大福|年糕|串|丸子|点心/;
function inferRole(name, kind, tags, meals) {
  if (kind === "drink") return "snack"; // 饮品不参与角色逻辑，占位
  if (SNACK_RE.test(name)) return "snack";
  // 只在下午茶/宵夜出没且不下饭 → 偏小吃
  if (!tags.includes("下饭") && meals.length && meals.every((m) => m === "tea" || m === "midnight")) {
    return "snack";
  }
  return "main";
}

// 价位
const TREAT_RE = /火锅|烤肉|自助|小龙虾|烤鱼|铜锅|手抓羊肉|大盘鸡|寿喜|和牛|牛肉火锅|猪肚鸡|毛血旺|串串/;
const BUDGET_RE = /沙县|泡面|蛋炒饭|煎饼|包子|油条|馄饨|麻辣烫|华莱士|米线|米粉|拌面|凉皮|酸辣粉|豆腐脑|锅盔|饼/;
function inferPrice(name, tags) {
  if (TREAT_RE.test(name)) return "treat";
  if (tags.includes("省钱") || BUDGET_RE.test(name)) return "budget";
  return "normal";
}

// 辣度
function inferSpicy(name, regions, tags) {
  if (/爆辣|麻辣|香辣|毛血旺|水煮|油泼/.test(name)) return 3;
  if (/小面|酸辣|串串|香锅|冒菜|麻辣烫|湘|川/.test(name)) return 2;
  if (/鱼香|宫保|泡椒|微辣/.test(name)) return 1;
  if (regions.includes("chuanyu") || regions.includes("hunan")) return 2;
  if (tags.includes("解辣")) return 0;
  return 0;
}

// ---- 5. 遍历对象、推断、（可选）写回 ----
const rows = [];
const todos = [];
let out = src;
// 从后往前替换，避免索引漂移
const edits = [];
for (const [s, e] of objSpans) {
  const block = src.slice(s, e);
  const id = field(block, "id");
  const name = field(block, "name");
  const kind = field(block, "kind") ?? "main";
  const regions = arrField(block, "regions");
  const tags = arrField(block, "tags");
  const meals = arrField(block, "meals");
  if (!id || !name) continue;
  // 已有 cuisine 就跳过（幂等）
  if (/\bcuisine:/.test(block)) continue;

  const cuisine = inferCuisine(name, regions);
  const role = inferRole(name, kind, tags, meals);
  const priceTier = inferPrice(name, tags);
  const spicy = inferSpicy(name, regions, tags);

  rows.push({ id, name, kind, cuisine: cuisine.v, role, priceTier, spicy, todo: cuisine.todo });
  if (cuisine.todo) todos.push({ id, name });

  // 插在 kind: 行之后，保持缩进（对象内字段是 4 空格缩进）
  const kindLineRe = /(\n(\s*)kind:\s*"[^"]*",)/;
  const m = block.match(kindLineRe);
  if (m) {
    const indent = m[2];
    const inject =
      `\n${indent}cuisine: "${cuisine.v}",` +
      `\n${indent}role: "${role}",` +
      `\n${indent}priceTier: "${priceTier}",` +
      `\n${indent}spicy: ${spicy},`;
    const newBlock = block.replace(kindLineRe, `$1${inject}`);
    edits.push([s, e, newBlock]);
  }
}

if (WRITE) {
  for (let i = edits.length - 1; i >= 0; i--) {
    const [s, e, nb] = edits[i];
    out = out.slice(0, s) + nb + out.slice(e);
  }
  writeFileSync(FOODS_PATH, out, "utf8");
}

// ---- 6. 报告 ----
const fam = { "cn-generic": "中", "cn-dongbei": "中", "cn-chuanyu": "中", "cn-hunan": "中", "cn-guangdong": "中", "cn-jiangzhe": "中", "cn-xibei": "中", "cn-yunguigui": "中", "cn-beifang": "中", japanese: "日", korean: "韩", "western-italian": "西", "western-american": "西", "western-generic": "西", thai: "异", sea: "异", mideast: "异", "exotic-generic": "异" };
const pad = (s, n) => String(s).padEnd(n, " ");
let report = `共 ${rows.length} 条；TODO(需人工确认菜系) ${todos.length} 条\n\n`;
report += rows.map((r) =>
  `${r.todo ? "⚠ " : "  "}${pad(r.name, 16)} ${pad(r.cuisine, 18)} ${pad(r.role, 6)} ${pad(r.priceTier, 8)} 辣${r.spicy}`
).join("\n");
writeFileSync(REPORT_PATH, report, "utf8");

// 终端摘要
const byCuisine = {};
for (const r of rows) byCuisine[r.cuisine] = (byCuisine[r.cuisine] ?? 0) + 1;
console.log(WRITE ? "✅ 已写回 foods.ts" : "🔍 干跑（未改源文件）");
console.log(`总计 ${rows.length} 条`);
console.log("菜系分布:", JSON.stringify(byCuisine, null, 0));
console.log(`TODO ${todos.length} 条（cn-generic 兜底，需确认是否真中餐）`);
console.log(`完整报告: ${REPORT_PATH}`);
