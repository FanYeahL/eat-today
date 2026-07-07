# 候选菜 review 表（chinese+western，共 85 行）

> 审阅重点：命名真实性 / 口味(spicy) / 价位归档 / 餐段合理性 / treat 是否够犒劳 / side 层归类 / canonicalGroup 归并。
> 层级：meal 78 · side 7（**缺口只算 meal 层**）
> meal 层价位（计入缺口）：budget 26 · normal 35 · treat 17
> 餐段命中（仅 meal 层）：早 9 / 午 51 / 茶 0 / 晚 69 / 宵 6
> family meal 缺口：chinese 达成49/49(剩0) · western 达成29/29(剩0) · jpkr 达成0/27(剩27) · exotic 达成0/24(剩24)
> tea meal=0 是预期：下午茶不走 meal-only，由后续 side/drink 池补供给（spec §4.2 / §3.1）。

| name | _family | cuisine | priceTier | pickLayer | meals | spicy | tags | satiety | indulgence | convenience | occasion | gateQuery | displayQuery | canonicalGroup |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 白粥配小菜 | chinese | cn-generic | budget | side | breakfast | 0 | 清淡/省钱/暖胃 | 2 | 1 | canteen | solo/quick | 家常菜 | 白粥配小菜 |  |
| 茶叶蛋 | chinese | cn-generic | budget | side | breakfast/midnight | 0 | 省钱/快手 | 1 | 1 | convenience | solo/quick/lateNight | 家常菜 | 茶叶蛋 |  |
| 菜肉包子 | chinese | cn-generic | budget | meal | breakfast | 0 | 省钱/快手/暖胃 | 3 | 2 | takeout | solo/quick | 家常菜 | 菜肉包子 |  |
| 手抓饼加蛋 | chinese | cn-beifang | budget | meal | breakfast | 0 | 快手/解馋/高热量 | 3 | 2 | takeout | solo/quick | 北方菜 | 手抓饼加蛋 |  |
| 咸豆浆 | chinese | cn-jiangzhe | budget | side | breakfast | 0 | 清淡/暖胃/省钱 | 2 | 2 | takeout | solo/quick | 江浙菜 | 咸豆浆 |  |
| 西红柿鸡蛋面 | chinese | cn-generic | budget | meal | lunch/dinner | 0 | 清淡/快手/暖胃 | 3 | 2 | dorm | solo/quick | 家常菜 | 西红柿鸡蛋面 |  |
| 阳春面 | chinese | cn-jiangzhe | budget | meal | lunch/dinner | 0 | 清淡/省钱/暖胃 | 3 | 2 | restaurant | solo/quick | 江浙菜 | 阳春面 |  |
| 榨菜肉丝面 | chinese | cn-jiangzhe | budget | meal | lunch/dinner/midnight | 1 | 下饭/快手/暖胃 | 3 | 2 | takeout | solo/quick/lateNight | 江浙菜 | 榨菜肉丝面 |  |
| 土豆丝盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 省钱/下饭/快手 | 4 | 2 | canteen | solo/quick | 家常菜 | 土豆丝盖饭 |  |
| 青椒肉丝盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱 | 4 | 2 | canteen | solo/quick | 家常菜 | 青椒肉丝盖饭 |  |
| 家常豆腐盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱/暖胃 | 4 | 2 | canteen | solo/quick | 家常菜 | 家常豆腐盖饭 |  |
| 蒜薹炒肉盖饭 | chinese | cn-generic | budget | meal | lunch/dinner | 1 | 下饭/省钱 | 4 | 2 | canteen | solo/quick | 家常菜 | 蒜薹炒肉盖饭 |  |
| 大饼卷菜 | chinese | cn-beifang | budget | meal | breakfast/lunch | 0 | 省钱/快手/解馋 | 3 | 2 | takeout | solo/quick | 北方菜 | 大饼卷菜 |  |
| 白菜炖粉条 | chinese | cn-dongbei | budget | meal | dinner | 0 | 暖胃/省钱/下饭 | 4 | 2 | canteen | solo/friends | 东北菜 | 白菜炖粉条 |  |
| 醋溜白菜盖饭 | chinese | cn-beifang | budget | meal | lunch/dinner | 0 | 清淡/省钱/下饭 | 3 | 2 | canteen | solo/quick | 北方菜 | 醋溜白菜盖饭 |  |
| 上海小馄饨 | chinese | cn-jiangzhe | budget | side | breakfast/midnight | 0 | 清淡/暖胃/快手 | 2 | 2 | takeout | solo/quick/lateNight | 江浙菜 | 上海小馄饨 |  |
| 皮蛋豆腐 | chinese | cn-generic | budget | side | dinner/midnight | 0 | 清淡/解腻/快手 | 2 | 2 | restaurant | friends/lateNight | 家常菜 | 皮蛋豆腐 |  |
| 卤味拼盘 | chinese | cn-generic | budget | side | dinner/midnight | 1 | 解馋/下饭 | 2 | 3 | takeout | solo/friends/lateNight | 家常菜 | 卤味拼盘 |  |
| 红烧肉盖饭 | chinese | cn-jiangzhe | normal | meal | lunch/dinner | 0 | 高热量/下饭/解馋 | 4 | 3 | canteen | solo/friends | 江浙菜 | 红烧肉盖饭 |  |
| 京酱肉丝 | chinese | cn-beifang | normal | meal | dinner | 0 | 下饭/解馋 | 3 | 3 | restaurant | friends | 北方菜 | 京酱肉丝 |  |
| 地三鲜盖饭 | chinese | cn-dongbei | normal | meal | lunch/dinner | 0 | 下饭/解馋/高热量 | 4 | 3 | canteen | solo/friends | 东北菜 | 地三鲜盖饭 |  |
| 小鸡炖蘑菇 | chinese | cn-dongbei | normal | meal | dinner | 0 | 暖胃/高蛋白/下饭 | 4 | 3 | restaurant | friends | 东北菜 | 小鸡炖蘑菇 |  |
| 辣子鸡丁 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 3 | 解馋/下饭/高蛋白 | 3 | 3 | restaurant | friends | 川菜 | 辣子鸡丁 |  |
| 口水鸡 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 2 | 解馋/高蛋白 | 3 | 3 | restaurant | friends/solo | 川菜 | 口水鸡 |  |
| 夫妻肺片 | chinese | cn-chuanyu | normal | side | dinner | 2 | 解馋/下饭 | 2 | 3 | restaurant | friends | 川菜 | 夫妻肺片 |  |
| 农家小炒肉 | chinese | cn-hunan | normal | meal | lunch/dinner | 2 | 下饭/解馋/高热量 | 4 | 3 | restaurant | solo/friends | 湘菜 | 农家小炒肉 |  |
| 白切鸡 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 清淡/高蛋白 | 3 | 3 | restaurant | friends | 粤菜 | 白切鸡 |  |
| 腊味煲仔饭 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | solo/friends | 粤菜 | 腊味煲仔饭 | baozaifan |
| 干锅花菜 | chinese | cn-hunan | normal | meal | dinner | 2 | 下饭/解馋 | 3 | 3 | restaurant | friends | 湘菜 | 干锅花菜 |  |
| 铁板黑椒牛柳 | chinese | cn-generic | normal | meal | dinner | 1 | 高蛋白/下饭/解馋 | 3 | 3 | restaurant | date/friends | 家常菜 | 铁板黑椒牛柳 |  |
| 鱼香茄子煲 | chinese | cn-chuanyu | normal | meal | lunch/dinner | 1 | 下饭/解馋 | 3 | 3 | canteen | solo | 川菜 | 鱼香茄子煲 |  |
| 糖醋里脊 | chinese | cn-generic | normal | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | restaurant | friends/solo | 家常菜 | 糖醋里脊 |  |
| 咕咾肉 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 解馋/高热量/下饭 | 3 | 3 | restaurant | friends/solo | 粤菜 | 咕咾肉 |  |
| 葱爆羊肉 | chinese | cn-beifang | normal | meal | dinner | 1 | 高蛋白/暖胃/下饭 | 3 | 3 | restaurant | friends | 北方菜 | 葱爆羊肉 |  |
| 羊肉泡馍 | chinese | cn-xibei | normal | meal | lunch/dinner | 0 | 暖胃/高蛋白/续命 | 5 | 3 | restaurant | solo/friends | 西北菜 | 羊肉泡馍 |  |
| 新疆炒米粉 | chinese | cn-xibei | normal | meal | lunch/dinner/midnight | 2 | 下饭/解馋/高热量 | 4 | 3 | takeout | solo/friends/lateNight | 西北菜 | 新疆炒米粉 |  |
| 汽锅鸡 | chinese | cn-yunguigui | normal | meal | dinner | 0 | 暖胃/清淡/高蛋白 | 3 | 3 | restaurant | friends | 云南菜 | 汽锅鸡 |  |
| 大理酸辣鱼 | chinese | cn-yunguigui | normal | meal | dinner | 2 | 下饭/解馋/暖胃 | 4 | 3 | restaurant | friends | 云南菜 | 大理酸辣鱼 |  |
| 三杯鸡 | chinese | cn-generic | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 3 | 3 | restaurant | friends/solo | 家常菜 | 三杯鸡 |  |
| 梅菜扣肉盖饭 | chinese | cn-guangdong | normal | meal | lunch/dinner | 0 | 下饭/高热量/解馋 | 4 | 3 | canteen | solo/friends | 粤菜 | 梅菜扣肉盖饭 |  |
| 剁椒鱼头 | chinese | cn-hunan | treat | meal | dinner | 2 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends | 湘菜 | 剁椒鱼头 |  |
| 葱烧海参 | chinese | cn-beifang | treat | meal | dinner | 0 | 高蛋白/解馋 | 3 | 5 | restaurant | friends/date | 北方菜 | 葱烧海参 |  |
| 蟹黄豆腐 | chinese | cn-jiangzhe | treat | meal | dinner | 0 | 解馋/高蛋白 | 3 | 4 | restaurant | date/friends | 江浙菜 | 蟹黄豆腐 |  |
| 东坡肉 | chinese | cn-jiangzhe | treat | meal | dinner/lunch | 0 | 高热量/解馋/下饭 | 4 | 4 | restaurant | friends | 江浙菜 | 东坡肉 |  |
| 北京烤鸭 | chinese | cn-beifang | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | friends/date | 北方菜 | 北京烤鸭 |  |
| 白灼基围虾 | chinese | cn-guangdong | treat | meal | dinner | 0 | 清淡/高蛋白/解馋 | 3 | 4 | restaurant | friends/date | 粤菜 | 白灼基围虾 |  |
| 干锅牛蛙 | chinese | cn-chuanyu | treat | meal | dinner | 2 | 解馋/下饭/高蛋白 | 4 | 4 | restaurant | friends | 川菜 | 干锅牛蛙 |  |
| 水煮鱼 | chinese | cn-chuanyu | treat | meal | dinner/lunch | 3 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends | 川菜 | 水煮鱼 | shuizhuyu |
| 酸汤肥牛 | chinese | cn-generic | treat | meal | dinner/lunch | 1 | 下饭/解馋/高蛋白 | 4 | 4 | restaurant | friends/solo | 家常菜 | 酸汤肥牛 |  |
| 扬州炒饭 | chinese | cn-generic | budget | meal | lunch/dinner | 0 | 快手/解馋/高热量 | 3 | 2 | canteen | solo/quick | 家常菜 | 扬州炒饭 | chaofan |
| 肉丝炒面 | chinese | cn-generic | budget | meal | lunch/dinner/midnight | 1 | 快手/下饭/高热量 | 3 | 2 | takeout | solo/quick/lateNight | 家常菜 | 肉丝炒面 |  |
| 香菇滑鸡饭 | chinese | cn-guangdong | budget | meal | lunch/dinner | 0 | 下饭/高蛋白/暖胃 | 4 | 2 | canteen | solo/quick | 粤菜 | 香菇滑鸡饭 |  |
| 回锅肉盖饭 | chinese | cn-chuanyu | budget | meal | lunch/dinner | 2 | 下饭/解馋/高热量 | 4 | 2 | canteen | solo/quick | 川菜 | 回锅肉盖饭 |  |
| 麻婆豆腐盖饭 | chinese | cn-chuanyu | budget | meal | lunch/dinner | 2 | 下饭/解馋/暖胃 | 3 | 2 | canteen | solo/quick | 川菜 | 麻婆豆腐盖饭 |  |
| 台式卤肉饭 | chinese | cn-generic | budget | meal | lunch/dinner/midnight | 0 | 下饭/解馋/高热量 | 3 | 2 | takeout | solo/quick/lateNight | 家常菜 | 台式卤肉饭 |  |
| 咖喱牛肉饭 | chinese | cn-generic | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends | 家常菜 | 咖喱牛肉饭 |  |
| 培根鸡蛋堡 | western | western-american | budget | meal | breakfast | 0 | 高热量/快手/解馋 | 3 | 3 | takeout | solo/quick | 美式餐厅 | 培根鸡蛋堡 |  |
| 美式炒蛋吐司 | western | western-american | budget | meal | breakfast | 0 | 快手/高蛋白 | 3 | 3 | takeout | solo/quick | 美式餐厅 | 美式炒蛋吐司 |  |
| 金枪鱼三明治 | western | western-generic | budget | meal | breakfast/lunch | 0 | 快手/高蛋白/清淡 | 3 | 2 | convenience | solo/quick | 西餐厅 | 金枪鱼三明治 |  |
| 火腿芝士帕尼尼 | western | western-italian | budget | meal | breakfast/lunch | 0 | 快手/解馋/高热量 | 3 | 3 | takeout | solo/quick | 意大利菜 | 火腿芝士帕尼尼 |  |
| 茄汁意面 | western | western-italian | budget | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | canteen | solo/quick | 意大利菜 | 茄汁意面 | yimian |
| 青酱意面 | western | western-italian | budget | meal | lunch/dinner | 0 | 解馋/高热量 | 3 | 3 | canteen | solo/quick | 意大利菜 | 青酱意面 | yimian |
| 墨西哥鸡肉卷 | western | western-american | budget | meal | lunch/dinner/midnight | 1 | 快手/解馋/高热量 | 3 | 3 | takeout | solo/quick/lateNight | 美式餐厅 | 墨西哥鸡肉卷 |  |
| 培根薯饼早餐盘 | western | western-american | budget | meal | breakfast | 0 | 高热量/解馋 | 3 | 3 | restaurant | solo/friends | 美式餐厅 | 培根薯饼早餐盘 |  |
| 玛格丽特披萨 | western | western-italian | normal | meal | lunch/dinner | 0 | 解馋/高热量 | 4 | 3 | restaurant | friends/date | 意大利菜 | 玛格丽特披萨 | pizza |
| 意式千层面 | western | western-italian | normal | meal | lunch/dinner | 0 | 解馋/高热量/暖胃 | 4 | 3 | restaurant | friends/date | 意大利菜 | 意式千层面 |  |
| 芝士焗饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 解馋/高热量/暖胃 | 4 | 3 | restaurant | solo/friends | 西餐厅 | 芝士焗饭 |  |
| 蘑菇鸡肉焗饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 解馋/高蛋白/暖胃 | 4 | 3 | restaurant | solo/friends | 西餐厅 | 蘑菇鸡肉焗饭 |  |
| 安格斯牛肉堡 | western | western-american | normal | meal | lunch/dinner | 0 | 高热量/解馋/高蛋白 | 4 | 3 | restaurant | friends/date | 美式餐厅 | 安格斯牛肉堡 |  |
| 奥尔良烤鸡饭 | western | western-american | normal | meal | lunch/dinner | 1 | 下饭/解馋/高蛋白 | 4 | 3 | takeout | solo/friends | 美式餐厅 | 奥尔良烤鸡饭 |  |
| 意式肉丸饭 | western | western-italian | normal | meal | lunch/dinner | 0 | 下饭/解馋/高蛋白 | 4 | 3 | restaurant | solo/friends | 意大利菜 | 意式肉丸饭 |  |
| 香肠意面 | western | western-italian | normal | meal | lunch/dinner | 1 | 解馋/高热量 | 4 | 3 | restaurant | solo/friends | 意大利菜 | 香肠意面 | yimian |
| 美式炸鸡汉堡 | western | western-american | normal | meal | lunch/dinner/midnight | 1 | 高热量/解馋 | 4 | 3 | takeout | solo/friends/lateNight | 美式餐厅 | 美式炸鸡汉堡 |  |
| 香煎鸡排饭 | western | western-generic | normal | meal | lunch/dinner | 0 | 高蛋白/解馋/下饭 | 4 | 3 | restaurant | solo/friends | 西餐厅 | 香煎鸡排饭 |  |
| 烟熏三文鱼贝果 | western | western-generic | normal | meal | breakfast/lunch | 0 | 高蛋白/清淡/解馋 | 3 | 3 | restaurant | date | 西餐厅 | 烟熏三文鱼贝果 |  |
| 奶油蘑菇汤配面包 | western | western-generic | normal | meal | lunch/dinner | 0 | 暖胃/清淡 | 3 | 3 | restaurant | date | 西餐厅 | 奶油蘑菇汤配面包 |  |
| 鸡肉凯撒卷 | western | western-generic | normal | meal | lunch/dinner | 0 | 快手/高蛋白/解馋 | 3 | 3 | takeout | solo/quick | 西餐厅 | 鸡肉凯撒卷 |  |
| 惠灵顿牛排 | western | western-generic | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 西餐厅 | 惠灵顿牛排 |  |
| 战斧牛排 | western | western-american | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 美式餐厅 | 战斧牛排 |  |
| 海鲜意面 | western | western-italian | treat | meal | dinner | 1 | 解馋/高蛋白 | 4 | 4 | restaurant | date/friends | 意大利菜 | 海鲜意面 | yimian |
| 奶油蘑菇牛排饭 | western | western-generic | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | solo/friends | 西餐厅 | 奶油蘑菇牛排饭 |  |
| 芝士焗龙虾 | western | western-generic | treat | meal | dinner | 0 | 解馋/高蛋白 | 4 | 5 | restaurant | date/friends | 西餐厅 | 芝士焗龙虾 |  |
| 烤羊排 | western | western-generic | treat | meal | dinner | 1 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | friends/date | 西餐厅 | 烤羊排 |  |
| 松露蘑菇意面 | western | western-italian | treat | meal | dinner | 0 | 解馋/高热量 | 4 | 4 | restaurant | date/friends | 意大利菜 | 松露蘑菇意面 | yimian |
| 西冷牛排配薯条 | western | western-american | treat | meal | dinner | 0 | 高热量/解馋/高蛋白 | 4 | 4 | restaurant | date/friends | 美式餐厅 | 西冷牛排配薯条 |  |
