// @ts-nocheck
/**
 * land-dishes.mjs —— 把 docs/dish-candidates.draft.json 的 136 道机械落进 foods.ts。
 *   纯消费：id/emoji/字段直通，绝不重新生成 id。
 *
 * 用法：
 *   node scripts/land-dishes.mjs           # 干跑：校验 + 预览块，不改源
 *   node scripts/land-dishes.mjs --write    # 校验通过后追加到 foods 数组末尾
 *
 * 前置：必须先跑 migrate-existing-foods.mjs --write（192 条已带新字段），否则 tsc 会红。
 *
 * 落库最低校验（不等 S6 完整 lint）：
 *   id 全局唯一 & 不撞现有；现有 192 id 原样保留；无 _family 泄漏；
 *   无默认池污染（entityType 全 dish、无 side 混进默认层判断）；129 meal + 7 side；required 字段齐。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOODS_PATH = join(__dirname, "..", "src", "config", "foods.ts");
const DRAFT_PATH = join(__dirname, "..", "docs", "dish-candidates.draft.json");
const WRITE = process.argv.includes("--write");

const src = readFileSync(FOODS_PATH, "utf8");
const { dishes } = JSON.parse(readFileSync(DRAFT_PATH, "utf8"));

// ---- 现有 id 集合 ----
const existingIds = [...src.matchAll(/^\s{4}id:\s*"([^"]+)"/gm)].map((m) => m[1]);
const existingIdSet = new Set(existingIds);

// ---- 校验 ----
const errs = [];
const REQUIRED = ["id", "name", "emoji", "cuisine", "priceTier", "meals", "spicy", "tags",
  "satiety", "indulgence", "convenience", "occasion", "pickLayer", "search"];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const seen = new Set();
let mealN = 0, sideN = 0;

for (const d of dishes) {
  const at = `[${d.name || d.id || "??"}]`;
  for (const k of REQUIRED) if (d[k] === undefined || d[k] === null) errs.push(`${at} 缺字段 ${k}`);
  if ("_family" in d) errs.push(`${at} 泄漏 _family（草案统计字段不得落库）`);
  if (d.id) {
    if (!KEBAB.test(d.id)) errs.push(`${at} id 非 kebab-ASCII: ${d.id}`);
    if (seen.has(d.id)) errs.push(`${at} id 本批重复: ${d.id}`);
    seen.add(d.id);
    if (existingIdSet.has(d.id)) errs.push(`${at} id 撞现有 foods.ts: ${d.id}`);
  }
  if (d.search && (!d.search.gateQuery || !d.search.displayQuery || !Array.isArray(d.search.fallbackQueries)))
    errs.push(`${at} search 结构不完整`);
  if (d.pickLayer === "meal") mealN++;
  else if (d.pickLayer === "side") sideN++;
  // pickLayer/satiety 一致（新菜全是 concrete dish，双向规则适用）
  if (d.pickLayer === "meal" && d.satiety < 3) errs.push(`${at} meal 层却 satiety<3`);
  if (d.pickLayer === "side" && d.satiety >= 3) errs.push(`${at} side 层却 satiety>=3`);
}
if (dishes.length !== 136) errs.push(`草案应 136 道，实际 ${dishes.length}`);
if (mealN !== 129) errs.push(`meal 层应 129，实际 ${mealN}`);
if (sideN !== 7) errs.push(`side 层应 7，实际 ${sideN}`);

if (errs.length) {
  console.error("✗ 落库校验失败:\n" + errs.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

// ---- draft → Food 文本块 ----
const q = (s) => `"${s}"`;
const arr = (a) => `[${a.map(q).join(", ")}]`;
function toFood(d) {
  // role：side→snack，meal→main（轴1 主角 / 轴2 小食）
  const role = d.pickLayer === "side" ? "snack" : "main";
  // recommend：indulgence>=4→5；side→3；否则 4（确定性，无需人味）
  const recommend = d.indulgence >= 4 ? 5 : (d.pickLayer === "side" ? 3 : 4);
  const L = [];
  L.push(`    id: ${q(d.id)},`);
  L.push(`    name: ${q(d.name)},`);
  L.push(`    entityType: "dish",`);
  if (d.shopKeyword) L.push(`    shopKeyword: ${q(d.shopKeyword)},`);
  L.push(`    emoji: ${q(d.emoji)},`);
  L.push(`    kind: "main",`);
  L.push(`    cuisine: ${q(d.cuisine)},`);
  L.push(`    role: ${q(role)},`);
  L.push(`    priceTier: ${q(d.priceTier)},`);
  L.push(`    spicy: ${d.spicy},`);
  L.push(`    tags: ${arr(d.tags)},`);
  L.push(`    meals: ${arr(d.meals)},`);
  L.push(`    recommend: ${recommend},`);
  L.push(`    satiety: ${d.satiety},`);
  L.push(`    indulgence: ${d.indulgence},`);
  L.push(`    convenience: ${q(d.convenience)},`);
  L.push(`    occasion: ${arr(d.occasion)},`);
  L.push(`    pickLayer: ${q(d.pickLayer)},`);
  const s = d.search;
  L.push(`    search: { gateQuery: ${q(s.gateQuery)}, displayQuery: ${q(s.displayQuery)}, fallbackQueries: ${arr(s.fallbackQueries)} },`);
  if (d.canonicalGroup) L.push(`    canonicalGroup: ${q(d.canonicalGroup)},`);
  return `  {\n${L.join("\n")}\n  },`;
}
const block = "\n  // ===== S3 落库：新增 136 道（129 meal + 7 side）=====\n"
  + dishes.map(toFood).join("\n") + "\n";

// ---- 追加到 foods 数组末尾（最后一个 } 与 ]; 之间）----
const startMarker = "export const foods: Food[] = [";
const sIdx = src.indexOf(startMarker);
if (sIdx === -1) throw new Error("找不到 foods 数组起点");
const closeIdx = src.indexOf("\n];", sIdx);
if (closeIdx === -1) throw new Error("找不到 foods 数组结尾 '];'");

const out = src.slice(0, closeIdx) + block + src.slice(closeIdx);

if (WRITE) writeFileSync(FOODS_PATH, out, "utf8");
console.log(`${WRITE ? "✅ 已追加 136 道到 foods.ts" : "🔍 干跑（未改源）"}：meal ${mealN} / side ${sideN}；现有 id ${existingIds.length} 条保留不动。`);
if (!WRITE) console.log("预览首块:\n" + toFood(dishes[0]));
