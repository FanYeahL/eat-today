// @ts-nocheck
/**
 * lint-source-mojibake.mjs —— 源码乱码门（U+FFFD replacement character）。
 *   背景：S8 提交里几处中文注释被写成了 U+FFFD（编辑工具误伤），而
 *   lint-foods-fulldb 只查 foods 数据的 _raw、不查源码注释，于是漏进主干。
 *   这个门补上「文本源码全域」这一层：任一 src 下的文本文件含 U+FFFD → 退出码 1。
 *
 * 口径：
 *   - 只扫 src/（真实源码与注释所在；scripts/ 下 lint-foods-fulldb 与
 *     gen-dish-candidates 故意内含该字符作检测器，扫它们会自伤，故不纳入）。
 *   - 只读文本扩展名（下方 TEXT_EXT 白名单），.woff/.ico/.png 等二进制天然排除。
 *   - 用码点判定（FFFD 常量走 \uFFFD 转义，非字面字符），本文件不含字面乱码，避免「检测器扫到自己」。
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

// 只查文本源码；二进制（字体/图标/图片等）不在此列，天然排除。
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".css", ".scss", ".json", ".md", ".mdx", ".html", ".svg", ".txt",
]);

const FFFD = "\uFFFD"; // replacement character，用转义写法（非字面字符），避免本文件被自己的门扫到

/** 递归收集 src 下所有文本文件的绝对路径 */
function collect(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      out.push(...collect(p));
    } else if (TEXT_EXT.has(extname(ent.name))) {
      out.push(p);
    }
  }
  return out;
}

const hits = [];
for (const file of collect(SRC)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes(FFFD)) {
      hits.push(`  ${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
    }
  });
}

if (hits.length > 0) {
  console.error(`✗ 源码含乱码 U+FFFD（${hits.length} 处）——多为编辑工具误伤，需修复：`);
  console.error(hits.join("\n"));
  process.exit(1);
}

console.log("✓ 源码乱码门通过（src 下无 U+FFFD）");
