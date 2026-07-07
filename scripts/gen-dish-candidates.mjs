// scripts/gen-dish-candidates.mjs
// 生成 dish 候选菜草案 → docs/dish-candidates.draft.json + docs/dish-candidates.review.md
// ─────────────────────────────────────────────
// 本批：中式 +49（budget 18 / normal 22 / treat 9），供 user + Codex 审。
// 审定后再补 western/jpkr/exotic。
//
// 设计：核心属性（需人味判断的）手工列在 ROWS，紧凑表；
// 衍生字段（gateQuery/fallbackQueries/displayQuery）按 cuisine 机械推导，不手填。
// 产物是「草案」，审定后才落 foods.ts。emoji 在落库时定，草案不含。
//
// ROW 字段：[name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup?]
// meals 短码: b早 l午 t茶 d晚 n宵 ；occasion 短码: s=solo dt=date f=friends ln=lateNight q=quick

import fs from "fs";
import path from "path";

const M = { b: "breakfast", l: "lunch", t: "tea", d: "dinner", n: "midnight" };
const O = { s: "solo", dt: "date", f: "friends", ln: "lateNight", q: "quick" };

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
  "western-italian":  { gate: "意��利菜", fb: ["意大利菜", "西餐厅"] },
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
  ["���烧海参",       "cn-beifang",  "treat", 0, "d",  ["高蛋白","解馋"],        3, 5, "restaurant", "fdt"],
  ["蟹黄豆腐",       "cn-jiangzhe", "treat", 0, "d",  ["解馋","高蛋白"],        3, 4, "restaurant", "dtf"],
  ["东坡肉",         "cn-jiangzhe", "treat", 0, "dl", ["高热量","解馋","下饭"], 4, 4, "restaurant", "f"],
  ["北京烤鸭",       "cn-beifang",  "treat", 0, "d",  ["高热量","解馋","高蛋白"],4, 5, "restaurant", "fdt"],
  ["白灼基围虾",     "cn-guangdong","treat", 0, "d",  ["清淡","高蛋白","解馋"], 3, 4, "restaurant", "fdt"],
  ["干锅牛蛙",       "cn-chuanyu",  "treat", 2, "d",  ["解馋","下饭","高蛋白"], 4, 4, "restaurant", "f"],
  ["水煮鱼",         "cn-chuanyu",  "treat", 3, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "f", "shuizhuyu"],
  ["酸汤肥牛",       "cn-generic",  "treat", 1, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "fs"],
];

function expand(row) {
  const [name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup] = row;
  const cs = CUISINE_SEARCH[cuisine];
  if (!cs) throw new Error(`未知 cuisine: ${cuisine}（${name}）`);
  const obj = {
    name, cuisine, priceTier,
    meals: [...meals].map((c) => M[c]),
    spicy, tags, satiety, indulgence, convenience,
    occasion: occasion.match(/dt|ln|[sfq]/g).map((c) => O[c]),
    gateQuery: cs.gate,
    displayQuery: name,
    fallbackQueries: cs.fb,
  };
  if (canonicalGroup) obj.canonicalGroup = canonicalGroup;
  return obj;
}

const dishes = ROWS.map(expand);

// —— 自检（对齐 spec §7 lint 规则）——
const errs = [];
// treat 质量门
dishes.filter((d) => d.priceTier === "treat")
  .filter((d) => d.indulgence < 4 || d.satiety < 3 || d.tags.includes("健康轻食"))
  .forEach((d) => errs.push(`treat 质量门: ${d.name}`));
// 字段完整
dishes.forEach((d) => {
  if (!d.meals.length) errs.push(`meals 空: ${d.name}`);
  if (!d.tags.length) errs.push(`tags 空: ${d.name}`);
  if (!d.occasion.length) errs.push(`occasion 空: ${d.name}`);
});
// id/name 唯一
const dup = dishes.map((d) => d.name).filter((n, i, a) => a.indexOf(n) !== i);
if (dup.length) errs.push(`重名: ${[...new Set(dup)].join(",")}`);
if (errs.length) { console.error("✗ 自检失败:\n" + errs.join("\n")); process.exit(1); }

// —— 分布统计（给 review 用）——
const prices = ["budget", "normal", "treat"];
const byPrice = Object.fromEntries(prices.map((p) => [p, dishes.filter((d) => d.priceTier === p).length]));
const mealsAll = ["breakfast", "lunch", "tea", "dinner", "midnight"];
const byMeal = Object.fromEntries(mealsAll.map((m) => [m, dishes.filter((d) => d.meals.includes(m)).length]));

const out = {
  _meta: {
    purpose: "dish 候选菜草案（脚本生成），供 user + Codex 审后落 foods.ts",
    generated: new Date().toISOString().slice(0, 10),
    batch: "中式 +49（第一批）",
    gapTarget: { chinese: 49, western: 29, jpkr: 27, exotic: 24, total: 129 },
    thisBatchCount: dishes.length,
    priceDistribution: byPrice,
    mealHits: byMeal,
    reviewStatus: "DRAFT — 待审：命名/口味真实性 / spicy / priceTier 归档 / meals 合理性 / canonicalGroup",
    notes: [
      "family 不写，由 cuisine→familyOf 推导。",
      "emoji 落库时定，草案不含。",
      "gateQuery 对齐现有 cuisineKeyword，Phase 1 运行时零改动。",
      "treat 全为具体菜，无火锅/烧烤/烤肉/品牌。",
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
const cols = ["name","cuisine","priceTier","meals","spicy","tags","satiety","indulgence","convenience","occasion","gateQuery","displayQuery","canonicalGroup"];
let md = `# 中式候选菜 review 表（第一批 +${dishes.length}）\n\n`;
md += `> 审阅重点：命名真实性 / 口味(spicy) / 价位归档 / 餐段合理性 / treat 是否够犒劳 / canonicalGroup 归并。\n`;
md += `> 分布：budget ${byPrice.budget} · normal ${byPrice.normal} · treat ${byPrice.treat}；`;
md += `餐段命中 早${byMeal.breakfast}/午${byMeal.lunch}/茶${byMeal.tea}/晚${byMeal.dinner}/宵${byMeal.midnight}\n\n`;
md += "| " + cols.join(" | ") + " |\n";
md += "|" + cols.map(() => "---").join("|") + "|\n";
for (const d of dishes) {
  md += "| " + cols.map((c) => {
    const v = d[c];
    if (Array.isArray(v)) return esc(v.join("/"));
    return esc(v ?? "");
  }).join(" | ") + " |\n";
}
fs.writeFileSync(path.join(process.cwd(), "docs", "dish-candidates.review.md"), md);

console.log(`✓ 生成 ${dishes.length} 道中式候选`);
console.log(`  价位: budget ${byPrice.budget} / normal ${byPrice.normal} / treat ${byPrice.treat}`);
console.log(`  餐段命中: 早${byMeal.breakfast} ��${byMeal.lunch} 茶${byMeal.tea} 晚${byMeal.dinner} 宵${byMeal.midnight}`);
console.log(`  → docs/dish-candidates.draft.json + docs/dish-candidates.review.md`);
