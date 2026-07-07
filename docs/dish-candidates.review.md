# 候选菜 review 表（chinese+western+jpkr+exotic，共 154 行）

> 审阅重点：命名真实性 / 口味(spicy) / 价位归档 / 餐段合理性 / treat 是否够犒劳 / side 层归类 / canonicalGroup 归并。
> 层级：meal 147 · side 7（**缺口只算 meal 层**）
> meal 层价位（计入缺口）：budget 49 · normal 66 · treat 32
> 餐段命中（仅 meal 层，本批）：早 21 / 午 92 / 茶 0 / 晚 127 / 宵 55
> family meal 缺口：chinese 达成63/49(剩0) · western 达成31/29(剩0) · jpkr 达成28/27(剩0) · exotic 达成25/24(剩0)
> 餐段剩余缺口（存量+本批 vs 目标，不含 tea）：breakfast 40/40(剩0) · lunch 158/120(剩0) · dinner 192/140(剩0) · midnight 70/70(剩0) —— 合计剩 0
> tea meal=0 是预期：下午茶不走 meal-only，由后续 side/drink 池补供给（spec §4.2 / §3.1）。

| id | emoji | name | _family | cuisine | priceTier | pickLayer | meals | spicy | tags | satiety | indulgence | convenience | occasion | shopKeyword | gateQuery | displayQuery | canonicalGroup |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cn-plain-congee-sides | 🍚 | 白粥配小菜 | chinese | cn-generic | budget | side | breakfast | 0 | 清淡/省钱/暖胃 | 2 | 1 | canteen | solo/quick |  | 家常菜 | 白粥配小菜 |  |
| cn-tea-egg | 🥚 | 茶叶蛋 | chinese | cn-generic | budget | side | breakfast/midnight | 0 | 省钱/快手 | 1 | 1 | convenience | solo/quick/lateNight |  | 家常菜 | 茶叶蛋 |  |
| cn-pork-veggie-bun | 🥟 | 菜肉包子 | chinese | cn-generic | budget | meal | breakfast | 0 | 省钱/快手/暖胃 | 3 | 2 | takeout | solo/quick |  | 家常菜 | 菜肉包子 |  |
| cn-grabbed-pancake-egg | 🥞 | 手抓饼加蛋 | chinese | cn-beifang | budget | meal | breakfast | 0 | 快手/解馋/高热量 | 3 | 2 | takeout | solo/quick |  | 北方菜 | 手抓饼加蛋 |  |
| cn-savory-soymilk | 🥛 | 咸豆浆 | chinese | cn-jiangzhe | budget | side | breakfast | 0 | 清淡/暖胃/省钱 | 2 | 2 | takeout | solo/quick |  | 江浙菜 | 咸豆浆 |  |
| cn-tomato-egg-noodle | 🥚 | 西红柿鸡蛋面 | chinese | cn-generic | budget | meal | lunch/dinner | 0 | 清淡/快手/暖胃 | 3 | 2 | dorm | solo/quick |  | 家常菜 | 西红柿鸡蛋面 |  |
| cn-yangchun-noodle | 🍜 | 阳春面 | chinese | cn-jiangzhe | budget | meal | lunch/dinner | 0 | 清淡/省钱/暖胃 | 3 | 2 | restaurant | solo/quick |  | 江浙菜 | 阳春面 |  |
| cn-zhacai-pork-noodle | 🍜 | 榨菜肉丝面 | chinese | cn-jiangzhe | budget | meal | lunch/dinner/midnight | 1 | 下饭/快手/暖胃 | 3 | 2 | takeout | solo/quick/lateNight |  | 江浙菜 | 榨菜肉丝面 |  |
| cn-potato-strip-rice | 🍚 | 土豆丝盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 省钱/下饭/快手 | 4 | 2 | canteen | solo/quick |  | 家常菜 | 土豆丝盖饭 |  |
| cn-pepper-pork-rice | 🍚 | 青椒肉丝盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱 | 4 | 2 | canteen | solo/quick |  | 家常菜 | 青椒肉丝盖饭 |  |
| cn-homestyle-tofu-rice | 🍲 | 家常豆腐盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱/暖胃 | 4 | 2 | canteen | solo/quick |  | 家常菜 | 家常豆腐盖饭 |  |
| cn-garlic-stem-pork-rice | 🍚 | 蒜薹炒肉盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱 | 4 | 2 | canteen | solo/quick |  | 家常菜 | 蒜薹炒肉盖饭 |  |
| cn-flatbread-wrap | 🥞 | 大饼卷菜 | chinese | cn-beifang | budget | meal | breakfast/lunch | 0 | 省钱/快手/解馋 | 3 | 2 | takeout | solo/quick |  | 北方菜 | 大饼卷菜 |  |
| cn-cabbage-vermicelli-stew | 🍲 | 白菜炖粉条 | chinese | cn-dongbei | budget | meal | dinner | 0 | 暖胃/省钱/下饭 | 4 | 2 | canteen | solo/friends |  | 东北菜 | 白菜炖粉条 |  |
| cn-vinegar-cabbage-rice | 🍚 | 醋溜白菜盖饭 | chinese | cn-beifang | budget | meal | lunch/dinner | 0 | 清淡/省钱/下饭 | 3 | 2 | canteen | solo/quick |  | 北方菜 | 醋溜白菜盖饭 |  |
| cn-shanghai-wonton | 🍜 | 上海小馄饨 | chinese | cn-jiangzhe | budget | side | breakfast/midnight | 0 | 清淡/暖胃/快手 | 2 | 2 | takeout | solo/quick/lateNight |  | 江浙菜 | 上海小馄饨 |  |
| cn-century-egg-tofu | 🍢 | 皮蛋豆腐 | chinese | cn-generic | budget | side | dinner/midnight | 0 | 清淡/解腻/快手 | 2 | 2 | restaurant | friends/lateNight |  | 家常菜 | 皮蛋豆腐 |  |
| cn-braised-platter | 🥢 | 卤味拼盘 | chinese | cn-generic | budget | side | dinner/midnight | 1 | 解馋/下饭 | 2 | 3 | takeout | solo/friends/lateNight |  | 家常菜 | 卤味拼盘 |  |
| cn-hongshao-pork-rice | 🍖 | 红烧肉盖饭 | chinese | cn-jiangzhe | normal | meal | lunch/dinner | 0 | 高热量/下饭/解馋 | 4 | 3 | canteen | solo/friends |  | 江浙菜 | 红烧肉盖饭 |  |
| cn-jingjiang-pork | 🥢 | 京酱肉丝 | chinese | cn-beifang | normal | meal | dinner | 0 | 下饭/解馋 | 3 | 3 | restaurant | friends |  | 北方菜 | 京酱肉丝 |  |
| cn-disanxian-rice | 🍚 | 地三鲜盖饭 | chinese | cn-dongbei | normal | meal | lunch/dinner | 0 | 下饭/解馋/高热量 | 4 | 3 | canteen | solo/friends |  | 东北菜 | 地三鲜盖饭 |  |
| cn-chicken-mushroom-stew | 🍲 | 小鸡炖蘑菇 | chinese | cn-dongbei | normal | meal | dinner | 0 | 暖胃/高蛋白/下饭 | 4 | 3 | restaurant | friends |  | 东北菜 | 小鸡炖蘑菇 |  |
| cn-laziji | 🥢 | 辣子鸡丁 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 3 | 解馋/下饭/高蛋白 | 3 | 3 | restaurant | friends |  | 川菜 | 辣子鸡丁 |  |
| cn-koushui-chicken | 🍗 | 口水鸡 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 2 | 解馋/高蛋白 | 3 | 3 | restaurant | friends/solo |  | 川菜 | 口水鸡 |  |
| cn-fuqi-feipian | 🥢 | 夫妻肺片 | chinese | cn-chuanyu | normal | side | dinner | 2 | 解馋/下饭 | 2 | 3 | restaurant | friends |  | 川菜 | 夫妻肺片 |  |
| cn-farmhouse-pork | 🥢 | 农家小炒肉 | chinese | cn-hunan | normal | meal | lunch/dinner | 2 | 下饭/解馋/高热量 | 4 | 3 | restaurant | solo/friends |  | 湘菜 | 农家小炒肉 |  |
| cn-white-cut-chicken | 🍗 | 白切鸡 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 清淡/高蛋白 | 3 | 3 | restaurant | friends |  | 粤菜 | 白切鸡 |  |
| cn-lapwei-claypot-rice | 🍚 | 腊味煲仔饭 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | solo/friends |  | 粤菜 | 腊味煲仔饭 | baozaifan |
| cn-dry-pot-cauliflower | 🍲 | 干锅花菜 | chinese | cn-hunan | normal | meal | dinner | 2 | 下饭/解馋 | 3 | 3 | restaurant | friends |  | 湘菜 | 干锅花菜 |  |
| cn-sizzling-pepper-beef | 🥢 | 铁板黑椒牛柳 | chinese | cn-generic | normal | meal | dinner | 1 | 高蛋白/下饭/解馋 | 3 | 3 | restaurant | date/friends |  | 家常菜 | 铁板黑椒牛柳 |  |
| cn-yuxiang-eggplant | 🐟 | 鱼香茄子煲 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 1 | 下饭/解馋 | 3 | 3 | canteen | solo |  | 川菜 | 鱼香茄子煲 |  |
| cn-sweet-sour-pork | 🥢 | 糖醋里脊 | chinese | cn-generic | normal | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | restaurant | friends/solo |  | 家常菜 | 糖醋里脊 |  |
| cn-gulao-pork | 🥢 | 咕咾肉 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 解馋/高热量/下饭 | 3 | 3 | restaurant | friends/solo |  | 粤菜 | 咕咾肉 |  |
| cn-scallion-lamb | 🍖 | 葱爆羊肉 | chinese | cn-beifang | normal | meal | dinner | 1 | 高蛋白/暖胃/下饭 | 3 | 3 | restaurant | friends |  | 北方菜 | 葱爆羊肉 |  |
| cn-lamb-paomo | 🍜 | 羊肉泡馍 | chinese | cn-xibei | normal | meal | lunch/dinner | 0 | 暖胃/高蛋白/续命 | 5 | 3 | restaurant | solo/friends |  | 西北菜 | 羊肉泡馍 |  |
| cn-xinjiang-rice-noodle | 🍜 | 新疆炒米粉 | chinese | cn-xibei | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高热量 | 4 | 3 | takeout | solo/friends/lateNight |  | 西北菜 | 新疆炒米粉 |  |
| cn-steampot-chicken | 🍲 | 汽锅鸡 | chinese | cn-yunguigui | normal | meal | dinner | 0 | 暖胃/清淡/高蛋白 | 3 | 3 | restaurant | friends |  | 云南菜 | 汽锅鸡 |  |
| cn-dali-sour-fish | 🐟 | 大理酸辣鱼 | chinese | cn-yunguigui | normal | meal | dinner | 2 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | friends |  | 云南菜 | 大理酸辣鱼 |  |
| cn-three-cup-chicken | 🍗 | 三杯鸡 | chinese | cn-generic | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 3 | 3 | restaurant | friends/solo |  | 家常菜 | 三杯鸡 |  |
| cn-meicai-pork-rice | 🍚 | 梅菜扣肉盖饭 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 下饭/高热量/解馋 | 4 | 3 | canteen | solo/friends |  | 粤菜 | 梅菜扣肉盖饭 |  |
| cn-chopped-chili-fish-head | 🐟 | 剁椒鱼头 | chinese | cn-hunan | treat | meal | dinner | 2 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends |  | 湘菜 | 剁椒鱼头 |  |
| cn-scallion-sea-cucumber | 🦑 | 葱烧海参 | chinese | cn-beifang | treat | meal | dinner | 0 | 高蛋白/解馋 | 3 | 5 | restaurant | friends/date |  | 北方菜 | 葱烧海参 |  |
| cn-crab-roe-tofu | 🦀 | 蟹黄豆腐 | chinese | cn-jiangzhe | treat | meal | dinner | 0 | 解馋/高蛋白 | 3 | 4 | restaurant | date/friends |  | 江浙菜 | 蟹黄豆腐 |  |
| cn-dongpo-pork | 🥢 | 东坡肉 | chinese | cn-jiangzhe | treat | meal | dinner/lunch | 0 | 高热量/解馋/下饭 | 4 | 4 | restaurant | friends |  | 江浙菜 | 东坡肉 |  |
| cn-peking-duck | 🦆 | 北京烤鸭 | chinese | cn-beifang | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | friends/date |  | 北方菜 | 北京烤鸭 |  |
| cn-blanched-shrimp | 🦐 | 白灼基围虾 | chinese | cn-guangdong | treat | meal | dinner | 0 | 清淡/高蛋白/解馋 | 3 | 4 | restaurant | friends/date |  | 粤菜 | 白灼基围虾 |  |
| cn-dry-pot-bullfrog | 🍲 | 干锅牛蛙 | chinese | cn-chuanyu | treat | meal | dinner | 2 | 解馋/下饭/高蛋白 | 4 | 4 | restaurant | friends |  | 川菜 | 干锅牛蛙 |  |
| cn-shuizhu-fish | 🐟 | 水煮鱼 | chinese | cn-chuanyu | treat | meal | dinner/lunch | 3 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends |  | 川菜 | 水煮鱼 | shuizhuyu |
| cn-sour-soup-beef | 🍲 | 酸汤肥牛 | chinese | cn-generic | treat | meal | dinner/lunch | 1 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends/solo |  | 家常菜 | 酸汤肥牛 |  |
| cn-yangzhou-fried-rice | 🍚 | 扬州炒饭 | chinese | cn-generic | budget | meal | lunch/dinner | 0 | 快手/解馋/高热量 | 3 | 2 | canteen | solo/quick |  | 家常菜 | 扬州炒饭 | chaofan |
| cn-pork-fried-noodle | 🍜 | 肉丝炒面 | chinese | cn-generic | budget | meal | lunch/dinner/midnight | 1 | 快手/下饭/高热量 | 3 | 2 | takeout | solo/quick/lateNight |  | 家常菜 | 肉丝炒面 |  |
| cn-mushroom-chicken-rice | 🍗 | 香菇滑鸡饭 | chinese | cn-guangdong | budget | meal | lunch/dinner | 0 | 下饭/高蛋白/暖胃 | 4 | 2 | canteen | solo/quick |  | 粤菜 | 香菇滑鸡饭 |  |
| cn-huiguorou-rice | 🍚 | 回锅肉盖饭 | chinese | cn-chuanyu | budget | meal | lunch/dinner | 2 | 下饭/解馋/高热量 | 4 | 2 | canteen | solo/quick |  | 川菜 | 回锅肉盖饭 |  |
| cn-mapo-tofu-rice | 🍲 | 麻婆豆腐盖饭 | chinese | cn-chuanyu | budget | meal | lunch/dinner | 2 | 下饭/解馋/暖胃 | 3 | 2 | canteen | solo/quick |  | 川菜 | 麻婆豆腐盖饭 |  |
| cn-taiwan-lurou-rice | 🍚 | 台式卤肉饭 | chinese | cn-generic | budget | meal | lunch/dinner/midnight | 0 | 下饭/解馋/高热量 | 3 | 2 | takeout | solo/quick/lateNight |  | 家常菜 | 台式卤肉饭 |  |
| cn-curry-beef-rice | 🍛 | 咖喱牛肉饭 | chinese | cn-generic | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends | 咖喱饭 | 咖喱饭 | 咖喱牛肉饭 |  |
| us-bacon-egg-burger | 🥚 | 培根鸡蛋堡 | western | western-american | budget | meal | breakfast | 0 | 高热量/快手/解馋 | 3 | 3 | takeout | solo/quick |  | 美式餐厅 | 培根鸡蛋堡 |  |
| us-scrambled-egg-toast | 🥪 | 美式炒蛋吐司 | western | western-american | budget | meal | breakfast | 0 | 快手/高蛋白 | 3 | 3 | takeout | solo/quick |  | 美式餐厅 | 美式炒蛋吐司 |  |
| west-tuna-sandwich | 🥪 | 金枪鱼三明治 | western | western-generic | budget | meal | breakfast/lunch | 0 | 快手/高蛋白/清淡 | 3 | 2 | convenience | solo/quick | 三明治 | 三明治 | 金枪鱼三明治 |  |
| it-ham-cheese-panini | 🍝 | 火腿芝士帕尼尼 | western | western-italian | budget | meal | breakfast/lunch | 0 | 快手/解馋/高热量 | 3 | 3 | takeout | solo/quick | 三明治 | 三明治 | 火腿芝士帕尼尼 |  |
| it-tomato-pasta | 🍝 | 茄汁意面 | western | western-italian | budget | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | canteen | solo/quick |  | 意大利菜 | 茄汁意面 | yimian |
| it-pesto-pasta | 🍝 | 青酱意面 | western | western-italian | budget | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | canteen | solo/quick |  | 意大利菜 | 青酱意面 | yimian |
| us-mexican-chicken-wrap | 🌯 | 墨西哥鸡肉卷 | western | western-american | budget | meal | lunch/dinner/midnight | 1 | 快手/解馋/高热量 | 3 | 3 | takeout | solo/quick/lateNight |  | 美式餐厅 | 墨西哥鸡肉卷 |  |
| us-bacon-hashbrown-breakfast | 🥞 | 培根薯饼早餐盘 | western | western-american | budget | meal | breakfast | 0 | 高热量/解馋 | 3 | 3 | restaurant | solo/friends |  | 美式餐厅 | 培根薯饼早餐盘 |  |
| it-margherita-pizza | 🍕 | 玛格丽特披萨 | western | western-italian | normal | meal | lunch/dinner | 0 | 解馋/高热量 | 4 | 3 | restaurant | friends/date |  | 意大利菜 | 玛格丽特披萨 | pizza |
| it-lasagna | 🍝 | 意式千层面 | western | western-italian | normal | meal | lunch/dinner | 0 | 解馋/高热量/暖胃 | 4 | 3 | restaurant | friends/date |  | 意大利菜 | 意式千层面 |  |
| west-cheese-baked-rice | 🍚 | 芝士焗饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 解馋/高热量/暖胃 | 4 | 3 | restaurant | solo/friends | 西餐厅 | 西餐厅 | 芝士焗饭 |  |
| west-mushroom-chicken-baked-rice | 🍚 | 蘑菇鸡肉焗饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 解馋/高蛋白/暖胃 | 4 | 3 | restaurant | solo/friends | 西餐厅 | 西餐厅 | 蘑菇鸡肉焗饭 |  |
| us-angus-beef-burger | 🍔 | 安格斯牛肉堡 | western | western-american | normal | meal | lunch/dinner | 0 | 高热量/解馋/高蛋白 | 4 | 3 | restaurant | friends/date |  | 美式餐厅 | 安格斯牛肉堡 |  |
| us-orleans-chicken-rice | 🍗 | 奥尔良烤鸡饭 | western | western-american | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 4 | 3 | takeout | solo/friends |  | 美式餐厅 | 奥尔良烤鸡饭 |  |
| it-meatball-rice | 🍽️ | 意式肉丸饭 | western | western-italian | normal | meal | lunch/dinner | 0 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends |  | 意大利菜 | 意式肉丸饭 |  |
| it-sausage-pasta | 🍝 | 香肠意面 | western | western-italian | normal | meal | lunch/dinner | 1 | 解馋/高热量 | 4 | 3 | restaurant | solo/friends |  | 意大利菜 | 香肠意面 | yimian |
| us-fried-chicken-burger | 🍗 | 美式炸鸡汉堡 | western | western-american | normal | meal | lunch/dinner/midnight | 1 | 高热量/解馋 | 4 | 3 | takeout | solo/friends/lateNight | 炸鸡 | 炸鸡 | 美式炸鸡汉堡 |  |
| west-pan-chicken-rice | 🍽️ | 香煎鸡排饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 高蛋白/解馋/下饭 | 4 | 3 | restaurant | solo/friends | 牛排 | 牛排 | 香煎鸡排饭 |  |
| west-smoked-salmon-bagel | 🥪 | 烟熏三文鱼贝果 | western | western-generic | normal | meal | breakfast/lunch | 0 | 高蛋白/清淡/解馋 | 3 | 3 | restaurant | date | 贝果 | 贝果 | 烟熏三文鱼贝果 |  |
| west-cream-mushroom-soup-bread | 🥪 | 奶油蘑菇汤配面包 | western | western-generic | normal | meal | lunch/dinner | 0 | 暖胃/清淡 | 3 | 3 | restaurant | date | 西餐厅 | 西餐厅 | 奶油蘑菇汤配面包 |  |
| west-chicken-caesar-wrap | 🥗 | 鸡肉凯撒卷 | western | western-generic | normal | meal | lunch/dinner | 0 | 快手/高蛋白/解馋 | 3 | 3 | takeout | solo/quick | 轻食沙拉 | 轻食沙拉 | 鸡肉凯撒卷 |  |
| west-beef-wellington | 🥩 | 惠灵顿牛排 | western | western-generic | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 牛排 | 牛排 | 惠灵顿牛排 |  |
| us-tomahawk-steak | 🥩 | 战斧牛排 | western | western-american | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 牛排 | 牛排 | 战斧牛排 |  |
| it-seafood-pasta | 🍝 | 海鲜意面 | western | western-italian | treat | meal | dinner | 1 | 解馋/高蛋白 | 4 | 4 | restaurant | date/friends |  | 意大利菜 | 海鲜意面 | yimian |
| west-cream-mushroom-steak-rice | 🥩 | 奶油蘑菇牛排饭 | western | western-generic | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | solo/friends | 牛排 | 牛排 | 奶油蘑菇牛排饭 |  |
| west-cheese-lobster | 🦐 | 芝士焗龙虾 | western | western-generic | treat | meal | dinner | 0 | 解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 西餐厅 | 西餐厅 | 芝士焗龙虾 |  |
| west-roast-lamb-chop | 🍖 | 烤羊排 | western | western-generic | treat | meal | dinner | 1 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | friends/date | 西餐厅 | 西餐厅 | 烤羊排 |  |
| it-truffle-mushroom-pasta | 🍝 | 松露蘑菇意面 | western | western-italian | treat | meal | dinner | 0 | 解馋/高热量 | 4 | 4 | restaurant | date/friends |  | 意大利菜 | 松露蘑菇意面 | yimian |
| us-sirloin-steak-fries | 🥩 | 西冷牛排配薯条 | western | western-american | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | date/friends | 牛排 | 牛排 | 西冷牛排配薯条 |  |
| jp-salmon-ochazuke | 🐟 | 日式鲑鱼茶泡饭 | jpkr | japanese | budget | meal | breakfast/lunch/midnight | 0 | 清淡/快手/暖胃 | 3 | 2 | takeout | solo/quick/lateNight |  | 日本料理 | 日式鲑鱼茶泡饭 |  |
| jp-egg-beef-rice | 🥚 | 日式滑蛋牛肉饭 | jpkr | japanese | budget | meal | breakfast/lunch/dinner | 0 | 快手/高蛋白/下饭 | 3 | 2 | canteen | solo/quick |  | 日本料理 | 日式滑蛋牛肉饭 |  |
| kr-kimchi-fried-rice | 🍚 | 韩式泡菜炒饭 | jpkr | korean | budget | meal | lunch/dinner/midnight | 1 | 下饭/解馋/快手 | 3 | 2 | canteen | solo/quick/lateNight |  | 韩国料理 | 韩式泡菜炒饭 |  |
| kr-spicy-ramen | 🍜 | 韩式辣味拉面 | jpkr | korean | budget | meal | lunch/dinner/midnight | 2 | 暖胃/解馋/续命 | 3 | 2 | convenience | solo/quick/lateNight | 韩式拉面 | 韩式拉面 | 韩式辣味拉面 |  |
| jp-shoyu-ramen | 🍜 | 日式酱油拉面 | jpkr | japanese | budget | meal | lunch/dinner/midnight | 1 | 暖胃/解馋 | 4 | 2 | takeout | solo/lateNight | 日式拉面 | 日式拉面 | 日式酱油拉面 | ramen |
| kr-spicy-pork-rice | 🍚 | 韩式辣炒猪肉盖饭 | jpkr | korean | budget | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高蛋白 | 4 | 2 | canteen | solo/quick/lateNight |  | 韩国料理 | 韩式辣炒猪肉盖饭 |  |
| jp-curry-chicken-cutlet-rice | 🍛 | 日式咖喱鸡排饭 | jpkr | japanese | budget | meal | lunch/dinner/midnight | 1 | 下饭/解馋/高热量 | 4 | 2 | canteen | solo/quick/lateNight | 日式咖喱 | 日式咖喱 | 日式咖喱鸡排饭 |  |
| jp-seafood-ramen | 🍜 | 日式海鲜拉面 | jpkr | japanese | normal | meal | lunch/dinner/midnight | 1 | 暖胃/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight | 日式拉面 | 日式拉面 | 日式海鲜拉面 | ramen |
| jp-shio-ramen | 🍜 | 日式盐味拉面 | jpkr | japanese | normal | meal | lunch/dinner/midnight | 0 | 暖胃/清淡 | 4 | 3 | restaurant | solo/friends/lateNight | 日式拉面 | 日式拉面 | 日式盐味拉面 | ramen |
| jp-teriyaki-chicken-rice | 🍗 | 日式照烧鸡腿饭 | jpkr | japanese | normal | meal | lunch/dinner/midnight | 0 | 下饭/解馋/高蛋白 | 4 | 3 | takeout | solo/friends/lateNight |  | 日本料理 | 日式照烧鸡腿饭 |  |
| jp-curry-beef-udon | 🍜 | 日式咖喱牛肉乌冬 | jpkr | japanese | normal | meal | lunch/dinner/midnight | 1 | 暖胃/解馋/下饭 | 4 | 3 | restaurant | solo/friends/lateNight | 乌冬面 | 乌冬面 | 日式咖喱牛肉乌冬 |  |
| kr-kimchi-pork-stew | 🍲 | 韩式泡菜猪肉锅 | jpkr | korean | normal | meal | dinner/midnight | 2 | 暖胃/下饭/解馋 | 4 | 3 | restaurant | friends/lateNight |  | 韩国料理 | 韩式泡菜猪肉锅 |  |
| kr-spicy-squid-rice | 🦑 | 韩式辣炒鱿鱼盖饭 | jpkr | korean | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight |  | 韩国料理 | 韩式辣炒鱿鱼盖饭 |  |
| jp-tempura-donburi | 🍚 | 日式天妇罗盖饭 | jpkr | japanese | normal | meal | lunch/dinner | 0 | 解馋/高热量 | 4 | 3 | restaurant | solo/friends |  | 日本料理 | 日式天妇罗盖饭 |  |
| kr-fried-chicken | 🍗 | 韩式炸鸡 | jpkr | korean | normal | meal | dinner/midnight | 1 | 高热量/解馋 | 4 | 4 | takeout | friends/lateNight | 炸鸡 | 炸鸡 | 韩式炸鸡 | koreanchicken |
| kr-soy-fried-chicken | 🍗 | 韩式酱油炸鸡 | jpkr | korean | normal | meal | dinner/midnight | 0 | 高热量/解馋 | 4 | 4 | takeout | friends/lateNight | 炸鸡 | 炸鸡 | 韩式酱油炸鸡 | koreanchicken |
| jp-curry-pork-cutlet-rice | 🍛 | 日式咖喱猪排饭 | jpkr | japanese | normal | meal | lunch/dinner/midnight | 1 | 下饭/解馋/高热量 | 4 | 3 | restaurant | solo/friends/lateNight | 日式咖喱 | 日式咖喱 | 日式咖喱猪排饭 |  |
| kr-spicy-beef-soup-rice | 🍲 | 韩式辣牛肉汤饭 | jpkr | korean | normal | meal | lunch/dinner/midnight | 2 | 暖胃/下饭/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight |  | 韩国料理 | 韩式辣牛肉汤饭 |  |
| kr-seafood-pancake | 🥞 | 韩式海鲜煎饼 | jpkr | korean | normal | meal | dinner/midnight | 0 | 解馋/高热量 | 3 | 3 | restaurant | friends/lateNight |  | 韩国料理 | 韩式海鲜煎饼 |  |
| jp-beef-shigureni-rice | 🍚 | 日式牛肉时雨煮饭 | jpkr | japanese | normal | meal | lunch/dinner | 0 | 下饭/高蛋白/解馋 | 4 | 3 | takeout | solo/friends |  | 日本料理 | 日式牛肉时雨煮饭 |  |
| jp-wagyu-yakiniku | 🍖 | 日式和牛烧肉 | jpkr | japanese | treat | meal | dinner/midnight | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | friends/lateNight | 日式烧肉 | 日式烧肉 | 日式和牛烧肉 |  |
| jp-sashimi-platter | 🍣 | 日式刺身拼盘 | jpkr | japanese | treat | meal | dinner/midnight | 0 | 清淡/高蛋白/解馋 | 3 | 4 | restaurant | friends/date |  | 日本料理 | 日式刺身拼盘 |  |
| jp-unagi-three-ways | 🍱 | 日式鳗鱼三吃 | jpkr | japanese | treat | meal | dinner | 0 | 解馋/高蛋白 | 4 | 4 | restaurant | friends/date |  | 日本料理 | 日式鳗鱼三吃 |  |
| kr-pork-belly-bbq-set | 🍖 | 韩式烤五花肉套餐 | jpkr | korean | treat | meal | dinner/midnight | 1 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | friends/lateNight |  | 韩国料理 | 韩式烤五花肉套餐 |  |
| jp-premium-sushi | 🍣 | 日式特上寿司 | jpkr | japanese | treat | meal | dinner | 0 | 清淡/高蛋白/解馋 | 3 | 5 | restaurant | friends/date | 寿司 | 寿司 | 日式特上寿司 |  |
| kr-charcoal-beef-short-rib | 🍖 | 韩式炭火烤牛小排 | jpkr | korean | treat | meal | dinner/midnight | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | friends/lateNight |  | 韩国料理 | 韩式炭火烤牛小排 |  |
| jp-crab-hotpot | 🦀 | 日式蟹肉火锅 | jpkr | japanese | treat | meal | dinner/midnight | 0 | 暖胃/解馋/高蛋白 | 4 | 4 | restaurant | friends/lateNight |  | 日本料理 | 日式蟹肉火锅 |  |
| sea-vietnam-pork-banhmi | 🥪 | 越南猪肉法包 | exotic | sea | budget | meal | breakfast/lunch/midnight | 0 | 快手/解馋/清淡 | 3 | 2 | takeout | solo/quick/lateNight | 越南菜 | 越南菜 | 越南猪肉法包 |  |
| th-basil-pork-rice | 🌍 | 泰式打抛猪饭 | exotic | thai | budget | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高蛋白 | 3 | 2 | takeout | solo/quick/lateNight |  | 泰国菜 | 泰式打抛猪饭 |  |
| sea-indonesia-fried-rice | 🍚 | 印尼炒饭 | exotic | sea | budget | meal | lunch/dinner/midnight | 1 | 下饭/解馋/高热量 | 3 | 2 | takeout | solo/quick/lateNight | 东南亚菜 | 东南亚菜 | 印尼炒饭 |  |
| th-seafood-fried-noodle | 🍜 | 泰式海鲜炒河粉 | exotic | thai | budget | meal | lunch/dinner/midnight | 1 | 解馋/高热量/下饭 | 3 | 2 | takeout | solo/quick/lateNight | 泰国菜 | 泰国菜 | 泰式海鲜炒河粉 |  |
| th-green-curry-chicken-rice | 🍛 | 泰式绿咖喱鸡饭 | exotic | thai | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | solo/friends/lateNight | 泰国菜 | 泰国菜 | 泰式绿咖喱鸡饭 |  |
| th-red-curry-beef-rice | 🍛 | 泰式红咖喱牛肉饭 | exotic | thai | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight | 泰国菜 | 泰国菜 | 泰式红咖喱牛肉饭 |  |
| th-tomyum-seafood-noodle | 🍜 | 泰式冬阴功海鲜面 | exotic | thai | normal | meal | lunch/dinner/midnight | 2 | 暖胃/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight |  | 泰国菜 | 泰式冬阴功海鲜面 |  |
| sea-malay-laksa | 🍜 | 马来叻沙面 | exotic | sea | normal | meal | lunch/dinner/midnight | 2 | 暖胃/解馋/高热量 | 4 | 3 | restaurant | solo/friends/lateNight | 东南亚菜 | 东南亚菜 | 马来叻沙面 |  |
| sea-vietnam-lemongrass-pork-rice | 🍖 | 越南香茅烤肉饭 | exotic | sea | normal | meal | lunch/dinner/midnight | 1 | 下饭/解馋/高蛋白 | 4 | 3 | takeout | solo/friends/lateNight | 越南菜 | 越南菜 | 越南香茅烤肉饭 |  |
| in-lamb-curry-rice | 🍛 | 印度咖喱羊肉饭 | exotic | indian | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends/lateNight | 印度菜 | 印度菜 | 印度咖喱羊肉饭 |  |
| in-masala-chicken-rice | 🍛 | 印度玛萨拉咖喱鸡饭 | exotic | indian | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | solo/friends/lateNight | 印度菜 | 印度菜 | 印度玛萨拉咖喱鸡饭 |  |
| world-mexican-chicken-burrito-rice | 🍗 | 墨西哥烤鸡肉卷饭 | exotic | exotic-generic | normal | meal | lunch/dinner/midnight | 1 | 快手/解馋/高蛋白 | 3 | 3 | takeout | solo/quick/lateNight | 墨西哥菜 | 墨西哥菜 | 墨西哥烤鸡肉卷饭 |  |
| me-mideast-chicken-rice | 🍗 | 中东烤鸡肉饭 | exotic | mideast | normal | meal | lunch/dinner/midnight | 1 | 下饭/解馋/高蛋白 | 4 | 3 | takeout | solo/friends/lateNight | 中东菜 | 中东菜 | 中东烤鸡肉饭 |  |
| sea-hainan-chicken-rice | 🍚 | 新加坡海南鸡饭 | exotic | sea | normal | meal | lunch/dinner | 0 | 清淡/高蛋白/下饭 | 4 | 3 | restaurant | solo/friends | 海南鸡饭 | 海南鸡饭 | 新加坡海南鸡饭 |  |
| sea-vietnam-springroll-noodle | 🍜 | 越南春卷米线 | exotic | sea | normal | meal | lunch/dinner | 0 | 清淡/快手 | 3 | 3 | takeout | solo/quick | 越南菜 | 越南菜 | 越南春卷米线 |  |
| me-turkish-kebab-pizza | 🍕 | 土耳其烤肉披萨 | exotic | mideast | normal | meal | lunch/dinner/midnight | 0 | 解馋/高热量 | 4 | 3 | takeout | solo/friends/lateNight | 土耳其烤肉 | 土耳其烤肉 | 土耳其烤肉披萨 |  |
| th-curry-crab | 🦀 | 泰式咖喱蟹 | exotic | thai | treat | meal | dinner/midnight | 2 | 解馋/高蛋白 | 4 | 4 | restaurant | friends/lateNight | 泰国菜 | 泰国菜 | 泰式咖喱蟹 |  |
| sea-black-pepper-crab | 🦀 | 新加坡黑胡椒蟹 | exotic | sea | treat | meal | dinner/midnight | 1 | 解馋/高蛋白/高热量 | 4 | 5 | restaurant | friends/lateNight |  | 东南亚菜 | 新加坡黑胡椒蟹 |  |
| in-lamb-chop-naan | 🍖 | 印度烤羊排配馕 | exotic | indian | treat | meal | dinner | 1 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | friends/date | 印度菜 | 印度菜 | 印度烤羊排配馕 |  |
| me-mideast-lamb-platter | 🍖 | 中东烤羊肉拼盘 | exotic | mideast | treat | meal | dinner/midnight | 1 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | friends/lateNight | 中东菜 | 中东菜 | 中东烤羊肉拼盘 |  |
| th-king-prawn | 🦐 | 泰式帝王虾 | exotic | thai | treat | meal | dinner | 1 | 解馋/高蛋白/清淡 | 3 | 4 | restaurant | friends/date |  | 泰国菜 | 泰式帝王虾 |  |
| me-morocco-lamb-stew | 🍖 | 摩洛哥炖羊肉 | exotic | mideast | treat | meal | dinner | 1 | 暖胃/解馋/高蛋白 | 4 | 4 | restaurant | friends/date | 中东菜 | 中东菜 | 摩洛哥炖羊肉 |  |
| world-spanish-paella | 🥘 | 西班牙海鲜饭 | exotic | exotic-generic | treat | meal | dinner | 0 | 解馋/高蛋白/高热量 | 4 | 4 | restaurant | friends/date | 西班牙菜 | 西班牙菜 | 西班牙海鲜饭 |  |
| th-volcano-ribs | 🍖 | 泰式火山排骨 | exotic | thai | treat | meal | dinner/midnight | 3 | 解馋/下饭/高热量 | 4 | 4 | restaurant | friends/lateNight |  | 泰国菜 | 泰式火山排骨 |  |
| cn-breakfast-sandwich | 🥪 | 早餐三明治 | western | western-generic | budget | meal | breakfast | 0 | 快手/省钱/高蛋白 | 3 | 2 | convenience | solo/quick | 三明治 | 三明治 | 早餐三明治 |  |
| cn-egg-stuffed-pancake | 🥞 | 鸡蛋灌饼 | chinese | cn-beifang | budget | meal | breakfast/lunch | 0 | 快手/省钱/解馋 | 3 | 2 | takeout | solo/quick |  | 北方菜 | 鸡蛋灌饼 |  |
| cn-beef-pie | 🥞 | 牛肉馅饼 | chinese | cn-beifang | budget | meal | breakfast/lunch | 0 | 解馋/高热量/下饭 | 3 | 2 | takeout | solo/quick |  | 北方菜 | 牛肉馅饼 |  |
| cn-zifan-rice-roll | 🥢 | 粢饭团 | chinese | cn-jiangzhe | budget | meal | breakfast | 0 | 快手/省钱/暖胃 | 3 | 2 | takeout | solo/quick |  | 江浙菜 | 粢饭团 |  |
| cn-rice-noodle-roll-set | 🥢 | 肠粉套餐 | chinese | cn-guangdong | budget | meal | breakfast/lunch | 0 | 清淡/快手/暖胃 | 3 | 2 | restaurant | solo/quick |  | 粤菜 | 肠粉套餐 |  |
| cn-shaomai-set | 🥢 | 烧卖套餐 | chinese | cn-guangdong | budget | meal | breakfast/lunch | 0 | 快手/解馋/暖胃 | 3 | 2 | restaurant | solo/quick |  | 粤菜 | 烧卖套餐 |  |
| west-bagel-breakfast-plate | 🥪 | 贝果早餐盘 | western | western-generic | normal | meal | breakfast | 0 | 高蛋白/健康轻食/快手 | 3 | 3 | restaurant | solo/quick | 贝果 | 贝果 | 贝果早餐盘 |  |
| cn-taiwan-rice-ball | 🥢 | 台式饭团 | chinese | cn-generic | budget | meal | breakfast | 0 | 快手/省钱/解馋 | 3 | 2 | takeout | solo/quick |  | 家常菜 | 台式饭团 |  |
| cn-spicy-soup-mo | 🥟 | 胡辣汤配馍 | chinese | cn-beifang | budget | meal | breakfast/lunch | 1 | 暖胃/下饭/续命 | 3 | 2 | restaurant | solo/quick |  | 北方菜 | 胡辣汤配馍 |  |
| kr-kimchi-ramen | 🍜 | 韩式泡菜拉面 | jpkr | korean | budget | meal | dinner/midnight | 2 | 暖胃/解馋/续命 | 3 | 2 | takeout | solo/quick/lateNight | 韩式拉面 | 韩式拉面 | 韩式泡菜拉面 |  |
| th-char-kway-teow | 🌍 | 泰式炒粿条 | exotic | thai | budget | meal | lunch/dinner/midnight | 1 | 解馋/高热量/快手 | 3 | 2 | takeout | solo/quick/lateNight |  | 泰国菜 | 泰式炒粿条 |  |
| cn-late-night-beef-rice | 🍚 | 夜宵牛肉盖饭 | chinese | cn-generic | normal | meal | dinner/midnight | 1 | 下饭/解馋/续命 | 4 | 3 | takeout | solo/friends/lateNight |  | 家常菜 | 夜宵牛肉盖饭 |  |
| cn-popcorn-chicken-rice | 🥢 | 盐酥鸡饭 | chinese | cn-generic | normal | meal | dinner/midnight | 1 | 解馋/高热量/续命 | 3 | 3 | takeout | solo/quick/lateNight |  | 家常菜 | 盐酥鸡饭 |  |
| cn-soy-fried-noodle | 🍜 | 豉油皇炒面 | chinese | cn-guangdong | budget | meal | lunch/dinner/midnight | 0 | 快手/解馋/高热量 | 3 | 2 | takeout | solo/quick/lateNight |  | 粤菜 | 豉油皇炒面 |  |
| cn-shrimp-wonton-noodle | 🍜 | 鲜虾馄饨面 | chinese | cn-guangdong | normal | meal | lunch/dinner/midnight | 0 | 清淡/暖胃/续命 | 3 | 3 | takeout | solo/quick/lateNight |  | 粤菜 | 鲜虾馄饨面 |  |
| cn-clay-pot-chicken-noodle | 🍲 | 砂锅鸡杂粉 | chinese | cn-yunguigui | normal | meal | dinner/midnight | 2 | 暖胃/解馋/续命 | 4 | 3 | restaurant | solo/friends/lateNight |  | 云南菜 | 砂锅鸡杂粉 |  |
| cn-lurou-mixed-noodle | 🍜 | 卤肉拌面 | chinese | cn-generic | budget | meal | lunch/dinner/midnight | 1 | 下饭/解馋/快手 | 3 | 2 | takeout | solo/quick/lateNight |  | 家常菜 | 卤肉拌面 |  |
| cn-spicy-beef-noodle | 🍜 | 麻辣牛肉面 | chinese | cn-chuanyu | normal | meal | dinner/midnight | 3 | 暖胃/解馋/下饭 | 4 | 3 | takeout | solo/friends/lateNight |  | 川菜 | 麻辣牛肉面 |  |
