// @ts-nocheck
/**
 * lint-foods-fulldb.mjs —— 全库质量门，读真实 foods.ts（非草案）判 Phase 1 硬验收。
 *   口径对齐 spec §7；这是 S3/S4 前置 gate，替代「只看 draft 129/7」的旧视角。
 *
 * 校验（任一失败 → 退出码 1）：
 *   1. id 全局唯一 + kebab-ASCII
 *   2. 默认 meal 池 = kind==="main" && entityType==="dish" && pickLayer==="meal"
 *      餐段最低门槛：breakfast>=40 / lunch>=120 / dinner>=140 / midnight>=70（tea 不设硬指标）
 *   3. family×price 最低门槛：每 family 的 meal 池 budget>=8 / normal>=15 / treat>=8
 *   4. 默认池纯净：池内不得出现非 dish 或 side（0 污染）
 *   5. side 池取值口径：entityType==="dish" && pickLayer==="side"（防火锅/品牌/dish_group 漏入）
 *   6. pickLayer/satiety 一致（仅 entityType==="dish"；非 dish 与 drink 豁免，见 §7 规则4）
 *   7. 无 _family 泄漏；required 字段齐；无乱码
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOODS_PATH = join(__dirname, "..", "src", "config", "foods.ts");
const src = readFileSync(FOODS_PATH, "utf8");

const FAM = {
  "cn-generic": "chinese", "cn-dongbei": "chinese", "cn-chuanyu": "chinese", "cn-hunan": "chinese",
  "cn-guangdong": "chinese", "cn-jiangzhe": "chinese", "cn-xibei": "chinese", "cn-yunguigui": "chinese",
  "cn-beifang": "chinese", japanese: "jpkr", korean: "jpkr",
  "western-italian": "western", "western-american": "western", "western-generic": "western",
  thai: "exotic", sea: "exotic", mideast: "exotic", indian: "exotic", "exotic-generic": "exotic",
};
const SEG_FLOOR = { breakfast: 40, lunch: 120, dinner: 140, midnight: 70 };
const PRICE_FLOOR = { budget: 8, normal: 15, treat: 8 };

// ---- 解析每个对象 ----
const blocks = src.split(/\n  \{/).slice(1).map((b) => b.split(/\n  \},?/)[0]);
const g = (b, k) => (b.match(new RegExp(`\\b${k}: "([^"]+)"`)) || [])[1];
const gn = (b, k) => { const m = b.match(new RegExp(`\\b${k}: (\\d+)`)); return m ? +m[1] : null; };
const ga = (b, k) => { const m = b.match(new RegExp(`\\b${k}: \\[([^\\]]*)\\]`)); return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : []; };
const foods = blocks.map((b) => ({
  id: g(b, "id"), name: g(b, "name"), kind: g(b, "kind"), entityType: g(b, "entityType") || "dish",
  cuisine: g(b, "cuisine"), priceTier: g(b, "priceTier"), pickLayer: g(b, "pickLayer"),
  satiety: gn(b, "satiety"), meals: ga(b, "meals"), _hasFamily: /\b_family:/.test(b),
  _raw: b,
})).filter((r) => r.id);

const errs = [], warns = [];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED = ["satiety", "indulgence", "convenience", "occasion", "pickLayer", "search"];

// 1. id 唯一 + kebab
const seen = new Set();
for (const f of foods) {
  if (seen.has(f.id)) errs.push(`id 重复: ${f.id}`);
  seen.add(f.id);
  if (!KEBAB.test(f.id)) errs.push(`id 非 kebab: ${f.id}`);
}

// 7. required / _family / 乱码
for (const f of foods) {
  if (f._hasFamily) errs.push(`[${f.name}] 泄漏 _family`);
  for (const k of REQUIRED) if (!new RegExp(`\\b${k}:`).test(f._raw)) errs.push(`[${f.name}] 缺字段 ${k}`);
  if (f._raw.includes("�")) errs.push(`[${f.name}] 含乱码`);
}

// 默认 meal 池
const pool = foods.filter((f) => f.kind === "main" && f.entityType === "dish" && f.pickLayer === "meal");

// 4. 默认池纯净（构造即纯净，此处再断言无漏网）
const pollution = pool.filter((f) => f.entityType !== "dish" || f.pickLayer !== "meal" || f.kind !== "main");
if (pollution.length) errs.push(`默认池污染 ${pollution.length}: ${pollution.map((f) => f.name).join(",")}`);

// 2. 餐段门槛
const segCount = {};
for (const seg of Object.keys(SEG_FLOOR)) {
  segCount[seg] = pool.filter((f) => f.meals.includes(seg)).length;
  if (segCount[seg] < SEG_FLOOR[seg]) errs.push(`餐段 ${seg}: ${segCount[seg]} < ${SEG_FLOOR[seg]}`);
}

// 3. family×price
const fp = {};
for (const f of pool) {
  const fam = FAM[f.cuisine]; if (!fam) { errs.push(`未知 cuisine: ${f.cuisine}(${f.name})`); continue; }
  fp[fam] = fp[fam] || { budget: 0, normal: 0, treat: 0 };
  fp[fam][f.priceTier]++;
}
for (const fam of ["chinese", "western", "jpkr", "exotic"]) {
  for (const p of Object.keys(PRICE_FLOOR))
    if ((fp[fam]?.[p] ?? 0) < PRICE_FLOOR[p]) errs.push(`family×price ${fam}.${p}: ${fp[fam]?.[p] ?? 0} < ${PRICE_FLOOR[p]}`);
}

// 5. side 池口径（entityType==="dish" && pickLayer==="side"）——报告口径差异
const sidePoolCorrect = foods.filter((f) => f.entityType === "dish" && f.pickLayer === "side");
const sideNaive = foods.filter((f) => f.pickLayer === "side");
const wouldLeak = sideNaive.filter((f) => f.entityType !== "dish");
if (wouldLeak.length) warns.push(`side 池若只按 pickLayer 会漏入 ${wouldLeak.length} 个非 dish（正确口径须 entityType==="dish"）`);

// 6. pickLayer/satiety 一致（仅 dish；drink 豁免）
for (const f of pool) {
  if (f.kind === "drink") continue;
  if (f.entityType === "dish" && f.satiety != null && f.satiety < 3)
    errs.push(`[${f.name}] 在 meal 池却 satiety<3`);
}
for (const f of sidePoolCorrect) {
  if (f.satiety != null && f.satiety >= 3)
    errs.push(`[${f.name}] dish/side 却 satiety>=3（应 meal 或降 satiety）`);
}

// 8. treat 桶空洞守卫：每个「餐段×家族」的 treat 桶必须可达（含 family-neutral 的 treat drink），
//    否则「想吃好的」会 100% fallback 到普通菜（tea bug 的通式）。
//    单菜池口径 = mainFoodsByMeal(meal)（meal 层）+ side + drink（仅 tea 并入 side/drink）。
//    drink family-neutral：任意家族都能抽到 → treat drink 记入每个家族的可达数。
const MEALS = ["breakfast", "lunch", "tea", "dinner", "midnight"];
const treatHoles = [];
for (const meal of MEALS) {
  // 该餐段的「单菜池」候选（对齐 foodsByMealForSinglePick）
  let poolForMeal;
  if (meal === "tea") {
    poolForMeal = foods.filter(
      (f) =>
        f.meals.includes("tea") &&
        f.entityType === "dish" &&
        (f.kind === "drink" || f.pickLayer === "meal" || f.pickLayer === "side"),
    );
  } else {
    // 非 tea：仅 meal 层（kind main / dish / pickLayer meal）
    poolForMeal = foods.filter(
      (f) => f.meals.includes(meal) && f.kind === "main" && f.entityType === "dish" && f.pickLayer === "meal",
    );
  }
  const treatDrinks = poolForMeal.filter((f) => f.kind === "drink" && f.priceTier === "treat").length;
  for (const fam of ["chinese", "western", "jpkr", "exotic"]) {
    const treatDish = poolForMeal.filter(
      (f) => f.kind !== "drink" && FAM[f.cuisine] === fam && f.priceTier === "treat",
    ).length;
    if (treatDish + treatDrinks === 0) treatHoles.push(`${meal}×${fam}`);
  }
}
if (treatHoles.length) errs.push(`treat 桶空洞（想吃好的会 100% fallback）: ${treatHoles.join(", ")}`);

// ---- 报告 ----
console.log(`全库 ${foods.length} 条 | 默认 meal 池 ${pool.length}`);
console.log(`餐段: ${Object.entries(segCount).map(([s, c]) => `${s} ${c}/${SEG_FLOOR[s]}`).join(" · ")}`);
console.log(`family×price(meal): ${["chinese", "western", "jpkr", "exotic"].map((fa) => `${fa} b${fp[fa]?.budget ?? 0}/n${fp[fa]?.normal ?? 0}/t${fp[fa]?.treat ?? 0}`).join(" · ")}`);
console.log(`side 池(dish&side) ${sidePoolCorrect.length}（naive pickLayer==side 会多带 ${wouldLeak.length} 非 dish）`);
if (warns.length) console.log("\n⚠ 提示:\n" + warns.map((w) => "  - " + w).join("\n"));
if (errs.length) {
  console.error(`\n✗ 全库 lint 失败（${errs.length}）:\n` + errs.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("\n✓ 全库 lint 通过（§7 硬门槛全绿）");
