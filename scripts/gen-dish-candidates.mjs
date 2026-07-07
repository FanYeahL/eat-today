// scripts/gen-dish-candidates.mjs
// 生成 dish 候选菜草案 → docs/dish-candidates.draft.json + docs/dish-candidates.review.md
// ─────────────────────────────────────────────
// 本批：中式 +49（budget 18 / normal 22 / treat 9），供 user + Codex 审。审定后再补 western/jpkr/exotic。
//
// 设计：核心属性（需人味判断的）手工列在 ROWS，紧凑表；
// 衍生字段（search.* 查店档案、layer 层级）按规则机械推导，不手填。
// 产物是「草案」，审定后才落 foods.ts。emoji 在落库时定，草案不含。
//
// ROW 字段：[name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup?]
//   meals 短码: b早 l午 t茶 d晚 n宵 ；occasion 短码: s=solo dt=date f=friends ln=lateNight q=quick
//
// pickLayer 层级（衍生，对齐 spec §1.1 PickLayer + user fix 4「satiety<3 不进默认单菜池」）：
//   satiety>=3 → "meal"（一顿饭级别的具体食物，进默认单菜主池）
//   satiety<3  → "side"（小食/配菜/组合项，落库映射为 side 层，不进默认单菜池）

import fs from "fs";
import path from "path";

const M = { b: "breakfast", l: "lunch", t: "tea", d: "dinner", n: "midnight" };
const O = { s: "solo", dt: "date", f: "friends", ln: "lateNight", q: "quick" };

// —— 枚举合法值（自检用，对齐 src/types/food.d.ts）——
const TAGS = new Set(["高热量","清淡","适合宿舍","快手","下饭","健康轻食","暖胃","高蛋白","解馋","省钱","提神","续命","解腻"]);
const CONVENIENCE = new Set(["canteen","takeout","restaurant","convenience","dorm"]);
const OCCASION = new Set(["solo","date","friends","lateNight","quick"]);
const PRICE = new Set(["budget","normal","treat"]);

// cuisine → 查店档案。gateQuery 对齐现有 cuisineKeyword()（config/cuisine.ts），保证 Phase 1 运行时零改动。
const CUISINE_SEARCH = {
  "cn-generic":   { gate: "家常菜",   fb: ["家常菜", "中餐"] },
  "cn-dongbei":   { gate: "东北菜",   fb: ["东北菜", "家常菜", "中餐"] },
  "cn-chuanyu":   { gate: "川菜",     fb: ["川菜", "家常菜", "中餐"] },
  "cn-hunan":     { gate: "湘菜",     fb: ["湘菜", "家常菜", "中餐"] },
  "cn-guangdong": { gate: "粤菜",     fb: ["粤菜", "家常菜", "中餐"] },
  "cn-jiangzhe":  { gate: "江浙菜",   fb: ["江浙菜", "家常菜", "中餐"] },
  "cn-xibei":     { gate: "西北菜",   fb: ["西北菜", "家常菜", "中餐"] },
  "cn-yunguigui": { gate: "云南菜",   fb: ["云南菜", "家常菜", "中餐"] },
  "cn-beifang":   { gate: "北方菜",   fb: ["北方菜", "家常菜", "中餐"] },
  japanese:       { gate: "日本料理", fb: ["日本料理", "日料"] },
  korean:         { gate: "韩国料理", fb: ["韩国料理", "韩式"] },
  "western-italian":  { gate: "意大利菜", fb: ["意大利菜", "西餐厅"] },
  "western-american": { gate: "美式餐厅", fb: ["美式餐厅", "西餐厅"] },
  "western-generic":  { gate: "西餐厅",   fb: ["西餐厅", "西餐"] },
  thai:           { gate: "泰国菜",   fb: ["泰国菜", "东南亚菜"] },
  sea:            { gate: "东南亚菜", fb: ["东南亚菜", "异国料理"] },
  mideast:        { gate: "中东菜",   fb: ["中东菜", "异国料理"] },
  "exotic-generic": { gate: "异国料理", fb: ["异国料理"] },
};

// ─────────────────────────────────────────────
// 中式候选 +49（已核对不与现有 65 道中式 dish 撞名）
// ─────────────────────────────────────────────
const ROWS = [
  // ===== budget ×18（平价日常；覆盖早餐/宵夜真实可吃）=====
  ["白粥配小菜",     "cn-generic",  "budget", 0, "b",   ["清淡","省钱","暖胃"], 2, 1, "canteen",     "sq"],
  ["茶叶蛋",         "cn-generic",  "budget", 0, "bn",  ["省钱","快手"],        1, 1, "convenience", "sqln"],
  ["菜肉包子",       "cn-generic",  "budget", 0, "b",   ["省钱","快手","暖胃"], 3, 2, "takeout",     "sq"],
  ["手抓饼加蛋",     "cn-beifang",  "budget", 0, "b",   ["快手","解馋","高热量"],3, 2, "takeout",     "sq"],
  ["咸豆浆",         "cn-jiangzhe", "budget", 0, "b",   ["清淡","暖胃","省钱"], 2, 2, "takeout",     "sq"],
  ["西红柿鸡蛋面",   "cn-generic",  "budget", 0, "ld",  ["清淡","快手","暖胃"], 3, 2, "dorm",        "sq"],
  ["阳春面",         "cn-jiangzhe", "budget", 0, "ld",  ["清淡","省钱","暖胃"], 3, 2, "restaurant",  "sq"],
  ["榨菜肉丝面",     "cn-jiangzhe", "budget", 1, "ldn", ["下饭","快手","暖胃"], 3, 2, "takeout",     "sqln"],
  ["土豆丝盖饭",     "cn-generic",  "budget", 1, "ld",  ["省钱","下饭","快手"], 4, 2, "canteen",     "sq"],
  ["青椒肉丝盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱"],        4, 2, "canteen",     "sq"],
  ["家常豆腐盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱","暖胃"], 4, 2, "canteen",     "sq"],
  ["蒜薹炒肉盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱"],        4, 2, "canteen",     "sq"],
  ["大饼卷菜",       "cn-beifang",  "budget", 0, "bl",  ["省钱","快手","解馋"], 3, 2, "takeout",     "sq"],
  ["白菜炖粉条",     "cn-dongbei",  "budget", 0, "d",   ["暖胃","省钱","下饭"], 4, 2, "canteen",     "sf"],
  ["醋溜白菜盖饭",   "cn-beifang",  "budget", 0, "ld",  ["清淡","省钱","下饭"], 3, 2, "canteen",     "sq"],
  ["上海小馄饨",     "cn-jiangzhe", "budget", 0, "bn",  ["清淡","暖胃","快手"], 2, 2, "takeout",     "sqln"],
  ["皮蛋豆腐",       "cn-generic",  "budget", 0, "dn",  ["清淡","解腻","快手"], 2, 2, "restaurant",  "fln"],
  ["卤味拼盘",       "cn-generic",  "budget", 1, "dn",  ["解馋","下饭"],        2, 3, "takeout",     "sfln"],

  // ===== normal ×22（正餐主力）=====
  ["红烧肉盖饭",     "cn-jiangzhe", "normal", 0, "ld",  ["高热量","下饭","解馋"], 4, 3, "canteen",    "sf"],
  ["京酱肉丝",       "cn-beifang",  "normal", 0, "d",   ["下饭","解馋"],          3, 3, "restaurant", "f"],
  ["地三鲜盖饭",     "cn-dongbei",  "normal", 0, "ld",  ["下饭","解馋","高热量"], 4, 3, "canteen",    "sf"],
  ["小鸡炖蘑菇",     "cn-dongbei",  "normal", 0, "d",   ["暖胃","高蛋白","下饭"], 4, 3, "restaurant", "f"],
  ["辣子鸡丁",       "cn-chuanyu",  "normal", 3, "ld",  ["解馋","下饭","高蛋白"], 3, 3, "restaurant", "f"],
  ["口水鸡",         "cn-chuanyu",  "normal", 2, "ld",  ["解馋","高蛋白"],        3, 3, "restaurant", "fs"],
  ["夫妻肺片",       "cn-chuanyu",  "normal", 2, "d",   ["解馋","下饭"],          2, 3, "restaurant", "f"],
  ["农家小炒肉",     "cn-hunan",    "normal", 2, "ld",  ["下饭","解馋","高热量"], 4, 3, "restaurant", "sf"],
  ["白切鸡",         "cn-guangdong","normal", 0, "ld",  ["清淡","高蛋白"],        3, 3, "restaurant", "f"],
  ["腊味煲仔饭",     "cn-guangdong","normal", 0, "ld",  ["下饭","解馋","暖胃"],   4, 3, "restaurant", "sf", "baozaifan"],
  ["干锅花菜",       "cn-hunan",    "normal", 2, "d",   ["下饭","解馋"],          3, 3, "restaurant", "f"],
  ["铁板黑椒牛柳",   "cn-generic",  "normal", 1, "d",   ["高蛋白","下饭","解馋"], 3, 3, "restaurant", "dtf"],
  ["鱼香茄子煲",     "cn-chuanyu",  "normal", 1, "ld",  ["下饭","解馋"],          3, 3, "canteen",    "s"],
  ["糖醋里脊",       "cn-generic",  "normal", 0, "ld",  ["解馋","高热量"],        3, 3, "restaurant", "fs"],
  ["咕咾肉",         "cn-guangdong","normal", 0, "ld",  ["解馋","高热量","下饭"], 3, 3, "restaurant", "fs"],
  ["葱爆羊肉",       "cn-beifang",  "normal", 1, "d",   ["高蛋白","暖胃","下饭"], 3, 3, "restaurant", "f"],
  ["羊肉泡馍",       "cn-xibei",    "normal", 0, "ld",  ["暖胃","高蛋白","续命"], 5, 3, "restaurant", "sf"],
  ["新疆炒米粉",     "cn-xibei",    "normal", 2, "ldn", ["下饭","解馋","高热量"], 4, 3, "takeout",    "sfln"],
  ["汽锅鸡",         "cn-yunguigui","normal", 0, "d",   ["暖胃","清淡","高蛋白"], 3, 3, "restaurant", "f"],
  ["大理酸辣鱼",     "cn-yunguigui","normal", 2, "d",   ["下饭","解馋","暖胃"],   4, 3, "restaurant", "f"],
  ["三杯鸡",         "cn-generic",  "normal", 1, "ld",  ["下饭","解馋","高蛋白"], 3, 3, "restaurant", "fs"],
  ["梅菜扣肉盖饭",   "cn-guangdong","normal", 0, "ld",  ["下饭","高热量","解馋"], 4, 3, "canteen",    "sf"],

  // ===== treat ×9（全具体菜，无火锅/烧烤/品牌；indulgence≥4 且 satiety≥3，非轻食）=====
  ["剁椒鱼头",       "cn-hunan",    "treat", 2, "d",  ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "f"],
  ["葱烧海参",       "cn-beifang",  "treat", 0, "d",  ["高蛋白","解馋"],        3, 5, "restaurant", "fdt"],
  ["蟹黄豆腐",       "cn-jiangzhe", "treat", 0, "d",  ["解馋","高蛋白"],        3, 4, "restaurant", "dtf"],
  ["东坡肉",         "cn-jiangzhe", "treat", 0, "dl", ["高热量","解馋","下饭"], 4, 4, "restaurant", "f"],
  ["北京烤鸭",       "cn-beifang",  "treat", 0, "d",  ["高热量","解馋","高蛋白"],4, 5, "restaurant", "fdt"],
  ["白灼基围虾",     "cn-guangdong","treat", 0, "d",  ["清淡","高蛋白","解馋"], 3, 4, "restaurant", "fdt"],
  ["干锅牛蛙",       "cn-chuanyu",  "treat", 2, "d",  ["解馋","下饭","高蛋白"], 4, 4, "restaurant", "f"],
  ["水煮鱼",         "cn-chuanyu",  "treat", 3, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "f", "shuizhuyu"],
  ["酸汤肥牛",       "cn-generic",  "treat", 1, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "fs"],
];

// —— 展开一行为完整候选对象 ——
function expand(row) {
  const [name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup] = row;
  const cs = CUISINE_SEARCH[cuisine];
  if (!cs) throw new Error(`未知 cuisine: ${cuisine}（${name}）`);
  const obj = {
    name,
    cuisine,
    priceTier,
    meals: [...meals].map((c) => M[c]),
    spicy,
    tags,
    satiety,
    indulgence,
    convenience,
    occasion: occasion.match(/dt|ln|[sfq]/g).map((c) => O[c]),
    // pickLayer 衍生：satiety<3 → side（不进默认单菜池），否则 meal。对齐 spec §1.1 + user fix 4。
    pickLayer: satiety >= 3 ? "meal" : "side",
    // search 嵌套对象，对齐 spec §1.1（fix 1：不再顶层散放）
    search: {
      gateQuery: cs.gate,
      displayQuery: name,
      fallbackQueries: cs.fb,
    },
  };
  if (canonicalGroup) obj.canonicalGroup = canonicalGroup;
  return obj;
}

const dishes = ROWS.map(expand);

// ─────────────────────────────────────────────
// 自检（fix 3：枚举/短码/范围/search 结构/乱码/canonicalGroup/layer 全查）
// ─────────────────────────────────────────────
const errs = [];
const seenNames = new Set();
const hasMojibake = (s) => typeof s === "string" && s.includes("�");
const LAYER = new Set(["meal", "side"]);

for (const d of dishes) {
  const at = `[${d.name || "??"}]`;
  // 乱码：扫所有字符串字段（含 search、数组元素）
  const strings = [d.name, d.cuisine, d.priceTier, d.convenience, d.pickLayer,
    ...d.meals, ...d.tags, ...d.occasion,
    d.search?.gateQuery, d.search?.displayQuery, ...(d.search?.fallbackQueries ?? [])];
  if (strings.some(hasMojibake)) errs.push(`${at} 含乱码 \\uFFFD`);
  // 枚举合法
  if (!CUISINE_SEARCH[d.cuisine]) errs.push(`${at} cuisine 非法: ${d.cuisine}`);
  if (!PRICE.has(d.priceTier)) errs.push(`${at} priceTier 非法: ${d.priceTier}`);
  if (!LAYER.has(d.pickLayer)) errs.push(`${at} pickLayer 非法: ${d.pickLayer}`);
  d.tags.forEach((t) => { if (!TAGS.has(t)) errs.push(`${at} tag 非法: ${t}`); });
  d.occasion.forEach((o) => { if (!OCCASION.has(o)) errs.push(`${at} occasion 非法: ${o}`); });
  if (!CONVENIENCE.has(d.convenience)) errs.push(`${at} convenience 非法: ${d.convenience}`);
  d.meals.forEach((m) => { if (!Object.values(M).includes(m)) errs.push(`${at} meal 非法: ${m}`); });
  // 数值范围
  if (!(Number.isInteger(d.spicy) && d.spicy >= 0 && d.spicy <= 3)) errs.push(`${at} spicy 越界: ${d.spicy}`);
  if (!(Number.isInteger(d.satiety) && d.satiety >= 1 && d.satiety <= 5)) errs.push(`${at} satiety 越界: ${d.satiety}`);
  if (!(Number.isInteger(d.indulgence) && d.indulgence >= 1 && d.indulgence <= 5)) errs.push(`${at} indulgence 越界: ${d.indulgence}`);
  // 非空
  if (!d.meals.length) errs.push(`${at} meals 空`);
  if (!d.tags.length) errs.push(`${at} tags 空`);
  if (!d.occasion.length) errs.push(`${at} occasion 空`);
  // search 结构完整
  if (!d.search || !d.search.gateQuery || !d.search.displayQuery || !Array.isArray(d.search.fallbackQueries) || !d.search.fallbackQueries.length)
    errs.push(`${at} search 结构不完整`);
  // pickLayer 与 satiety 一致（spec §7 规则 4：meal ⟺ satiety>=3）
  if (d.pickLayer === "meal" && d.satiety < 3) errs.push(`${at} meal 层却 satiety<3`);
  if (d.pickLayer === "side" && d.satiety >= 3) errs.push(`${at} side 层却 satiety>=3`);
  // treat 质量门：仅对 meal 层的 treat 要求 indulgence>=4 且非轻食（fix 5：不惩罚清淡，只看 indulgence/轻食）
  if (d.priceTier === "treat" && d.pickLayer === "meal") {
    if (d.indulgence < 4 || d.satiety < 3 || d.tags.includes("健康轻食"))
      errs.push(`${at} treat 质量门不过（indulgence>=4 & satiety>=3 & 非健康轻食）`);
  }
  // 重名
  if (seenNames.has(d.name)) errs.push(`${at} 重名`);
  seenNames.add(d.name);
}

// canonicalGroup：同组 cuisine 必须一致
const groups = {};
for (const d of dishes) {
  if (!d.canonicalGroup) continue;
  (groups[d.canonicalGroup] ??= []).push(d);
}
for (const [g, arr] of Object.entries(groups)) {
  if (new Set(arr.map((d) => d.cuisine)).size > 1) errs.push(`canonicalGroup "${g}" 跨 cuisine`);
}

if (errs.length) {
  console.error("✗ 自检失败:\n" + errs.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

// ─────────────────────────────────────────────
// 分布统计（给 review 用）
// ─────────────────────────────────────────────
const prices = ["budget", "normal", "treat"];
const byPrice = Object.fromEntries(prices.map((p) => [p, dishes.filter((d) => d.priceTier === p).length]));
const mealsAll = ["breakfast", "lunch", "tea", "dinner", "midnight"];
// meal 层（默认单菜池的真实供给）——缺口统计一律以此为准（对齐 spec §4 meal-only 口径）
const mealLayer = dishes.filter((d) => d.pickLayer === "meal");
const sideLayer = dishes.filter((d) => d.pickLayer === "side");
const byMeal = Object.fromEntries(mealsAll.map((m) => [m, mealLayer.filter((d) => d.meals.includes(m)).length]));
const byLayer = { meal: mealLayer.length, side: sideLayer.length };
// meal 层的价位分布（这才是计入 §4 缺口矩阵的数字）
const mealByPrice = Object.fromEntries(prices.map((p) => [p, mealLayer.filter((d) => d.priceTier === p).length]));
// side 名单：从数据自动生成，永不与备注漂移（fix 4）
const sideNames = sideLayer.map((d) => d.name);
// 中式 meal 目标 49，本批达成 = mealLayer.length；剩余缺口自动算，防"按行数收尾"（Codex P1）
const chineseMealTarget = 49;
const chineseMealRemaining = Math.max(0, chineseMealTarget - mealLayer.length);

const out = {
  _meta: {
    purpose: "dish 候选菜草案（脚本生成），供 user + Codex 审后落 foods.ts",
    generated: new Date().toISOString().slice(0, 10),
    batch: "中式 第一批",
    gapBasis: "meal-only 且按'菜数'计：缺口只统计 pickLayer=meal；side 是额外产出，不占配额（spec §4/§4.1）。收尾判据=meal 净增达标，非行数。",
    gapTargetMeal: { chinese: 49, western: 29, jpkr: 27, exotic: 24, total: 129 },
    chineseMealAchieved: mealLayer.length,
    chineseMealRemaining,   // >0 表示中式 meal 未完成，禁止按"+49 已完成"收尾
    teaPolicy: "tea 不列入 meal-only 硬指标；下午茶走 side/drink 池（spec §4.2）。本批 tea meal=0 属预期。",
    thisBatchRows: dishes.length,
    priceDistributionAll: byPrice,
    priceDistributionMealLayer: mealByPrice,
    layerDistribution: byLayer,
    mealHitsMealLayerOnly: byMeal,
    sideItems: sideNames,
    reviewStatus: "DRAFT — 待审：命名/口味真实性 / spicy / priceTier 归档 / meals 合理性 / canonicalGroup / side 层归类",
    notes: [
      "family 不写，由 cuisine→familyOf 推导。",
      "emoji 落库时定，草案不含。",
      "search 为嵌套对象 {gateQuery,displayQuery,fallbackQueries}；gateQuery 对齐现有 cuisineKeyword，Phase 1 运行时零改动。",
      `pickLayer=side（satiety<3）不进默认单菜池，落库映射为 side 层；本批 side ${sideNames.length} 项：${sideNames.join("/")}。`,
      "缺口口径 = meal-only：本批 " + dishes.length + " 行中仅 " + mealLayer.length + " 计入 meal 缺口，side " + sideLayer.length + " 不计（见 priceDistributionMealLayer）。",
      "treat 全为具体菜，无火锅/烧烤/烤肉/品牌。",
      "treat 质量门不惩罚「清淡」，只看 indulgence / satiety / 「健康轻食」——白灼基围虾这类清爽高质量菜保留在 treat 桶（fix 5，对齐 spec §5.3）。",
      "tea meal=0 是预期（非缺陷）：下午茶不走 meal-only，由后续 side/drink 池补供给（spec §4.2 / §3.1 foodsByMealForSinglePick，仅水占）。",
    ],
  },
  dishes,
};

fs.writeFileSync(
  path.join(process.cwd(), "docs", "dish-candidates.draft.json"),
  JSON.stringify(out, null, 2) + "\n",
);

// —— review 表（markdown）——
const esc = (s) => String(s).replace(/\|/g, "\\|");
const cols = ["name","cuisine","priceTier","pickLayer","meals","spicy","tags","satiety","indulgence","convenience","occasion","gateQuery","displayQuery","canonicalGroup"];
let md = `# 中式候选菜 review 表（第一批，共 ${dishes.length} 行）\n\n`;
md += `> 审阅重点：命名真实性 / 口味(spicy) / 价位归档 / 餐段合理性 / treat 是否够犒劳 / side 层归类 / canonicalGroup 归并。\n`;
md += `> 层级：meal ${byLayer.meal} · side ${byLayer.side}（**缺口只算 meal 层**）\n`;
md += `> meal 层价位（计入缺口）：budget ${mealByPrice.budget} · normal ${mealByPrice.normal} · treat ${mealByPrice.treat}\n`;
md += `> 餐段命中（仅 meal 层）：早 ${byMeal.breakfast} / 午 ${byMeal.lunch} / 茶 ${byMeal.tea} / 晚 ${byMeal.dinner} / 宵 ${byMeal.midnight}\n`;
md += `> tea meal=0 是预期：下午茶不走 meal-only，由后续 side/drink 池补供给（spec §4.2 / §3.1）。\n\n`;
md += "| " + cols.join(" | ") + " |\n";
md += "|" + cols.map(() => "---").join("|") + "|\n";
for (const d of dishes) {
  const flat = { ...d, gateQuery: d.search.gateQuery, displayQuery: d.search.displayQuery };
  md += "| " + cols.map((c) => {
    const v = flat[c];
    if (Array.isArray(v)) return esc(v.join("/"));
    return esc(v ?? "");
  }).join(" | ") + " |\n";
}
fs.writeFileSync(path.join(process.cwd(), "docs", "dish-candidates.review.md"), md);

console.log(`✓ 生成 ${dishes.length} 道中式候选`);
console.log(`  价位: budget ${byPrice.budget} / normal ${byPrice.normal} / treat ${byPrice.treat}`);
console.log(`  层级: meal ${byLayer.meal} / side ${byLayer.side}`);
console.log(`  餐段命中(meal层): 早${byMeal.breakfast} 午${byMeal.lunch} 茶${byMeal.tea}(不设硬指标) 晚${byMeal.dinner} 宵${byMeal.midnight}`);
console.log(chineseMealRemaining > 0
  ? `  ⚠ 中式 meal 未完成：达成 ${mealLayer.length}/${chineseMealTarget}，还差 +${chineseMealRemaining}（勿按行数收尾）`
  : `  ✓ 中式 meal 达标 ${mealLayer.length}/${chineseMealTarget}`);
console.log(`  → docs/dish-candidates.draft.json + docs/dish-candidates.review.md`);
