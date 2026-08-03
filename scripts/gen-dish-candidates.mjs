// scripts/gen-dish-candidates.mjs
// 生成 dish 候选菜草案 → docs/archive/dish-candidates.draft.json + docs/archive/dish-candidates.review.md
//   （产物已归档到 docs/archive/：本批 dish 早已落库进 foods.ts，草案仅留作溯源）
// ─────────────────────────────────────────────
// 本批：全 4 family meal 补齐——中式 49（含 +7）/ 西餐 29 / 日韩 27 / 异国 24 = 129 meal + 7 side，供 user + Codex 审。
//   family meal 缺口 + 餐段缺口均由机器追踪（_meta.familyBoard / _meta.mealRemaining）。
//   收尾判据：各 family meal 净增达标 且 各餐段(早/午/晚/宵)达标（tea 除外），非行数。
//
// 设计：核心属性（需人味判断的）手工列在 ROWS，紧凑表；
// 衍生字段（search.* 查店档案、layer 层级）按规则机械推导，不手填。
// 产物是「草案」，审定后才落 foods.ts。id/emoji 已由生成器持有并写进草案（id 稳定、emoji 可改）。
//
// ROW 字段：[id, name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup?]
//   id 是稳定引用契约：固化在 ROWS 里，绝不由 name 计算，改 name/emoji 时 id 不变（见 §S3 决策）。
//   meals 短码: b早 l午 t茶 d晚 n宵 ；occasion 短码: s=solo dt=date f=friends ln=lateNight q=quick
//
// pickLayer 层级（衍生，对齐 spec §1.1 PickLayer + user fix 4「satiety<3 不进默认单菜池」）：
//   satiety>=3 → "meal"（一顿饭级别的具体食物，进默认单菜主池）
//   satiety<3  → "side"（小食/配菜/组合项，落库映射为 side 层，不进默认单菜池）

import fs from "fs";
import path from "path";
import { readFileSync } from "node:fs";

const M = { b: "breakfast", l: "lunch", t: "tea", d: "dinner", n: "midnight" };
const O = { s: "solo", dt: "date", f: "friends", ln: "lateNight", q: "quick" };

// —— 枚举合法值（自检用，对齐 src/types/food.d.ts）——
const TAGS = new Set(["高热量","清淡","适合宿舍","快手","下饭","健康轻食","暖胃","高蛋白","解馋","省钱","提神","续命","解腻"]);
const CONVENIENCE = new Set(["canteen","takeout","restaurant","convenience","dorm"]);
const OCCASION = new Set(["solo","date","friends","lateNight","quick"]);
const PRICE = new Set(["budget","normal","treat"]);

// cuisine → family（对齐 src/config/cuisine.ts familyOf，用于按 family 统计 meal 缺口）
const FAMILY_OF = {
  "cn-generic": "chinese", "cn-dongbei": "chinese", "cn-chuanyu": "chinese",
  "cn-hunan": "chinese", "cn-guangdong": "chinese", "cn-jiangzhe": "chinese",
  "cn-xibei": "chinese", "cn-yunguigui": "chinese", "cn-beifang": "chinese",
  japanese: "jpkr", korean: "jpkr",
  "western-italian": "western", "western-american": "western", "western-generic": "western",
  thai: "exotic", sea: "exotic", mideast: "exotic", indian: "exotic", "exotic-generic": "exotic",
};

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
  indian:         { gate: "印度菜",   fb: ["印度菜", "异国料理"] },
  "exotic-generic": { gate: "异国料理", fb: ["异国料理"] },
};

// ─────────────────────────────────────────────
// shopKeyword（§2.1 方案 A 变体，user 定稿）
//   查店暗钥 keywordOf = shopKeyword ?? cuisineKeyword(cuisine)。
//   规则：只给「回退词过宽/不准」的菜补 shopKeyword，中式细分菜系（川/湘/粤…）够用不补。
//   ⚠️ 必须是【店型/品类词】，不是菜名（菜名会 fail-closed）。
//   例：日式酱油拉面→日式拉面 / 韩式炸鸡→炸鸡 / 战斧牛排→牛排 / 印度咖喱羊肉饭→印度菜。
// ─────────────────────────────────────────────
const SHOP_KEYWORD = {
  // —— 中式：仅个别宽泛回退的（cn-generic「家常菜」对具体品类偏虚）——
  "咖喱牛肉饭": "咖喱饭",
  // —— western：western-generic 回退「西餐厅」太宽；具体到店型 ——
  "金枪鱼三明治": "三明治",
  "早餐三明治": "三明治",
  "贝果早餐盘": "贝果",
  "火腿芝士帕尼尼": "三明治",       // 帕尼尼即热压三明治，店型归三明治
  "芝士焗饭": "西餐厅",             // 焗饭无稳定专门店，保留西餐厅（等于回退，但显式声明已评估）
  "蘑菇鸡肉焗饭": "西餐厅",
  "美式炸鸡汉堡": "炸鸡",
  "香煎鸡排饭": "牛排",             // 鸡排/牛排同属牛排简餐店型
  "烟熏三文鱼贝果": "贝果",
  "奶油蘑菇汤配面包": "西餐厅",
  "鸡肉凯撒卷": "轻食沙拉",
  "惠灵顿牛排": "牛排",
  "战斧牛排": "牛排",
  "奶油蘑菇牛排饭": "牛排",
  "芝士焗龙虾": "西餐厅",
  "烤羊排": "西餐厅",
  "西冷牛排配薯条": "牛排",
  // —— jpkr：拉面/炸鸡/寿司/烤肉等有稳定专门店型，别退回「日本料理/韩国料理」——
  "韩式辣味拉面": "韩式拉面",
  "韩式泡菜拉面": "韩式拉面",
  "日式酱油拉面": "日式拉面",
  "日式海鲜拉面": "日式拉面",
  "日式盐味拉面": "日式拉面",
  "日式咖喱鸡排饭": "日式咖喱",
  "日式咖喱牛肉乌冬": "乌冬面",
  "日式咖喱猪排饭": "日式咖喱",
  "韩式炸鸡": "炸鸡",
  "韩式酱油炸鸡": "炸鸡",
  "日式和牛烧肉": "日式烧肉",
  "日式特上寿司": "寿司",
  // —— exotic：exotic-generic / mideast / indian / sea / thai 用更准的国别店型 ——
  "越南猪肉法包": "越南菜",
  "泰式海鲜炒河粉": "泰国菜",
  "泰式绿咖喱鸡饭": "泰国菜",
  "泰式红咖喱牛肉饭": "泰国菜",
  "泰式咖喱蟹": "泰国菜",
  "马来叻沙面": "东南亚菜",
  "越南香茅烤肉饭": "越南菜",
  "越南春卷米线": "越南菜",
  "新加坡海南鸡饭": "海南鸡饭",
  "印尼炒饭": "东南亚菜",
  "印度咖喱羊肉饭": "印度菜",
  "印度玛萨拉咖喱鸡饭": "印度菜",
  "印度烤羊排配馕": "印度菜",
  "墨西哥烤鸡肉卷饭": "墨西哥菜",
  "中东烤鸡肉饭": "中东菜",
  "中东烤羊肉拼盘": "中东菜",
  "土耳其烤肉披萨": "土耳其烤肉",
  "摩洛哥炖羊肉": "中东菜",
  "西班牙海鲜饭": "西班牙菜",
};

// 落库 lint 底线（§2.1）：以下情形【必须】显式有 shopKeyword，否则查店偏虚。
//   1) cuisine ∈ 宽泛回退集（回退词太笼统）；2) name 命中稳定专门店型的品类关键词。
const SHOPKW_REQUIRED_CUISINE = new Set(["western-generic", "exotic-generic", "indian", "mideast"]);
const SHOPKW_REQUIRED_NAME = /拉面|炸鸡|牛排|寿司|三明治|贝果|法包|咖喱/;
// 「烧肉/烤肉」要补，但排除中式「红烧肉」（那是家常菜，走 cuisineKeyword）
function shopKwRequired(d) {
  if (SHOPKW_REQUIRED_CUISINE.has(d.cuisine)) return true;
  if (SHOPKW_REQUIRED_NAME.test(d.name)) return true;
  if (/烤肉/.test(d.name)) return true;
  if (/烧肉/.test(d.name) && !/红烧肉/.test(d.name)) return true;
  return false;
}

// ─────────────────────────────────────────────
// 中式候选 +49（已核对不与现有 65 道中式 dish 撞名）
// ─────────────────────────────────────────────
const ROWS = [
  // ===== budget ×18（平价日常；覆盖早餐/宵夜真实可吃）=====
  ["cn-plain-congee-sides", "白粥配小菜",     "cn-generic",  "budget", 0, "b",   ["清淡","省钱","暖胃"], 2, 1, "canteen",     "sq"],
  ["cn-tea-egg", "茶叶蛋",         "cn-generic",  "budget", 0, "bn",  ["省钱","快手"],        1, 1, "convenience", "sqln"],
  ["cn-pork-veggie-bun", "菜肉包子",       "cn-generic",  "budget", 0, "b",   ["省钱","快手","暖胃"], 3, 2, "takeout",     "sq"],
  ["cn-grabbed-pancake-egg", "手抓饼加蛋",     "cn-beifang",  "budget", 0, "b",   ["快手","解馋","高热量"],3, 2, "takeout",     "sq"],
  ["cn-savory-soymilk", "咸豆浆",         "cn-jiangzhe", "budget", 0, "b",   ["清淡","暖胃","省钱"], 2, 2, "takeout",     "sq"],
  ["cn-tomato-egg-noodle", "西红柿鸡蛋面",   "cn-generic",  "budget", 0, "ld",  ["清淡","快手","暖胃"], 3, 2, "dorm",        "sq"],
  ["cn-yangchun-noodle", "阳春面",         "cn-jiangzhe", "budget", 0, "ld",  ["清淡","省钱","暖胃"], 3, 2, "restaurant",  "sq"],
  ["cn-zhacai-pork-noodle", "榨菜肉丝面",     "cn-jiangzhe", "budget", 1, "ldn", ["下饭","快手","暖胃"], 3, 2, "takeout",     "sqln"],
  ["cn-potato-strip-rice", "土豆丝盖饭",     "cn-generic",  "budget", 1, "ld",  ["省钱","下饭","快手"], 4, 2, "canteen",     "sq"],
  ["cn-pepper-pork-rice", "青椒肉丝盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱"],        4, 2, "canteen",     "sq"],
  ["cn-homestyle-tofu-rice", "家常豆腐盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱","暖胃"], 4, 2, "canteen",     "sq"],
  ["cn-garlic-stem-pork-rice", "蒜薹炒肉盖饭",   "cn-generic",  "budget", 1, "ld",  ["下饭","省钱"],        4, 2, "canteen",     "sq"],
  ["cn-flatbread-wrap", "大饼卷菜",       "cn-beifang",  "budget", 0, "bl",  ["省钱","快手","解馋"], 3, 2, "takeout",     "sq"],
  ["cn-cabbage-vermicelli-stew", "白菜炖粉条",     "cn-dongbei",  "budget", 0, "d",   ["暖胃","省钱","下饭"], 4, 2, "canteen",     "sf"],
  ["cn-vinegar-cabbage-rice", "醋溜白菜盖饭",   "cn-beifang",  "budget", 0, "ld",  ["清淡","省钱","下饭"], 3, 2, "canteen",     "sq"],
  ["cn-shanghai-wonton", "上海小馄饨",     "cn-jiangzhe", "budget", 0, "bn",  ["清淡","暖胃","快手"], 2, 2, "takeout",     "sqln"],
  ["cn-century-egg-tofu", "皮蛋豆腐",       "cn-generic",  "budget", 0, "dn",  ["清淡","解腻","快手"], 2, 2, "restaurant",  "fln"],
  ["cn-braised-platter", "卤味拼盘",       "cn-generic",  "budget", 1, "dn",  ["解馋","下饭"],        2, 3, "takeout",     "sfln"],

  // ===== normal ×22（正餐主力）=====
  ["cn-hongshao-pork-rice", "红烧肉盖饭",     "cn-jiangzhe", "normal", 0, "ld",  ["高热量","下饭","解馋"], 4, 3, "canteen",    "sf"],
  ["cn-jingjiang-pork", "京酱肉丝",       "cn-beifang",  "normal", 0, "d",   ["下饭","解馋"],          3, 3, "restaurant", "f"],
  ["cn-disanxian-rice", "地三鲜盖饭",     "cn-dongbei",  "normal", 0, "ld",  ["下饭","解馋","高热量"], 4, 3, "canteen",    "sf"],
  ["cn-chicken-mushroom-stew", "小鸡炖蘑菇",     "cn-dongbei",  "normal", 0, "d",   ["暖胃","高蛋白","下饭"], 4, 3, "restaurant", "f"],
  ["cn-laziji", "辣子鸡丁",       "cn-chuanyu",  "normal", 3, "ld",  ["解馋","下饭","高蛋白"], 3, 3, "restaurant", "f"],
  ["cn-koushui-chicken", "口水鸡",         "cn-chuanyu",  "normal", 2, "ld",  ["解馋","高蛋白"],        3, 3, "restaurant", "fs"],
  ["cn-fuqi-feipian", "夫妻肺片",       "cn-chuanyu",  "normal", 2, "d",   ["解馋","下饭"],          2, 3, "restaurant", "f"],
  ["cn-farmhouse-pork", "农家小炒肉",     "cn-hunan",    "normal", 2, "ld",  ["下饭","解馋","高热量"], 4, 3, "restaurant", "sf"],
  ["cn-white-cut-chicken", "白切鸡",         "cn-guangdong","normal", 0, "ld",  ["清淡","高蛋白"],        3, 3, "restaurant", "f"],
  ["cn-lapwei-claypot-rice", "腊味煲仔饭",     "cn-guangdong","normal", 0, "ld",  ["下饭","解馋","暖胃"],   4, 3, "restaurant", "sf", "baozaifan"],
  ["cn-dry-pot-cauliflower", "干锅花菜",       "cn-hunan",    "normal", 2, "d",   ["下饭","解馋"],          3, 3, "restaurant", "f"],
  ["cn-sizzling-pepper-beef", "铁板黑椒牛柳",   "cn-generic",  "normal", 1, "d",   ["高蛋白","下饭","解馋"], 3, 3, "restaurant", "dtf"],
  ["cn-yuxiang-eggplant", "鱼香茄子煲",     "cn-chuanyu",  "normal", 1, "ld",  ["下饭","解馋"],          3, 3, "canteen",    "s"],
  ["cn-sweet-sour-pork", "糖醋里脊",       "cn-generic",  "normal", 0, "ld",  ["解馋","高热量"],        3, 3, "restaurant", "fs"],
  ["cn-gulao-pork", "咕咾肉",         "cn-guangdong","normal", 0, "ld",  ["解馋","高热量","下饭"], 3, 3, "restaurant", "fs"],
  ["cn-scallion-lamb", "葱爆羊肉",       "cn-beifang",  "normal", 1, "d",   ["高蛋白","暖胃","下饭"], 3, 3, "restaurant", "f"],
  ["cn-lamb-paomo", "羊肉泡馍",       "cn-xibei",    "normal", 0, "ld",  ["暖胃","高蛋白","续命"], 5, 3, "restaurant", "sf"],
  ["cn-xinjiang-rice-noodle", "新疆炒米粉",     "cn-xibei",    "normal", 2, "ldn", ["下饭","解馋","高热量"], 4, 3, "takeout",    "sfln"],
  ["cn-steampot-chicken", "汽锅鸡",         "cn-yunguigui","normal", 0, "d",   ["暖胃","清淡","高蛋白"], 3, 3, "restaurant", "f"],
  ["cn-dali-sour-fish", "大理酸辣鱼",     "cn-yunguigui","normal", 2, "d",   ["下饭","解馋","暖胃"],   4, 3, "restaurant", "f"],
  ["cn-three-cup-chicken", "三杯鸡",         "cn-generic",  "normal", 1, "ld",  ["下饭","解馋","高蛋白"], 3, 3, "restaurant", "fs"],
  ["cn-meicai-pork-rice", "梅菜扣肉盖饭",   "cn-guangdong","normal", 0, "ld",  ["下饭","高热量","解馋"], 4, 3, "canteen",    "sf"],

  // ===== treat ×9（全具体菜，无火锅/烧烤/品牌；indulgence≥4 且 satiety≥3，非轻食）=====
  ["cn-chopped-chili-fish-head", "剁椒鱼头",       "cn-hunan",    "treat", 2, "d",  ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "f"],
  ["cn-scallion-sea-cucumber", "葱烧海参",       "cn-beifang",  "treat", 0, "d",  ["高蛋白","解馋"],        3, 5, "restaurant", "fdt"],
  ["cn-crab-roe-tofu", "蟹黄豆腐",       "cn-jiangzhe", "treat", 0, "d",  ["解馋","高蛋白"],        3, 4, "restaurant", "dtf"],
  ["cn-dongpo-pork", "东坡肉",         "cn-jiangzhe", "treat", 0, "dl", ["高热量","解馋","下饭"], 4, 4, "restaurant", "f"],
  ["cn-peking-duck", "北京烤鸭",       "cn-beifang",  "treat", 0, "d",  ["高热量","解馋","高蛋白"],4, 5, "restaurant", "fdt"],
  ["cn-blanched-shrimp", "白灼基围虾",     "cn-guangdong","treat", 0, "d",  ["清淡","高蛋白","解馋"], 3, 4, "restaurant", "fdt"],
  ["cn-dry-pot-bullfrog", "干锅牛蛙",       "cn-chuanyu",  "treat", 2, "d",  ["解馋","下饭","高蛋白"], 4, 4, "restaurant", "f"],
  ["cn-shuizhu-fish", "水煮鱼",         "cn-chuanyu",  "treat", 3, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "f", "shuizhuyu"],
  ["cn-sour-soup-beef", "酸汤肥牛",       "cn-generic",  "treat", 1, "dl", ["下饭","解馋","高蛋白"], 4, 4, "restaurant", "fs"],

  // ═══════════════════════════════════════════════
  // 中式 +7 meal（补 §4.0 看板缺口：budget +6 / normal +1；均 satiety>=3 保证计入 meal 层）
  // 已核对不与现有 foods.ts 及本文件上方 49 撞名；盖饭类挂 canonicalGroup 防刷屏
  // ═══════════════════════════════════════════════
  ["cn-yangzhou-fried-rice", "扬州炒饭",       "cn-generic",  "budget", 0, "ld",  ["快手","解馋","高热量"], 3, 2, "canteen",    "sq", "chaofan"],
  ["cn-pork-fried-noodle", "肉丝炒面",       "cn-generic",  "budget", 1, "ldn", ["快手","下饭","高热量"], 3, 2, "takeout",    "sqln"],
  ["cn-mushroom-chicken-rice", "香菇滑鸡饭",     "cn-guangdong","budget", 0, "ld",  ["下饭","高蛋白","暖胃"], 4, 2, "canteen",    "sq"],
  ["cn-huiguorou-rice", "回锅肉盖饭",     "cn-chuanyu",  "budget", 2, "ld",  ["下饭","解馋","高热量"], 4, 2, "canteen",    "sq"],
  ["cn-mapo-tofu-rice", "麻婆豆腐盖饭",   "cn-chuanyu",  "budget", 2, "ld",  ["下饭","解馋","暖胃"],   3, 2, "canteen",    "sq"],
  ["cn-taiwan-lurou-rice", "台式卤肉饭",     "cn-generic",  "budget", 0, "ldn", ["下饭","解馋","高热量"], 3, 2, "takeout",    "sqln"],
  ["cn-curry-beef-rice", "咖喱牛肉饭",     "cn-generic",  "normal", 1, "ld",  ["下饭","解馋","高蛋白"], 4, 3, "restaurant", "sf"],

  // ═══════════════════════════════════════════════
  // 西餐 +29 meal（budget 8 / normal 13 / treat 8；全为 satiety>=3 的 meal 层具体菜）
  // family=western，由 cuisine→familyOf 推导；已核对不与现有 22 道西餐撞名
  // ═══════════════════════════════════════════════
  // ---- western budget ×8 ----
  ["us-bacon-egg-burger", "培根鸡蛋堡",     "western-american", "budget", 0, "b",   ["高热量","快手","解馋"], 3, 3, "takeout",    "sq"],
  ["us-scrambled-egg-toast", "美式炒蛋吐司",   "western-american", "budget", 0, "b",   ["快手","高蛋白"],        3, 3, "takeout",    "sq"],
  ["west-tuna-sandwich", "金枪鱼三明治",   "western-generic",  "budget", 0, "bl",  ["快手","高蛋白","清淡"], 3, 2, "convenience","sq"],
  ["it-ham-cheese-panini", "火腿芝士帕尼尼", "western-italian",  "budget", 0, "bl",  ["快手","解馋","高热量"], 3, 3, "takeout",    "sq"],
  ["it-tomato-pasta", "茄汁意面",       "western-italian",  "budget", 0, "ld",  ["解馋","高热量"],        3, 3, "canteen",    "sq", "yimian"],
  ["it-pesto-pasta", "青酱意面",       "western-italian",  "budget", 0, "ld",  ["解馋","高热量"],        3, 3, "canteen",    "sq", "yimian"],
  ["us-mexican-chicken-wrap", "墨西哥鸡肉卷",   "western-american", "budget", 1, "ldn", ["快手","解馋","高热量"], 3, 3, "takeout",    "sqln"],
  ["us-bacon-hashbrown-breakfast", "培根薯饼早餐盘", "western-american", "budget", 0, "b",   ["高热量","解馋"],        3, 3, "restaurant", "sf"],
  // ---- western normal ×13 ----
  ["it-margherita-pizza", "玛格丽特披萨",   "western-italian",  "normal", 0, "ld",  ["解馋","高热量"],        4, 3, "restaurant", "fdt", "pizza"],
  ["it-lasagna", "意式千层面",     "western-italian",  "normal", 0, "ld",  ["解馋","高热量","暖胃"], 4, 3, "restaurant", "fdt"],
  ["west-cheese-baked-rice", "芝士焗饭",       "western-generic",  "normal", 0, "ld",  ["解馋","高热量","暖胃"], 4, 3, "restaurant", "sf"],
  ["west-mushroom-chicken-baked-rice", "蘑菇鸡肉焗饭",   "western-generic",  "normal", 0, "ld",  ["解馋","高蛋白","暖胃"], 4, 3, "restaurant", "sf"],
  ["us-angus-beef-burger", "安格斯牛肉堡",   "western-american", "normal", 0, "ld",  ["高热量","解馋","高蛋白"],4, 3, "restaurant", "fdt"],
  ["us-orleans-chicken-rice", "奥尔良烤鸡饭",   "western-american", "normal", 1, "ld",  ["下饭","解馋","高蛋白"], 4, 3, "takeout",    "sf"],
  ["it-meatball-rice", "意式肉丸饭",     "western-italian",  "normal", 0, "ld",  ["下饭","解馋","高蛋白"], 4, 3, "restaurant", "sf"],
  ["it-sausage-pasta", "香肠意面",       "western-italian",  "normal", 1, "ld",  ["解馋","高热量"],        4, 3, "restaurant", "sf", "yimian"],
  ["us-fried-chicken-burger", "美式炸鸡汉堡",   "western-american", "normal", 1, "ldn", ["高热量","解馋"],        4, 3, "takeout",    "sfln"],
  ["west-pan-chicken-rice", "香煎鸡排饭",     "western-generic",  "normal", 0, "ld",  ["高蛋白","解馋","下饭"], 4, 3, "restaurant", "sf"],
  ["west-smoked-salmon-bagel", "烟熏三文鱼贝果", "western-generic",  "normal", 0, "bl",  ["高蛋白","清淡","解馋"], 3, 3, "restaurant", "dt"],
  ["west-cream-mushroom-soup-bread", "奶油蘑菇汤配面包","western-generic", "normal", 0, "ld",  ["暖胃","清淡"],          3, 3, "restaurant", "dt"],
  ["west-chicken-caesar-wrap", "鸡肉凯撒卷",     "western-generic",  "normal", 0, "ld",  ["快手","高蛋白","解馋"], 3, 3, "takeout",    "sq"],
  // ---- western treat ×8（indulgence>=4 且 satiety>=3；不惩罚清淡）----
  ["west-beef-wellington", "惠灵顿牛排",     "western-generic",  "treat", 0, "d",   ["高热量","解馋","高蛋白"],4, 5, "restaurant", "dtf"],
  ["us-tomahawk-steak", "战斧牛排",       "western-american", "treat", 0, "d",   ["高热量","解馋","高蛋白"],4, 5, "restaurant", "dtf"],
  ["it-seafood-pasta", "海鲜意面",       "western-italian",  "treat", 1, "d",   ["解馋","高蛋白"],        4, 4, "restaurant", "dtf", "yimian"],
  ["west-cream-mushroom-steak-rice", "奶油蘑菇牛排饭", "western-generic",  "treat", 0, "d",   ["高热量","解馋","高蛋白"],4, 4, "restaurant", "sf"],
  ["west-cheese-lobster", "芝士焗龙虾",     "western-generic",  "treat", 0, "d",   ["解馋","高蛋白"],        4, 5, "restaurant", "dtf"],
  ["west-roast-lamb-chop", "烤羊排",         "western-generic",  "treat", 1, "d",   ["高热量","解馋","高蛋白"],4, 4, "restaurant", "fdt"],
  ["it-truffle-mushroom-pasta", "松露蘑菇意面",   "western-italian",  "treat", 0, "d",   ["解馋","高热量"],        4, 4, "restaurant", "dtf", "yimian"],
  ["us-sirloin-steak-fries", "西冷牛排配薯条", "western-american", "treat", 0, "d",   ["高热量","解馋","高蛋白"],4, 4, "restaurant", "dtf"],

  // ═══════════════════════════════════════════════
  // 日韩 +27 meal（budget 7 / normal 13 / treat 7；全 satiety>=3）
  // ★ 餐段策略：本轮须补 midnight（存量后仍缺 ~31）+ 少量 breakfast(+2)。
  //   拉面/炸鸡/炒饭/盖饭/烧肉多为真实夜宵，故大量挂 n；早餐给 2 道日式早点。
  //   family=jpkr（japanese/korean），已核对不与现有 29 道日韩撞名。
  // ═══════════════════════════════════════════════
  // ---- jpkr budget ×7（含 2 早餐、多夜宵）----
  ["jp-salmon-ochazuke", "日式鲑鱼茶泡饭", "japanese", "budget", 0, "bln", ["清淡","快手","暖胃"],   3, 2, "takeout",    "sqln"],
  ["jp-egg-beef-rice", "日式滑蛋牛肉饭", "japanese", "budget", 0, "bld", ["快手","高蛋白","下饭"], 3, 2, "canteen",    "sq"],
  ["kr-kimchi-fried-rice", "韩式泡菜炒饭",   "korean",   "budget", 1, "ldn", ["下饭","解馋","快手"],   3, 2, "canteen",    "sqln"],
  ["kr-spicy-ramen", "韩式辣味拉面",   "korean",   "budget", 2, "ldn", ["暖胃","解馋","续命"],   3, 2, "convenience","sqln"],
  ["jp-shoyu-ramen", "日式酱油拉面",   "japanese", "budget", 1, "ldn", ["暖胃","解馋"],          4, 2, "takeout",    "sln",  "ramen"],
  ["kr-spicy-pork-rice", "韩式辣炒猪肉盖饭","korean",   "budget", 2, "ldn", ["下饭","解馋","高蛋白"], 4, 2, "canteen",    "sqln"],
  ["jp-curry-chicken-cutlet-rice", "日式咖喱鸡排饭", "japanese", "budget", 1, "ldn", ["下饭","解馋","高热量"], 4, 2, "canteen",    "sqln"],
  // ---- jpkr normal ×13（夜宵主力）----
  ["jp-seafood-ramen", "日式海鲜拉面",   "japanese", "normal", 1, "ldn", ["暖胃","解馋","高蛋白"], 4, 3, "restaurant", "sfln", "ramen"],
  ["jp-shio-ramen", "日式盐味拉面",   "japanese", "normal", 0, "ldn", ["暖胃","清淡"],          4, 3, "restaurant", "sfln", "ramen"],
  ["jp-teriyaki-chicken-rice", "日式照烧鸡腿饭", "japanese", "normal", 0, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "takeout",    "sfln"],
  ["jp-curry-beef-udon", "日式咖喱牛肉乌冬","japanese", "normal", 1, "ldn", ["暖胃","解馋","下饭"],   4, 3, "restaurant", "sfln"],
  ["kr-kimchi-pork-stew", "韩式泡菜猪肉锅", "korean",   "normal", 2, "dn",  ["暖胃","下饭","解馋"],   4, 3, "restaurant", "fln"],
  ["kr-spicy-squid-rice", "韩式辣炒鱿鱼盖饭","korean",   "normal", 2, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "restaurant", "sfln"],
  ["jp-tempura-donburi", "日式天妇罗盖饭", "japanese", "normal", 0, "ld",  ["解馋","高热量"],        4, 3, "restaurant", "sf"],
  ["kr-fried-chicken", "韩式炸鸡",       "korean",   "normal", 1, "dn",  ["高热量","解馋"],        4, 4, "takeout",    "flln",  "koreanchicken"],
  ["kr-soy-fried-chicken", "韩式酱油炸鸡",   "korean",   "normal", 0, "dn",  ["高热量","解馋"],        4, 4, "takeout",    "flln",  "koreanchicken"],
  ["jp-curry-pork-cutlet-rice", "日式咖喱猪排饭", "japanese", "normal", 1, "ldn", ["下饭","解馋","高热量"], 4, 3, "restaurant", "sfln"],
  ["kr-spicy-beef-soup-rice", "韩式辣牛肉汤饭", "korean",   "normal", 2, "ldn", ["暖胃","下饭","高蛋白"], 4, 3, "restaurant", "sfln"],
  ["kr-seafood-pancake", "韩式海鲜煎饼",   "korean",   "normal", 0, "dn",  ["解馋","高热量"],        3, 3, "restaurant", "fln"],
  ["jp-beef-shigureni-rice", "日式牛肉时雨煮饭","japanese", "normal", 0, "ld",  ["下饭","高蛋白","解馋"], 4, 3, "takeout",    "sf"],
  // ---- jpkr treat ×7（indulgence>=4 & satiety>=3）----
  ["jp-wagyu-yakiniku", "日式和牛烧肉",   "japanese", "treat", 0, "dn",  ["高热量","解馋","高蛋白"],4, 5, "restaurant", "flln"],
  ["jp-sashimi-platter", "日式刺身拼盘",   "japanese", "treat", 0, "dn",  ["清淡","高蛋白","解馋"],  3, 4, "restaurant", "fdt"],
  ["jp-unagi-three-ways", "日式鳗鱼三吃",   "japanese", "treat", 0, "d",   ["解馋","高蛋白"],         4, 4, "restaurant", "fdt"],
  ["kr-pork-belly-bbq-set", "韩式烤五花肉套餐","korean",  "treat", 1, "dn",  ["高热量","解馋","高蛋白"],4, 4, "restaurant", "flln"],
  ["jp-premium-sushi", "日式特上寿司",   "japanese", "treat", 0, "d",   ["清淡","高蛋白","解馋"],  3, 5, "restaurant", "fdt"],
  ["kr-charcoal-beef-short-rib", "韩式炭火烤牛小排","korean",  "treat", 0, "dn",  ["高热量","解馋","高蛋白"],4, 5, "restaurant", "flln"],
  ["jp-crab-hotpot", "日式蟹肉火锅",   "japanese", "treat", 0, "dn",  ["暖胃","解馋","高蛋白"],  4, 4, "restaurant", "flln"],

  // ═══════════════════════════════════════════════
  // 异国 +24 meal（budget 4 / normal 12 / treat 8；全 satiety>=3）
  // ★ 餐段策略：延续 midnight 重点补齐（炒河粉/法包/炒饭/咖喱多为夜宵可吃）。
  //   family=exotic（thai/sea/mideast/indian/exotic-generic），已核对不与现有 17 道异国撞名。
  // ═══════════════════════════════════════════════
  // ---- exotic budget ×4 ----
  ["sea-vietnam-pork-banhmi", "越南猪肉法包",   "sea",     "budget", 0, "bln", ["快手","解馋","清淡"],   3, 2, "takeout",    "sqln"],
  ["th-basil-pork-rice", "泰式打抛猪饭",   "thai",    "budget", 2, "ldn", ["下饭","解馋","高蛋白"], 3, 2, "takeout",    "sqln"],
  ["sea-indonesia-fried-rice", "印尼炒饭",       "sea",     "budget", 1, "ldn", ["下饭","解馋","高热量"], 3, 2, "takeout",    "sqln"],
  ["th-seafood-fried-noodle", "泰式海鲜炒河粉", "thai",    "budget", 1, "ldn", ["解馋","高热量","下饭"], 3, 2, "takeout",    "sqln"],
  // ---- exotic normal ×12（夜宵主力）----
  ["th-green-curry-chicken-rice", "泰式绿咖喱鸡饭", "thai",    "normal", 2, "ldn", ["下饭","解馋","暖胃"],   4, 3, "restaurant", "sfln"],
  ["th-red-curry-beef-rice", "泰式红咖喱牛肉饭","thai",   "normal", 2, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "restaurant", "sfln"],
  ["th-tomyum-seafood-noodle", "泰式冬阴功海鲜面","thai",   "normal", 2, "ldn", ["暖胃","解馋","高蛋白"], 4, 3, "restaurant", "sfln"],
  ["sea-malay-laksa", "马来叻沙面",     "sea",     "normal", 2, "ldn", ["暖胃","解馋","高热量"], 4, 3, "restaurant", "sfln"],
  ["sea-vietnam-lemongrass-pork-rice", "越南香茅烤肉饭", "sea",     "normal", 1, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "takeout",    "sfln"],
  ["in-lamb-curry-rice", "印度咖喱羊肉饭", "indian",  "normal", 2, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "restaurant", "sfln"],
  ["in-masala-chicken-rice", "印度玛萨拉咖喱鸡饭","indian", "normal",2, "ldn", ["下饭","解馋","暖胃"],   4, 3, "restaurant", "sfln"],
  ["world-mexican-chicken-burrito-rice", "墨西哥烤鸡肉卷饭","exotic-generic","normal",1,"ldn",["快手","解馋","高蛋白"],3,3,"takeout",   "sqln"],
  ["me-mideast-chicken-rice", "中东烤鸡肉饭",   "mideast", "normal", 1, "ldn", ["下饭","解馋","高蛋白"], 4, 3, "takeout",    "sfln"],
  ["sea-hainan-chicken-rice", "新加坡海南鸡饭", "sea",     "normal", 0, "ld",  ["清淡","高蛋白","下饭"], 4, 3, "restaurant", "sf"],
  ["sea-vietnam-springroll-noodle", "越南春卷米线",   "sea",     "normal", 0, "ld",  ["清淡","快手"],          3, 3, "takeout",    "sq"],
  ["me-turkish-kebab-pizza", "土耳其烤肉披萨", "mideast", "normal", 0, "ldn", ["解馋","高热量"],        4, 3, "takeout",    "sfln"],
  // ---- exotic treat ×8（indulgence>=4 & satiety>=3）----
  ["th-curry-crab", "泰式咖喱蟹",     "thai",    "treat", 2, "dn",  ["解馋","高蛋白"],        4, 4, "restaurant", "flln"],
  ["sea-black-pepper-crab", "新加坡黑胡椒蟹", "sea",     "treat", 1, "dn",  ["解馋","高蛋白","高热量"],4, 5, "restaurant", "flln"],
  ["in-lamb-chop-naan", "印度烤羊排配馕", "indian",  "treat", 1, "d",   ["高热量","解馋","高蛋白"],4, 4, "restaurant", "fdt"],
  ["me-mideast-lamb-platter", "中东烤羊肉拼盘", "mideast", "treat", 1, "dn",  ["高热量","解馋","高蛋白"],4, 4, "restaurant", "flln"],
  ["th-king-prawn", "泰式帝王虾",     "thai",    "treat", 1, "d",   ["解馋","高蛋白","清淡"], 3, 4, "restaurant", "fdt"],
  ["me-morocco-lamb-stew", "摩洛哥炖羊肉",   "mideast", "treat", 1, "d",   ["暖胃","解馋","高蛋白"], 4, 4, "restaurant", "fdt"],
  ["world-spanish-paella", "西班牙海鲜饭",   "exotic-generic","treat",0, "d",   ["解馋","高蛋白","高热量"],4, 4, "restaurant", "fdt"],
  ["th-volcano-ribs", "泰式火山排骨",   "thai",    "treat", 3, "dn",  ["解馋","下饭","高热量"], 4, 4, "restaurant", "flln"],

  // ═══════════════════════════════════════════════
  // S3 后补批 +18：真实硬缺口（§7 lint 口径，非 §4 旧 baseline）
  //   breakfast +9 / midnight +9；含 jpkr-budget +1（韩式泡菜拉面）、exotic-budget +1（泰式炒粿条）修 family×price。
  //   全 satiety>=3 = meal 层；已核对不与现有全库 + 本文件撞名。
  // ═══════════════════════════════════════════════
  // —— breakfast meal ×9 ——
  ["cn-breakfast-sandwich", "早餐三明治",   "western-generic","budget",0,"b",  ["快手","省钱","高蛋白"], 3, 2, "convenience","sq"],
  ["cn-egg-stuffed-pancake", "鸡蛋灌饼",     "cn-beifang",  "budget", 0, "bl",  ["快手","省钱","解馋"],   3, 2, "takeout",    "sq"],
  ["cn-beef-pie", "牛肉馅饼",     "cn-beifang",  "budget", 0, "bl",  ["解馋","高热量","下饭"], 3, 2, "takeout",    "sq"],
  ["cn-zifan-rice-roll", "粢饭团",       "cn-jiangzhe", "budget", 0, "b",   ["快手","省钱","暖胃"],   3, 2, "takeout",    "sq"],
  ["cn-rice-noodle-roll-set", "肠粉套餐",     "cn-guangdong","budget", 0, "bl",  ["清淡","快手","暖胃"],   3, 2, "restaurant", "sq"],
  ["cn-shaomai-set", "烧卖套餐",     "cn-guangdong","budget", 0, "bl",  ["快手","解馋","暖胃"],   3, 2, "restaurant", "sq"],
  ["west-bagel-breakfast-plate", "贝果早餐盘",   "western-generic","normal",0,"b", ["高蛋白","健康轻食","快手"],3, 3, "restaurant","sq"],
  ["cn-taiwan-rice-ball", "台式饭团",     "cn-generic",  "budget", 0, "b",   ["快手","省钱","解馋"],   3, 2, "takeout",    "sq"],
  ["cn-spicy-soup-mo", "胡辣汤配馍",   "cn-beifang",  "budget", 1, "bl",  ["暖胃","下饭","续命"],   3, 2, "restaurant", "sq"],

  // —— midnight meal ×9（含 jpkr/exotic budget 各 +1）——
  ["kr-kimchi-ramen", "韩式泡菜拉面", "korean",  "budget", 2, "dn",  ["暖胃","解馋","续命"],   3, 2, "takeout",    "sqln"],
  ["th-char-kway-teow", "泰式炒粿条",   "thai",    "budget", 1, "ldn", ["解馋","高热量","快手"], 3, 2, "takeout",    "sqln"],
  ["cn-late-night-beef-rice", "夜宵牛肉盖饭", "cn-generic",  "normal", 1, "dn",  ["下饭","解馋","续命"],   4, 3, "takeout",    "sfln"],
  ["cn-popcorn-chicken-rice", "盐酥鸡饭",     "cn-generic",  "normal", 1, "dn",  ["解馋","高热量","续命"], 3, 3, "takeout",    "sqln"],
  ["cn-soy-fried-noodle", "豉油皇炒面",   "cn-guangdong","budget", 0, "ldn", ["快手","解馋","高热量"], 3, 2, "takeout",    "sqln"],
  ["cn-shrimp-wonton-noodle", "鲜虾馄饨面",   "cn-guangdong","normal", 0, "ldn", ["清淡","暖胃","续命"],   3, 3, "takeout",    "sqln"],
  ["cn-clay-pot-chicken-noodle", "砂锅鸡杂粉",   "cn-yunguigui","normal", 2, "dn",  ["暖胃","解馋","续命"],   4, 3, "restaurant", "sfln"],
  ["cn-lurou-mixed-noodle", "卤肉拌面",     "cn-generic",  "budget", 1, "ldn", ["下饭","解馋","快手"],   3, 2, "takeout",    "sqln"],
  ["cn-spicy-beef-noodle", "麻辣牛肉面",   "cn-chuanyu",  "normal", 3, "dn",  ["暖胃","解馋","下饭"],   4, 3, "takeout",    "sfln"],
];

// —— 展开一行为完整候选对象 ——
// emoji（展示字段，可后续调整；id 才是引用契约，不随 emoji/name 变）。
// 关键词兜底，保证任何菜都有 emoji；个别精确覆盖放前面。
const EMOJI_EXACT = {
  "北京烤鸭": "🦆", "日式特上寿司": "🍣", "日式刺身拼盘": "🍣", "日式鳗鱼三吃": "🍱",
  "白灼基围虾": "🦐", "泰式帝王虾": "🦐", "泰式咖喱蟹": "🦀", "新加坡黑胡椒蟹": "🦀",
  "日式蟹肉火锅": "🦀", "剁椒鱼头": "🐟", "大理酸辣鱼": "🐟", "水煮鱼": "🐟",
  "葱烧海参": "🦑", "韩式辣炒鱿鱼盖饭": "🦑", "西班牙海鲜饭": "🥘", "泰式冬阴功海鲜面": "🍜",
  "茶叶蛋": "🥚", "咸豆浆": "🥛", "白粥配小菜": "🍚", "皮蛋豆腐": "🍢",
};
function pickEmoji(name, cuisine, kind) {
  if (EMOJI_EXACT[name]) return EMOJI_EXACT[name];
  const rules = [
    [/拉面|乌冬|叻沙|米线|河粉|炒面|汤面|阳春面|泡馍|米粉|馄饨|冬阴功/, "🍜"],
    [/寿司/, "🍣"], [/炸鸡/, "🍗"], [/牛排/, "🥩"], [/汉堡|肉堡/, "🍔"],
    [/披萨/, "🍕"], [/意面|帕尼尼|千层面/, "🍝"], [/三明治|贝果|吐司|法包|面包/, "🥪"],
    [/咖喱/, "🍛"], [/沙拉|凯撒卷/, "🥗"], [/卷饼|卷$|春卷/, "🌯"], [/塔可/, "🌮"],
    [/烤鸭|烧鸡|烤鸡|白切鸡|口水鸡|三杯鸡|滑鸡|参鸡|照烧鸡/, "🍗"],
    [/羊|烤肉|五花|烧肉|牛小排|排骨|肋/, "🍖"], [/虾/, "🦐"], [/蟹/, "🦀"], [/鱼/, "🐟"],
    [/豆腐/, "🍲"], [/粥/, "🍚"], [/饺|包子|馍/, "🥟"], [/煎饼|饼|华夫/, "🥞"],
    [/盖饭|炒饭|卤肉饭|拌饭|时雨煮饭|茶泡饭|煲仔饭|海南鸡饭|焗饭|丼/, "🍚"],
    [/汤|锅|煲|炖/, "🍲"], [/蛋/, "🥚"], [/面$/, "🍜"],
  ];
  for (const [re, e] of rules) if (re.test(name)) return e;
  const famEmoji = { chinese: "🥢", western: "🍽️", jpkr: "🍱", exotic: "🌍" };
  return famEmoji[FAMILY_OF[cuisine]] ?? "🍽️";
}

function expand(row) {
  const [id, name, cuisine, priceTier, spicy, meals, tags, satiety, indulgence, convenience, occasion, canonicalGroup] = row;
  const cs = CUISINE_SEARCH[cuisine];
  if (!cs) throw new Error(`未知 cuisine: ${cuisine}（${name}）`);
  const family = FAMILY_OF[cuisine];
  if (!family) throw new Error(`cuisine 无 family 映射: ${cuisine}（${name}）`);
  const obj = {
    // id：稳定引用契约。在 ROWS 里固化为字面量，绝不由 name 计算（防 churn）。
    id,
    name,
    // emoji：展示字段，可后续改；不影响 id。
    emoji: pickEmoji(name, cuisine),
    cuisine,
    // family 不落库（由 familyOf 推导，spec §1.1）；此处仅供草案统计用，落库脚本须丢弃
    _family: family,
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
    // gateQuery = keywordOf 等价值 = shopKeyword ?? 菜系店类型词（§2）；有 shopKeyword 时以它为门控词。
    search: {
      gateQuery: SHOP_KEYWORD[name] ?? cs.gate,
      displayQuery: name,
      fallbackQueries: cs.fb,
    },
  };
  // shopKeyword（§2.1 方案 A 变体）：店型/品类词，仅宽泛回退或专门店型品类的菜显式补。
  if (SHOP_KEYWORD[name]) obj.shopKeyword = SHOP_KEYWORD[name];
  if (canonicalGroup) obj.canonicalGroup = canonicalGroup;
  return obj;
}

const dishes = ROWS.map(expand);

// 载入现有 foods.ts 的 id 集合，供新 id 撞名校验（landing 前就拦下）
const EXISTING_IDS = new Set(
  [...readFileSync(new URL("../src/config/foods.ts", import.meta.url), "utf8")
    .matchAll(/^\s{4}id:\s*"([^"]+)"/gm)].map((m) => m[1])
);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ─────────────────────────────────────────────
// 自检（fix 3：枚举/短码/范围/search 结构/乱码/canonicalGroup/layer + id/emoji 全查）
// ─────────────────────────────────────────────
const errs = [];
const seenNames = new Set();
const seenIds = new Set();
const alreadyLanded = []; // 已在 foods.ts 的 id（正常：136 首批 + 后续已落库；land 脚本按 id 幂等跳过）
const hasMojibake = (s) => typeof s === "string" && s.includes("�");
const LAYER = new Set(["meal", "side"]);

for (const d of dishes) {
  const at = `[${d.name || "??"}]`;
  // id 契约校验：存在 / kebab-ASCII / 本批唯一。
  // 注：草案 id 撞 foods.ts 不再是错误——首批 136 已落库，草案与 foods.ts 天然重叠；
  //     真正的“新增 vs 已落库”幂等判定交给 land-dishes.mjs（按 id 跳过已存在项）。
  if (!d.id) errs.push(`${at} 缺 id`);
  else {
    if (!KEBAB.test(d.id)) errs.push(`${at} id 非 kebab-ASCII: ${d.id}`);
    if (seenIds.has(d.id)) errs.push(`${at} id 本批重复: ${d.id}`);
    seenIds.add(d.id);
    if (EXISTING_IDS.has(d.id)) alreadyLanded.push(d.id);
  }
  if (!d.emoji) errs.push(`${at} 缺 emoji`);
  if (hasMojibake(d.emoji)) errs.push(`${at} emoji 含乱码`);
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
  // shopKeyword 底线（§2.1 方案 A 变体）：
  //   宽泛回退 cuisine 或专门店型品类名 → 必须显式补；且 shopKeyword 不得等于菜名（菜名会 fail-closed）
  if (shopKwRequired(d) && !d.shopKeyword)
    errs.push(`${at} 需要 shopKeyword（cuisine=${d.cuisine} 回退过宽或含专门店型品类词），落库会偏虚`);
  if (d.shopKeyword && d.shopKeyword === d.name)
    errs.push(`${at} shopKeyword 不得等于菜名（应为店型/品类词，否则查店 fail-closed）`);
  if (hasMojibake(d.shopKeyword)) errs.push(`${at} shopKeyword 含乱码`);
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
const families = ["chinese", "western", "jpkr", "exotic"];
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

// —— 按 family 的 meal 缺口看板（对齐 spec §4.0；本批产出 vs 目标）——
const TARGET_MEAL = { chinese: 49, western: 29, jpkr: 27, exotic: 24 };
const familyBoard = {};
for (const fam of families) {
  const famMeal = mealLayer.filter((d) => d._family === fam);
  const famSide = sideLayer.filter((d) => d._family === fam);
  const achieved = famMeal.length;
  const target = TARGET_MEAL[fam];
  familyBoard[fam] = {
    targetMeal: target,
    achievedMealThisBatch: achieved,
    remainingMeal: Math.max(0, target - achieved),
    mealByPrice: Object.fromEntries(prices.map((p) => [p, famMeal.filter((d) => d.priceTier === p).length])),
    sideExtra: famSide.length,
  };
}
// 本批涉及的 family（有产出的）
const batchFamilies = families.filter((f) => dishes.some((d) => d._family === f));
const totalRemaining = families.reduce((s, f) => s + familyBoard[f].remainingMeal, 0);

// —— 餐段(meal-segment) 缺口看板（对齐 spec §7 lint 硬门槛；tea 不设硬指标，见 §4.2）——
// baseline 动态从 foods.ts 真实 default-pickable 计算（排除本草案 id，避免与已落库项双算）。
// 这样 coveredNow = 存量(非本草案) + 本草案 meal 命中 = 全库真实投影，S3 落库后不会再失真。
// 目的：防止 family×price 达标但餐段 lint（早≥40/午≥120/晚≥140/宵≥70）失败——尤其 midnight。
const SEG = ["breakfast", "lunch", "dinner", "midnight"]; // tea 不参与硬指标
const SEG_TARGET = { breakfast: 40, lunch: 120, dinner: 140, midnight: 70 };
// 解析 foods.ts，取真实 default-pickable（kind main & dish & pickLayer meal）且 id 不在本草案
const _foodsSrc = readFileSync(new URL("../src/config/foods.ts", import.meta.url), "utf8");
const _draftIds = new Set(dishes.map((d) => d.id));
const _stockPool = _foodsSrc.split(/\n  \{/).slice(1).map((b) => b.split(/\n  \},?/)[0]).map((b) => {
  const g = (k) => (b.match(new RegExp(`\\b${k}: "([^"]+)"`)) || [])[1];
  const meals = (b.match(/\bmeals: \[([^\]]*)\]/) || [, ""])[1];
  return { id: g("id"), kind: g("kind"), et: g("entityType"), layer: g("pickLayer"), meals };
}).filter((r) => r.id && !_draftIds.has(r.id) && r.kind === "main" && r.et === "dish" && r.layer === "meal");
const SEG_BASELINE = Object.fromEntries(SEG.map((seg) =>
  [seg, _stockPool.filter((r) => r.meals.includes(`"${seg}"`)).length]));
const mealRemaining = {};
for (const seg of SEG) {
  const thisBatchHit = mealLayer.filter((d) => d.meals.includes(seg)).length;
  const covered = SEG_BASELINE[seg] + thisBatchHit;
  mealRemaining[seg] = {
    target: SEG_TARGET[seg],
    baseline: SEG_BASELINE[seg],
    thisBatchMealHits: thisBatchHit,
    coveredNow: covered,
    remaining: Math.max(0, SEG_TARGET[seg] - covered),
  };
}
const segTotalRemaining = SEG.reduce((s, seg) => s + mealRemaining[seg].remaining, 0);

const out = {
  _meta: {
    purpose: "dish 候选菜草案（脚本生成），供 user + Codex 审后落 foods.ts",
    generated: new Date().toISOString().slice(0, 10),
    batch: `${batchFamilies.join("+")}（本批 meal ${mealLayer.length} / side ${sideLayer.length}）`,
    gapBasis: "meal-only 且按'菜数'计：缺口只统计 pickLayer=meal；side 是额外产出，不占配额（spec §4/§4.1）。收尾判据=meal 净增达标，非行数。",
    gapTargetMeal: { ...TARGET_MEAL, total: 129 },
    familyBoard,   // 每 family：目标/本批达成/剩余 meal 缺口/meal 价位分布/side 额外
    remainingMealAllFamilies: totalRemaining,  // >0 表示整体 meal 未补齐，禁止按行数收尾
    mealRemaining, // 每餐段(早/午/晚/宵)：目标/存量/本批命中/已覆盖/剩余缺口（对齐 spec §4 餐段最低标准）
    segRemainingTotal: segTotalRemaining,  // 餐段缺口总和；>0 说明还需按餐段补（尤其 midnight），否则餐段 lint 会红
    teaPolicy: "tea 不列入 meal-only 硬指标；下午茶走 side/drink 池，取池见 §3.1 foodsByMealForSinglePick（仅水占）。本批 tea meal=0 属预期。",
    thisBatchRows: dishes.length,
    priceDistributionAll: byPrice,
    priceDistributionMealLayer: mealByPrice,
    layerDistribution: byLayer,
    mealHitsMealLayerOnly: byMeal,
    sideItems: sideNames,
    shopKeywordCount: dishes.filter((d) => d.shopKeyword).length,
    shopKeywordMap: Object.fromEntries(dishes.filter((d) => d.shopKeyword).map((d) => [d.name, d.shopKeyword])),
    reviewStatus: "DRAFT — 待审：命名/口味真实性 / spicy / priceTier 归档 / meals 合理性 / canonicalGroup / side 层归类",
    notes: [
      "family 不写进落库对象，由 cuisine→familyOf 推导（草案里 _family 仅供统计，落库脚本须丢弃）。",
      "emoji 落库时定，草案不含。",
      "search 为嵌套对象 {gateQuery,displayQuery,fallbackQueries}；gateQuery 对齐现有 keywordOf(=shopKeyword??cuisineKeyword)，Phase 1 运行时零改动。",
      `shopKeyword（§2.1 方案 A 变体）：仅给回退过宽/专门店型品类的菜补【店型词】，本批 ${dishes.filter((d) => d.shopKeyword).length} 道（见 shopKeywordMap）。中式细分菜系不补，走 cuisineKeyword。落库 lint 强制：宽泛 cuisine 或含拉面/炸鸡/牛排/寿司/烧烤等品类词的菜必须有 shopKeyword，且不得等于菜名（防 fail-closed）。`,
      `pickLayer=side（satiety<3）不进默认单菜池，落库映射为 side 层；本批 side ${sideNames.length} 项：${sideNames.join("/")}。`,
      "缺口口径 = meal-only：本批 " + dishes.length + " 行中仅 " + mealLayer.length + " 计入 meal 缺口，side " + sideLayer.length + " 不计（见 familyBoard.*.mealByPrice）。",
      `family 缺口看板见 familyBoard：${families.map((f) => `${f} 剩${familyBoard[f].remainingMeal}`).join(" / ")}。remainingMealAllFamilies=${totalRemaining}（>0 禁止收尾）。`,
      `餐段缺口见 mealRemaining（不含 tea）：${SEG.map((s) => `${s} 剩${mealRemaining[s].remaining}`).join(" / ")}。segRemainingTotal=${segTotalRemaining}——下一批(jpkr/exotic)须重点覆盖 midnight/breakfast，否则餐段 lint 会红。`,
      "treat 全为具体菜，无火锅/烧烤/烤肉/品牌。",
      "treat 质量门不惩罚「清淡」，只看 indulgence / satiety / 「健康轻食」——白灼基围虾这类清爽高质量菜保留在 treat 桶（fix 5，对齐 spec §5.3）。",
      "tea meal=0 是预期（非缺陷）：下午茶不走 meal-only，由后续 side/drink 池补供给（spec §4.2 / §3.1 foodsByMealForSinglePick，仅水占）。",
    ],
  },
  // 落库对象：剥离 _family（仅统计用，不入库）
  dishes: dishes.map(({ _family, ...rest }) => rest),
};

fs.writeFileSync(
  path.join(process.cwd(), "docs", "archive", "dish-candidates.draft.json"),
  JSON.stringify(out, null, 2) + "\n",
);

// —— review 表（markdown）——
const esc = (s) => String(s).replace(/\|/g, "\\|");
const cols = ["id","emoji","name","_family","cuisine","priceTier","pickLayer","meals","spicy","tags","satiety","indulgence","convenience","occasion","shopKeyword","gateQuery","displayQuery","canonicalGroup"];
let md = `# 候选菜 review 表（${batchFamilies.join("+")}，共 ${dishes.length} 行）\n\n`;
md += `> 审阅重点：命名真实性 / 口味(spicy) / 价位归档 / 餐段合理性 / treat 是否够犒劳 / side 层归类 / canonicalGroup 归并。\n`;
md += `> 层级：meal ${byLayer.meal} · side ${byLayer.side}（**缺口只算 meal 层**）\n`;
md += `> meal 层价位（计入缺口）：budget ${mealByPrice.budget} · normal ${mealByPrice.normal} · treat ${mealByPrice.treat}\n`;
md += `> 餐段命中（仅 meal 层，本批）：早 ${byMeal.breakfast} / 午 ${byMeal.lunch} / 茶 ${byMeal.tea} / 晚 ${byMeal.dinner} / 宵 ${byMeal.midnight}\n`;
md += `> family meal 缺口：${families.map((f) => `${f} 达成${familyBoard[f].achievedMealThisBatch}/${familyBoard[f].targetMeal}(剩${familyBoard[f].remainingMeal})`).join(" · ")}\n`;
md += `> 餐段剩余缺口（存量+本批 vs 目标，不含 tea）：${SEG.map((s) => `${s} ${mealRemaining[s].coveredNow}/${mealRemaining[s].target}(剩${mealRemaining[s].remaining})`).join(" · ")} —— 合计剩 ${segTotalRemaining}\n`;
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
fs.writeFileSync(path.join(process.cwd(), "docs", "archive", "dish-candidates.review.md"), md);

console.log(`✓ 生成 ${dishes.length} 行候选（${batchFamilies.join("+")}）`);
console.log(`  价位(全): budget ${byPrice.budget} / normal ${byPrice.normal} / treat ${byPrice.treat}`);
console.log(`  层级: meal ${byLayer.meal} / side ${byLayer.side}`);
console.log(`  餐段命中(meal层): 早${byMeal.breakfast} 午${byMeal.lunch} 茶${byMeal.tea}(不设硬指标) 晚${byMeal.dinner} 宵${byMeal.midnight}`);
console.log("  —— family meal 缺口看板 ——");
for (const fam of families) {
  const b = familyBoard[fam];
  const mp = b.mealByPrice;
  const mark = b.remainingMeal > 0 ? "⚠" : "✓";
  console.log(`  ${mark} ${fam}: meal ${b.achievedMealThisBatch}/${b.targetMeal}（b${mp.budget}/n${mp.normal}/t${mp.treat}）剩${b.remainingMeal} · side额外${b.sideExtra}`);
}
console.log(totalRemaining > 0
  ? `  ⚠ 全 family 仍差 ${totalRemaining} 道 meal（勿按行数收尾）`
  : `  ✓ 全 family meal 达标`);
console.log("  —— 餐段(meal-segment) 缺口看板（存量+本批 vs 目标，不含 tea）——");
const SEG_CN = { breakfast: "早餐", lunch: "午饭", dinner: "晚饭", midnight: "宵夜" };
for (const seg of SEG) {
  const r = mealRemaining[seg];
  const mark = r.remaining > 0 ? "⚠" : "✓";
  console.log(`  ${mark} ${SEG_CN[seg]}: ${r.coveredNow}/${r.target}（存量${r.baseline}+本批${r.thisBatchMealHits}）剩${r.remaining}`);
}
console.log(segTotalRemaining > 0
  ? `  ⚠ 餐段合计仍差 ${segTotalRemaining}（下一批须重点覆盖 midnight/breakfast，否则餐段 lint 会红）`
  : `  ✓ 餐段全部达标`);
console.log(`  → docs/archive/dish-candidates.draft.json + docs/archive/dish-candidates.review.md`);
