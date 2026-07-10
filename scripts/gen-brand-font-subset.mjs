// @ts-nocheck
/**
 * 品牌展示字体子集重生成脚本 —— 得意黑 / Smiley Sans（仅 /picker 用）
 * ══════════════════════════════════════════════════════════════════
 * 下载源 : https://github.com/atelier-anchor/smiley-sans (release v2.0.1)
 *          资产 smiley-sans-v2.0.1.zip → SmileySans-Oblique.ttf
 * 版本   : v2.0.1 (2024-02-07)
 * 许可证 : SIL Open Font License 1.1（可嵌入/子集/商用，须随附 OFL 文本，
 *          见 src/app/fonts/OFL.txt）。字体保留名 "Smiley" / "得意黑"。
 *
 * 作用：把整套得意黑（9497 字形，~2.6MB）子集化成「只含实际会展示的字符」的
 * woff2，供 /picker 品牌标题 / result 菜名 / loading 重点词使用。菜名不是用户
 * 任意输入，而是 foods.ts 里的固定数据集，故字符可穷举。
 *
 * ⚠️ 新增菜名后若出现缺字（品牌字没覆盖到，会优雅回落系统字体）：
 *    重跑本脚本即可 →  npm run font:brand
 *
 * 字符来源（直接 import 真源，不用脆弱正则）：
 *   ① foods.ts 全部 name（371 道菜名，唯一展示的菜名字段）
 *   ② picker-copy.ts 全部品牌/按钮/loading/结果文案
 *   ③ 手工补充：餐段词 / 筛选词 / 结果页常见词
 *   ④ 数字 0-9、英文 A-Z a-z、常见单位、常用中英文标点
 *
 * 依赖：pyftsubset（Python fonttools + brotli）。
 *   安装： python3 -m pip install --user fonttools brotli
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// —— 输入/输出路径 ——
const SRC_TTF = process.env.SMILEY_TTF || "/tmp/brandfont/smiley_pkg/SmileySans-Oblique.ttf";
const OUT_WOFF2 = resolve(ROOT, "src/app/fonts/SmileySans-subset.woff2");

// —— pyftsubset 定位（可能不在 PATH 上）——
function findPyftsubset() {
  const candidates = [
    "pyftsubset",
    resolve(homedir(), "Library/Python/3.9/bin/pyftsubset"),
    resolve(homedir(), ".local/bin/pyftsubset"),
    "/usr/local/bin/pyftsubset",
    "/opt/homebrew/bin/pyftsubset",
  ];
  for (const c of candidates) {
    try {
      execFileSync(c, ["--help"], { stdio: "ignore" });
      return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

// —— 手工补充字符集（你补充的第 4 点）——
const EXTRA_WORDS = [
  // 餐段词
  "早餐", "午餐", "下午茶", "晚餐", "夜宵", "早饭", "午饭", "晚饭", "宵夜",
  // 筛选词
  "风味", "心情", "预算", "地区", "附近", "推荐", "口味",
  // 结果页常见词
  "今天这桌", "换一道", "就吃这个", "找附近的店", "今天吃什么", "今日菜单板",
  "帮我选一个", "再换一道", "正在匹配饭点", "清空重选",
  // 常见单位
  "米", "公里", "元", "块", "份", "人", "家",
];

// 数字 + 英文字母
const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const UNITS = "mkm"; // m / km（字母已含，保底）
// 常用中英文标点 + 空格
const PUNCT = "？！，。、·…—～：；「」『』（）()《》【】\"'/&%+-. ";

async function collectChars() {
  const chars = new Set();
  const add = (s) => {
    if (typeof s === "string") for (const ch of s) chars.add(ch);
  };
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === "string") add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") Object.values(v).forEach(walk);
  };

  // ① foods.ts 全部 name（Node 原生 strip-types 直接 import .ts）
  const foodsUrl = pathToFileURL(resolve(ROOT, "src/config/foods.ts")).href;
  const { foods } = await import(foodsUrl);
  let nameCount = 0;
  const missingName = [];
  for (const f of foods) {
    if (typeof f.name === "string" && f.name.length) {
      add(f.name);
      nameCount++;
    } else {
      missingName.push(f.id ?? "(no id)");
    }
  }

  // ② picker-copy.ts 全部导出文案
  const copyUrl = pathToFileURL(
    resolve(ROOT, "src/components/features/picker/picker-copy.ts"),
  ).href;
  const copy = await import(copyUrl);
  Object.values(copy).forEach(walk);

  // ③④ 手工补充
  EXTRA_WORDS.forEach(add);
  add(DIGITS);
  add(LETTERS);
  add(UNITS);
  add(PUNCT);

  return { chars, nameCount, foodTotal: foods.length, missingName };
}

async function main() {
  console.log("── 品牌字体子集重生成（得意黑 · 仅 /picker）──\n");

  if (!existsSync(SRC_TTF)) {
    console.error(`✗ 找不到源字体：${SRC_TTF}`);
    console.error(
      "  请先下载 smiley-sans v2.0.1 并解出 SmileySans-Oblique.ttf，" +
        "或用环境变量 SMILEY_TTF 指定路径。",
    );
    process.exit(1);
  }

  const pyftsubset = findPyftsubset();
  if (!pyftsubset) {
    console.error("✗ 找不到 pyftsubset。请安装：");
    console.error("    python3 -m pip install --user fonttools brotli");
    process.exit(1);
  }

  const { chars, nameCount, foodTotal, missingName } = await collectChars();
  const text = [...chars].join("");

  // pyftsubset：只保留用到的字符，转 woff2，去掉 hinting/无关表
  execFileSync(
    pyftsubset,
    [
      SRC_TTF,
      `--text=${text}`,
      "--output-file=" + OUT_WOFF2,
      "--flavor=woff2",
      "--layout-features=*", // 保留 kern 等排版特性
      "--desubroutinize",
      "--name-IDs=*",
      "--drop-tables+=DSIG",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  const woff2Size = statSync(OUT_WOFF2).size;
  const kb = (woff2Size / 1024).toFixed(1);

  // —— 报告 ——
  console.log("生成完成：", OUT_WOFF2);
  console.log("──────────────────────────────");
  console.log(`  唯一字符数 : ${chars.size}`);
  console.log(`  菜名数     : ${nameCount} / ${foodTotal}`);
  console.log(`  woff2 大小 : ${kb} KB (${woff2Size} bytes)`);
  if (missingName.length) {
    console.log(
      `  ⚠️ 异常字段：${missingName.length} 道菜缺 name → ${missingName
        .slice(0, 10)
        .join(", ")}${missingName.length > 10 ? " …" : ""}`,
    );
  } else {
    console.log("  ✓ 全部菜名字段正常");
  }
  if (woff2Size > 200 * 1024) {
    console.log(`  ⚠️ 体积超 200KB，超出预期（90–130KB），请检查字符来源。`);
  }
  console.log("──────────────────────────────");
}

main().catch((e) => {
  console.error("✗ 子集生成失败：", e.message);
  process.exit(1);
});
