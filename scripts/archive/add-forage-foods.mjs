// 一次性数据注入脚本：把觅食清单里缺失的项补进 src/config/foods.ts
// 带去重保护（按 name 跳过已存在项），可重复运行。
// 用法：node scripts/add-forage-foods.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FOODS = join(dirname(fileURLToPath(import.meta.url)), "..", "src/config/foods.ts");

// 字段：[id, name, emoji, kind, meals[], tags[], recommend, description]
// 合法 tags: 高热量 清淡 适合宿舍 快手 下饭 健康轻食 暖胃 高蛋白 解馋 省钱 提神 续命 解腻
// meals: breakfast lunch tea dinner midnight
const NEW = [
  // ── 一、快餐简餐 ──
  ["longjiang-pig-feet-rice","隆江猪脚饭","🍖","main",["lunch","dinner"],["下饭","高热量","解馋"],4,"猪脚配卤汁淋米饭，胶质满满一整天的元气。"],
  ["xiangxi-bucket-rice","湘西木桶饭","🍚","main",["lunch","dinner"],["下饭","解馋"],4,"木桶蒸饭带饭香，配菜随便挑，干饭人友好。"],
  ["suancaiyu-rice","酸菜鱼米饭","🐟","main",["lunch","dinner"],["下饭","解馋","暖胃"],4,"酸辣开胃，鱼片嫩滑，汤泡饭能炫两碗。"],
  ["japanese-beef-rice","日式肥牛饭","🍱","main",["lunch","dinner"],["下饭","高蛋白","解馋"],4,"洋葱肥牛盖热饭，甜咸酱汁直击灵魂。"],
  ["bibimbap","韩式石锅拌饭","🍲","main",["lunch","dinner"],["下饭","解馋"],4,"石锅滋滋响，拌开是焦香锅巴的快乐。"],
  ["curry-chicken-rice","咖喱鸡肉饭","🍛","main",["lunch","dinner"],["下饭","解馋","高热量"],4,"浓郁咖喱裹鸡块，浇饭一绝。"],
  ["mcdonalds","麦当劳","🍟","main",["lunch","dinner","midnight"],["高热量","解馋","快手"],4,"巨无霸加薯条，资本主义の快乐套餐。"],
  ["kfc","肯德基","🍗","main",["lunch","dinner","midnight"],["高热量","解馋","快手"],4,"疯狂星期四，V 我 50 的精神图腾。"],
  ["burger-king","汉堡王","🍔","main",["lunch","dinner","midnight"],["高热量","解馋"],3,"火烤厚牛肉饼，大口咬下去最爽。"],
  ["wallace","华莱士","🍗","main",["lunch","dinner","midnight"],["高热量","解馋","省钱"],3,"平价炸鸡汉堡，钱包友好的快乐。"],
  ["tastien","塔斯汀中国汉堡","🍔","main",["breakfast","lunch","dinner"],["解馋","快手","高热量"],4,"现烤手擀堡胚，中式馅料卷出新花样。"],
  ["saizeriya","萨莉亚","🍝","main",["lunch","dinner"],["解馋","省钱"],4,"平价意式，几块钱一盘，学生聚餐天选。"],
  ["beijing-zhajiang-noodle","老北京炸酱面","🍜","main",["lunch","dinner"],["下饭","解馋"],4,"一勺炸酱拌到底，菜码越多越带劲。"],
  ["shaanxi-youpo-noodle","陕西油泼面","🍜","main",["lunch","dinner"],["解馋","下饭","高热量"],5,"滚油泼辣子那一声刺啦，香到跺脚。"],
  ["shanxi-knife-noodle","山西刀削面","🍜","main",["lunch","dinner"],["暖胃","解馋"],4,"中厚边薄，棱锋分明，浇头管够。"],
  ["tonkotsu-ramen","日式豚骨拉面","🍜","main",["lunch","dinner","midnight"],["暖胃","解馋","高热量"],4,"奶白浓汤配溏心蛋，一口入魂。"],
  ["hunan-beef-noodle","湖南牛肉粉","🍜","main",["breakfast","lunch","dinner"],["暖胃","解馋","下饭"],4,"红汤米粉嗦一碗，辣得通透又满足。"],
  ["crossing-bridge-noodle","云南过桥米线","🍲","main",["lunch","dinner"],["暖胃","清淡","解馋"],4,"滚汤现烫食材，仪式感拉满的一碗。"],
  ["huainan-beef-soup","淮南牛肉汤","🍲","main",["breakfast","lunch","dinner"],["暖胃","高蛋白","清淡"],4,"咸鲜牛肉汤泡粉丝，早晨来一碗暖到脚。"],
  ["turkish-kebab-rice","土耳其烤肉饭","🥙","main",["lunch","dinner","midnight"],["解馋","高热量","下饭"],3,"现削烤肉铺米饭，异域香料拉满。"],
  ["shaxian-snack","沙县小吃","🥟","main",["breakfast","lunch","dinner","midnight"],["省钱","快手","暖胃"],4,"拌面+蒸饺+炖罐，学生党的全天候食堂。"],
  ["laoxiangji","老乡鸡","🐔","main",["lunch","dinner"],["清淡","健康轻食","下饭"],4,"肥西老母鸡汤打底，家常快餐之光。"],

  // ── 二、地方菜堂食 ──
  ["xiang-stirfry","湘菜小炒","🌶️","main",["lunch","dinner"],["下饭","解馋","高热量"],5,"小炒黄牛肉那类，镬气加辣椒，下饭杀手。"],
  ["huiguorou","回锅肉","🥓","main",["lunch","dinner"],["下饭","解馋","高热量"],5,"灯盏窝五花配蒜苗，川菜里的米饭刺客。"],
  ["mapo-tofu","麻婆豆腐","🌶️","main",["lunch","dinner"],["下饭","解馋","暖胃"],4,"麻辣烫嘴，一块豆腐配半碗饭。"],
  ["northeast-iron-pot","东北铁锅炖","🍲","main",["dinner"],["暖胃","解馋","下饭"],4,"大锅炖鱼贴饼子，一家人围着造。"],
  ["shrimp-dumpling","粤式虾饺","🥟","main",["breakfast","tea","lunch"],["清淡","解馋"],4,"晶莹剔透三只虾，早茶里的颜值担当。"],
  ["siumai","粤式烧卖","🥟","main",["breakfast","tea","lunch"],["解馋","下饭"],3,"皮薄馅大一口一个，配茶刚刚好。"],
  ["jiangzhe-stirfry","江浙小炒","🥢","main",["lunch","dinner"],["清淡","下饭"],3,"浓油赤酱偏甜口，温柔的家常味。"],
  ["dapanji","大盘鸡","🍗","main",["dinner"],["解馋","下饭","高热量"],5,"鸡块土豆配皮带面，新疆豪迈一大盘。"],
  ["hand-grabbed-lamb","手抓羊肉","🍖","main",["dinner"],["高蛋白","解馋","暖胃"],4,"原汁原味大块羊肉，蘸椒盐过瘾。"],
  ["tom-yum-soup","泰式冬阴功汤","🍤","main",["lunch","dinner"],["暖胃","解腻","解馋"],4,"酸辣鲜香带椰香，开胃到停不下来。"],
  ["korean-fried-chicken","韩式炸鸡","🍗","main",["dinner","midnight"],["高热量","解馋"],4,"甜辣酱裹脆皮，配啤酒就是炸鸡啤酒局。"],
  ["yakitori","日式烧鸟","🍢","main",["dinner","midnight"],["解馋","高蛋白"],3,"炭火鸡肉串撒椒盐，居酒屋小酌伴侣。"],
  ["maoxuewang","重庆毛血旺","🌶️","main",["lunch","dinner"],["高热量","解馋","下饭"],4,"红油翻滚一大盆，麻辣鲜烫够刺激。"],

  // ── 三、火锅冒菜 ──
  ["sichuan-hotpot","四川麻辣火锅","🍲","main",["dinner","midnight"],["高热量","解馋","暖胃"],5,"牛油锅底九宫格，麻辣鲜香涮一切。"],
  ["chaoshan-beef-hotpot","潮汕牛肉火锅","🐮","main",["dinner"],["高蛋白","清淡","暖胃"],4,"清汤涮现切牛肉，几秒一夹鲜到眉毛。"],
  ["beijing-copper-hotpot","老北京铜锅涮肉","🍲","main",["dinner"],["暖胃","高蛋白","解馋"],4,"清汤铜锅手切羊肉，麻酱蘸料是灵魂。"],
  ["chuanchuan","九宫格串串香","🍢","main",["dinner","midnight"],["解馋","高热量","下饭"],4,"一把签子涮到爽，按签结账有内味儿。"],
  ["frog-fish-hotpot","美蛙鱼头火锅","🐸","main",["dinner"],["解馋","高蛋白","暖胃"],4,"嫩蛙加鱼头，麻辣锅里的双拼快乐。"],
  ["zhuduji-hotpot","猪肚鸡火锅","🍲","main",["dinner"],["暖胃","清淡","高蛋白"],4,"胡椒猪肚鸡汤，养胃又鲜，秋冬首选。"],
  ["guizhou-sour-hotpot","贵州酸汤牛肉火锅","🍲","main",["dinner"],["暖胃","解腻","高蛋白"],4,"红酸汤开胃，番茄木姜子香气独特。"],
  ["rotary-hotpot","旋转小火锅","🍲","main",["lunch","dinner","midnight"],["解馋","快手","暖胃"],3,"一人食友好，转盘夹菜按碟算钱。"],
  ["gutang-maocai","骨汤冒菜","🥣","main",["lunch","dinner","midnight"],["暖胃","解馋","下饭"],4,"一个人的麻辣烫升级版，连汤带菜一大碗。"],
  ["yangguofu","杨国福麻辣烫","🌶️","main",["lunch","dinner","midnight"],["解馋","暖胃","下饭"],4,"自选食材称重，麻酱一拌就是命。"],
  ["zhangliang","张亮麻辣烫","🌶️","main",["lunch","dinner","midnight"],["解馋","暖胃","下饭"],4,"和杨国福のCP，红油白汤各有所爱。"],

  // ── 四、烧烤烤肉 ──
  ["northeast-bbq","东北烧烤","🍢","main",["dinner","midnight"],["解馋","高热量","下饭"],5,"烤蒜烤生蚝烤里脊，啤酒整起来。"],
  ["chinese-charcoal-skewer","中式炭烤串","🍢","main",["dinner","midnight"],["解馋","高热量"],4,"孜然辣椒面撒满，深夜路边的香味源头。"],
  ["korean-bbq","韩式烤肉","🥓","main",["dinner"],["高热量","解馋","高蛋白"],4,"五花肉生菜包，自助烤桌前的社交。"],
  ["japanese-yakiniku","日式烧肉","🥩","main",["dinner"],["高蛋白","解馋","高热量"],4,"和牛轻烤蘸酱，入口即化的奢侈。"],
  ["clay-stove-bbq","泥炉烤肉","🔥","main",["dinner","midnight"],["解馋","高热量"],3,"炭火泥炉自己烤，烟火气十足。"],
  ["wanzhou-grilled-fish","万州烤鱼","🐟","main",["dinner","midnight"],["解馋","下饭","高热量"],4,"先烤后炖，麻辣鱼配配菜，宵夜顶配。"],
  ["wushan-grilled-fish","巫山烤鱼","🐟","main",["dinner","midnight"],["解馋","下饭"],4,"重庆风味烤鱼，麻辣鲜香一整条。"],
  ["paper-wrapped-fish","纸包鱼","🐟","main",["dinner"],["解馋","暖胃","下饭"],3,"锡纸锁住汤汁，鲜辣不柴。"],
  ["garlic-crayfish","蒜香小龙虾","🦐","main",["dinner","midnight"],["解馋","高蛋白"],4,"蒜香不辣版小龙虾，剥到停不下手。"],
  ["self-bbq-buffet","自助烤肉","🍖","main",["dinner"],["高热量","解馋","高蛋白"],3,"放开了造，回本就靠这一顿。"],

  // ── 五、轻食减脂 ──
  ["chicken-salad","香煎鸡胸肉沙拉","🥗","main",["lunch","tea","dinner"],["健康轻食","高蛋白","清淡"],3,"减脂期の体面，煎香鸡胸配满碗蔬菜。"],
  ["subway","赛百味三明治","🥪","main",["breakfast","lunch","tea"],["健康轻食","快手","清淡"],3,"自选蔬菜现做，可咸可健康。"],
  ["sanxian-oden","三鲜关东煮","🍢","main",["lunch","dinner","midnight"],["清淡","暖胃","解馋"],3,"萝卜鱼丸海带结，便利店暖胃小食。"],
  ["beef-brown-rice","低卡牛肉糙米饭","🍚","main",["lunch","dinner"],["健康轻食","高蛋白","清淡"],3,"糙米配瘦牛肉，增肌减脂两不误。"],
  ["poke-bowl","波奇饭","🥗","main",["lunch","tea"],["健康轻食","清淡","高蛋白"],3,"生鱼蔬菜拌饭，夏威夷风的轻盈。"],
  ["familymart-bento","全家轻食便当","🍱","main",["breakfast","lunch","dinner"],["快手","健康轻食","清淡"],3,"加热即食，赶时间的便利店救场。"],
  ["lawson-bento","罗森轻食便当","🍱","main",["breakfast","lunch","dinner"],["快手","健康轻食","清淡"],3,"饭团便当一应俱全，深夜也有暖光。"],

  // ── 六、甜品饮品 ──
  ["coconut-latte","生椰拿铁","🥥","drink","DRINK",["breakfast","lunch","tea"],["提神","解馋"],5,"椰香裹咖啡，打工人的当代续命水。"],
  ["yashixiang-lemon-tea","鸭屎香柠檬茶","🍋","drink","DRINK",["lunch","tea","dinner"],["解腻","提神","解馋"],5,"鸭屎香单丛打底，茶香柠檬香双绝。"],
  ["handmade-lemon-tea","手打柠檬茶","🍋","drink","DRINK",["lunch","tea","dinner","midnight"],["解腻","提神","解馋"],4,"捶打出柠檬精油，酸爽直冲天灵盖。"],
  ["fresh-juice","鲜榨纯果汁","🧃","drink","DRINK",["breakfast","tea"],["健康轻食","解腻","清淡"],3,"无添加现榨，维C满满一整杯。"],
  ["shuangpinai","广式双皮奶","🥛","main",["tea","midnight"],["解馋","清淡","暖胃"],4,"奶皮嫩滑入口即化，糖水铺の经典。"],
  ["jiangzhuangnai","姜撞奶","🥛","main",["tea","midnight"],["暖胃","解馋","清淡"],3,"姜汁撞热奶凝成冻，暖胃驱寒小甜品。"],
  ["grass-jelly","烧仙草","🍮","main",["tea","midnight"],["解馋","解腻"],4,"Q弹仙草配料满满，夏天一碗透心凉。"],
  ["iced-tangyuan","冰汤圆","🍡","main",["tea","midnight"],["解馋","解腻"],3,"小圆子加冰糖水，甜糯清凉。"],
  ["craft-beer","精酿啤酒","🍺","drink","DRINK",["dinner","midnight"],["解腻","解馋","续命"],4,"花果香浓郁，配烧烤小龙虾绝配。"],
  ["fruit-wine","果酒","🍷","drink","DRINK",["dinner","midnight"],["解馋","解腻"],3,"微醺果香，小酌不上头。"],

  // ── 七、街头小吃 ──
  ["tujia-sauce-cake","土家酱香饼","🫓","main",["breakfast","tea","lunch"],["解馋","省钱","快手"],4,"刷满酱料层层酥，街边香味放大器。"],
  ["thousand-layer-cake","千层饼","🫓","main",["breakfast","tea"],["解馋","省钱","快手"],3,"层层起酥咬下掉渣，越嚼越香。"],
  ["meigancai-kuilei","梅干菜锅盔","🫓","main",["breakfast","tea","lunch"],["解馋","省钱"],3,"梅干菜肉碳炉烤脆，外焦里香。"],
  ["changsha-stinky-tofu","长沙臭豆腐","🧆","main",["tea","dinner","midnight"],["解馋","下饭"],4,"闻着臭吃着香，黑色诱惑配蒜蓉汁。"],
  ["chicken-strips","无骨鸡柳","🍗","main",["tea","dinner","midnight"],["解馋","高热量","快手"],4,"现炸鸡柳撒椒盐，逛街边走边吃。"],
  ["yansuji","盐酥鸡","🍗","main",["tea","dinner","midnight"],["解馋","高热量"],4,"九层塔小块炸鸡，台式夜市の魂。"],
  ["honey-gluten","蜜汁烤面筋","🍢","main",["tea","dinner","midnight"],["解馋","省钱"],3,"甜辣酱刷烤面筋，一串接一串。"],
  ["red-bean-pie","红豆派","🥧","main",["tea","midnight"],["解馋"],3,"酥皮裹红豆沙，热乎乎的甜。"],
];

const src = readFileSync(FOODS, "utf8");

// 已存在的 name 集合（去重保护）
const existing = new Set([...src.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]));

const esc = (s) => s; // 内容已是安全字面量
const fmtArr = (a) => "[" + a.map((x) => `"${x}"`).join(", ") + "]";

function block([id, name, emoji, kind, mealsOrFlag, ...rest]) {
  // drink 行多一个 "DRINK" 占位以对齐，统一解析
  let meals, tags, recommend, description;
  if (mealsOrFlag === "DRINK") {
    [meals, tags, recommend, description] = rest;
  } else {
    meals = mealsOrFlag;
    [tags, recommend, description] = rest;
  }
  return `  {
    id: "${id}",
    name: "${name}",
    emoji: "${emoji}",
    kind: "${kind}",
    tags: ${fmtArr(tags)},
    meals: ${fmtArr(meals)},
    recommend: ${recommend},
    description: "${description}",
  },`;
}

const toAdd = NEW.filter((r) => !existing.has(r[1]));
const mains = toAdd.filter((r) => r[3] === "main").map(block).join("\n");
const drinks = toAdd.filter((r) => r[3] === "drink").map(block).join("\n");

let out = src;

// 主食插在「饮品 drink」分区注释前；用最后一处该注释作为锚点
const DRINK_MARKER = "  // ===== 饮品 drink =====";
if (mains) {
  const idx = out.lastIndexOf(DRINK_MARKER);
  if (idx === -1) throw new Error("找不到饮品分区锚点");
  out = out.slice(0, idx) + mains + "\n\n" + out.slice(idx);
}

// 饮品插在数组闭合 `];` 前（mainFoods 定义之前那个）
if (drinks) {
  const closeIdx = out.indexOf("\n];");
  if (closeIdx === -1) throw new Error("找不到数组闭合锚点");
  out = out.slice(0, closeIdx) + "\n" + drinks + out.slice(closeIdx);
}

writeFileSync(FOODS, out, "utf8");

console.log(`清单总数 ${NEW.length}，已存在跳过 ${NEW.length - toAdd.length}，新增 ${toAdd.length}`);
console.log(`  主食 +${toAdd.filter((r) => r[3] === "main").length}，饮品 +${toAdd.filter((r) => r[3] === "drink").length}`);
