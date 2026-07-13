"use client";

/**
 * 今日饭签（/water-concept）
 * ─────────────────────────────────────────────
 * 三屏流转：
 *  ① 筛选屏：选餐段 + 风味/心情/预算（复用抽取玩法的 FunnelFilter），点「开始投签」入场。
 *  ② 水占屏：投签入水 → 抽【一道菜】落水显影（菜名 + 签文 + 吉位）→ 再占 / 探店。
 *  ③ 探店屏：循此而去 → 真实查附近店，水底漂来三家可划看。
 *
 * 数据全真：抽菜走 useDivinationPick（复用 pick-core 的漏斗/加权/可用性门控），
 * 查店走 useShops（同 /api/shops）。签文/吉位来自 config/divination。
 */

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWaterDivination } from "@/hooks/useWaterDivination";
import { useDivinationPick } from "@/hooks/useDivinationPick";
import { useShops } from "@/hooks/useShops";
import { verseFor, gradeFor } from "@/config/divination";
import { addEntry } from "@/lib/diary";
import { logPick, type PickAction } from "@/lib/pick-log";
import { recordVisit } from "@/lib/regulars";
import WaterAmbience from "@/components/features/water/WaterAmbience";
import RippleLayer from "@/components/features/water/RippleLayer";
import DivinationSlip from "@/components/features/water/DivinationSlip";
import DriftCards, {
  type DriftShop,
} from "@/components/features/water/DriftCards";
import WaterDiaryPanel from "@/components/features/water/WaterDiaryPanel";
import WaterRecipePanel from "@/components/features/water/WaterRecipePanel";
import FunnelFilter from "@/components/features/water/FunnelFilter";
import MealSwitcher from "@/components/features/water/MealSwitcher";
import CityPicker from "@/components/features/water/CityPicker";
import StyleSwitch from "@/components/common/StyleSwitch";
import { mealMeta } from "@/config/meals";
import { keywordOf } from "@/lib/availability";
import type { Shop } from "@/types/shop";
import type { Food } from "@/types/food";

/** 距离 number(米) → 展示字符串。null/0 时留空。 */
function fmtDistance(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
}

/** 严格匹配≥这个数就够选了，不必展开第二层 */
const STRICT_ENOUGH = 4;

/** Shop[] → DriftShop[]：emoji 用抽中那道菜的（店铺数据本身没 emoji）。
 *  tier="expansion" 的店带 category 标签（这家是哪类、为什么可能也卖）。 */
function toDriftShops(
  shops: Shop[],
  emoji: string,
  tier: "strict" | "expansion" = "strict",
): DriftShop[] {
  return shops.map((s) => ({
    id: s.id,
    emoji,
    name: s.name,
    distance: fmtDistance(s.distance),
    location: s.location,
    tier,
    category: s.category ?? null,
  }));
}

/** idle 签纸悬浮时的占位文案（还没抽，纸是空白的） */
const EMPTY_REVEAL = { emoji: "", name: "", verse: "", grade: undefined };

export default function WaterConceptPage() {
  const w = useWaterDivination();
  const div = useDivinationPick();
  const { shops, expansion, loading, error, fetched, needCity, fetchShops } = useShops();

  // 是否已离开筛选屏、进入水占场景
  const [entered, setEntered] = useState(false);
  // 覆盖面板：null=水占主流程 / "diary"=干饭日记 / "recipes"=自己做翻菜谱
  const [panel, setPanel] = useState<null | "diary" | "recipes">(null);
  // 水占途中临时调口味的浮层（突然想吃某类时，不退出场景就能改 tag）
  const [quickFilter, setQuickFilter] = useState(false);

  // 候选篮：连占时攒下的菜（不含当前签面那道，那道还在 div.pick）。
  // 「定了」时把篮子 + 当前签面合并去重，作为一条干饭记录一次性写入。
  const [basket, setBasket] = useState<Food[]>([]);
  // 本轮已见过的菜 id（篮子 ∪ 跳过的 ∪ 当前签面）：传给 cast 硬排除，本轮定下前不重复。
  // 用 ref 同步累积——recast 是异步的，要在调 cast 前一刻就把当前签面记进去，避免闭包拿旧值。
  // 与跨天的 recentFoodIds 降权正交：那个是「最近吃过」，这个是「这一轮已经看过」。
  const seenRef = useRef<Set<string>>(new Set());
  // 本轮该「家族∩餐段」是否已翻遍（cast 返回 exhausted）：true 时停在水面提示换筛选，
  // 不硬抽重复（A 方案）。换筛选 / 重新占 / 返回首页都会清掉它。
  const [exhausted, setExhausted] = useState(false);
  // 已定下的整桌（进探店后用；非空即「已定」，决定按钮形态 + 探店切菜）。
  const [confirmed, setConfirmed] = useState<Food[]>([]);
  // 探店时当前正在看哪道菜的店（confirmed 里的某道 id）。
  const [exploringId, setExploringId] = useState<string | null>(null);
  // 抽签并发硬锁：cast 是异步（定位 + 可用性查店可能很慢），若不锁，
  // 快速重复点「投签/留下/换一道/重新占/就按这个」会启动多个 cast，晚返回的会
  // 覆盖早返回的签面，且 seenRef/篮子/动画 phase 可能串线。ref 立即生效（不等重渲染），
  // state 只用于 disable 按钮。div.verifying 只反映 hook 内部一次抽取，不足以拦住页面层连点。
  const castingRef = useRef(false);
  const [casting, setCasting] = useState(false);

  const committed = confirmed.length > 0;
  const splashing = w.phase === "splash" || w.phase === "revealing";
  const showLever = w.phase === "idle";
  const showActions = w.phase === "revealed";
  const current = mealMeta(div.meal);

  // 签面内容：抽中那道菜 + 随机签文 + 按属性吉位。
  // 依赖 pick.id，保证同一签期间 verse 不会每次渲染重抽。
  const reveal = useMemo(() => {
    if (!div.pick) return EMPTY_REVEAL;
    return {
      emoji: div.pick.emoji,
      name: div.pick.name,
      verse: verseFor(),
      grade: gradeFor(div.pick),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [div.pick?.id]);

  // 投签：先抽菜（含定位+可用性门控），定下来再启动落水动画，避免签纸落下时还没菜。
  // 首签——本轮还没见过任何菜，seen 传当前累积（正常为空）。
  const onCast = async () => {
    if (castingRef.current) return; // 并发硬锁：一次只允许一个 cast 在途
    castingRef.current = true;
    setCasting(true);
    try {
      const { food, exhausted } = await div.cast(seenRef.current);
      if (food) {
        seenRef.current.add(food.id);
        setExhausted(false);
        w.cast();
      } else if (exhausted) {
        setExhausted(true);
      }
    } finally {
      castingRef.current = false;
      setCasting(false);
    }
  };

  // 直接再抽一签：回到水面（隐去旧签面）后立刻投签抽新菜并落水，
  // 不再停在「投签入水」按钮等用户二次点击。div 不 reset。
  // 关键：抽之前把「当前签面」记进 seen——无论用户留下还是跳过，它都已被看过，本轮不该再现。
  const recastNow = async () => {
    if (castingRef.current) return; // 并发硬锁：与 onCast 共用，杜绝多个 cast 串线
    castingRef.current = true;
    setCasting(true);
    try {
      if (div.pick) seenRef.current.add(div.pick.id);
      w.reset(); // phase→idle，旧签面隐去（这一拍批量更新，紧接 cast 转 casting，不会真停在 idle）
      const { food, exhausted } = await div.cast(seenRef.current);
      if (food) {
        seenRef.current.add(food.id);
        setExhausted(false);
        w.cast();
      } else if (exhausted) {
        // 这个口味∩餐段都翻遍了：不硬抽重复，停在水面提示用户换筛选（A 方案）。
        setExhausted(true);
      }
    } finally {
      castingRef.current = false;
      setCasting(false);
    }
  };

  // 埋点：记录当前签面那道菜的处置（accept/reroll）。纯本地、只记录、不改任何抽签行为。
  // budget 取自当前筛选，用于将来切「想吃好的时各实体接受率」这类条件信号。
  const logCurrent = (action: PickAction) => {
    if (div.pick) logPick(div.pick, div.filters.budget, action, Date.now());
  };

  // 攒一道再占：把当前签面收入候选篮，然后立刻抽下一签（连占）。
  const onAddAndRecast = () => {
    if (div.pick) {
      logCurrent("accept"); // 留下 = 接受当前签面
      setBasket((prev) =>
        prev.some((f) => f.id === div.pick!.id) ? prev : [...prev, div.pick!],
      );
    }
    void recastNow();
  };

  // 不要当前这道、但保留已攒的：直接抽下一签（cast 内部自动避开刚抽的这道）。
  const onSkipAndRecast = () => {
    logCurrent("reroll"); // 换一道 = 拒绝当前签面
    void recastNow();
  };

  // 不收这道、单纯换一签（已定后从头开始也走这里）：清空已定/篮子，重抽。
  // 「这套都不要，重新占」——本轮重来，seen 清空。
  const onFreshRecast = () => {
    logCurrent("reroll"); // 这套都不要 = 拒绝当前签面
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false); // 新一轮，清掉「翻遍了」
    void recastNow();
  };

  // 从候选篮移除某道（抽到不想要的可丢掉）
  const removeFromBasket = (id: string) => {
    setBasket((prev) => prev.filter((f) => f.id !== id));
  };

  // 把一桌菜定下来：写一条干饭日记（含全部菜），进探店看第一道。
  // 一桌定了 = 本轮决策结束，seen 清空（下次从头占不受这轮影响）。
  const commitTable = (table: Food[]) => {
    if (table.length === 0) return;
    addEntry(table, div.meal, Date.now());
    setConfirmed(table);
    setBasket([]);
    seenRef.current = new Set();
    setExhausted(false);
    const first = table[0];
    setExploringId(first.id);
    w.explore();
    fetchShops(keywordOf(first));
  };

  // 定了（含当前签面）：候选篮 + 当前这道合并去重 = 今天这一桌。
  // 篮子为空时就是「只定当前这一道」；有篮子时把当前这道也算上。
  const onConfirm = () => {
    logCurrent("accept"); // 定了 = 接受当前签面
    const table: Food[] = [];
    for (const f of [...basket, ...(div.pick ? [div.pick] : [])]) {
      if (!table.some((x) => x.id === f.id)) table.push(f);
    }
    commitTable(table);
  };

  // 只定已攒的这几道（不要当前签面这道）：篮子非空时给的出口，
  // 解决「抽到第三道不想要、但要定下前两道」——按逻辑就该是 2 道，不被迫凑 3 道。
  const onConfirmBasketOnly = () => {
    logCurrent("reroll"); // 不要当前这道 = 拒绝当前签面
    commitTable([...basket]);
  };

  // 返回首页（筛选屏）：清空全部水占状态，回到「开始投签」。
  const onHome = () => {
    w.reset();
    div.reset();
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false);
    setQuickFilter(false);
    setEntered(false);
  };

  // 改筛选（家族/餐段/预算/地区）会改变抽签池上下文，「翻遍了」不再成立——清掉它。
  // 包一层 div 的 setter，UI 一律用这几个，保证哪改都生效。
  const onChangeFilters = (next: typeof div.filters) => {
    setExhausted(false);
    div.setFilters(next);
  };
  const onChangeMeal = (next: typeof div.meal) => {
    setExhausted(false);
    div.setMeal(next);
  };
  const onChangeRegion = (next: typeof div.region) => {
    setExhausted(false);
    div.setRegion(next);
  };

  // 已定后再次「循此而去」：不重复记日记，直接回探店看当前那道。
  const onReExplore = () => {
    w.explore();
    const target = confirmed.find((f) => f.id === exploringId) ?? confirmed[0];
    if (target) fetchShops(keywordOf(target));
  };

  // 探店里切看另一道菜的店
  const onPickExploreDish = (id: string) => {
    const target = confirmed.find((f) => f.id === id);
    if (!target) return;
    setExploringId(id);
    fetchShops(keywordOf(target));
  };

  // 点「一键导航」跳高德那下记常客信号（真意图，喂给已在读取的熟悉度加权）。
  // 用当前正在探店的那道菜作上下文（多道时取 exploringId）。
  const onVisitShop = (shop: DriftShop) => {
    const food =
      confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;
    if (!food) return;
    recordVisit(
      {
        shopId: shop.id,
        shopName: shop.name,
        foodId: food.id,
        cuisine: food.cuisine,
        kind: food.kind,
      },
      Date.now(),
    );
  };

  // 定位失败时用户手输城市后重查（城市兜底）。
  const onPickCity = (city: string) => {
    const target =
      confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;
    if (target) fetchShops(keywordOf(target), city);
  };

  // 当前正在探店的菜（emoji / 名字用它）
  const exploringFood =
    confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;

  // 展示用店（两级）：先严格匹配；严格 < STRICT_ENOUGH 时把第二层「同类店」
  // 也拼进漂卡流（带 category 标签），让选择太少时也有得挑。emoji 用当前探店那道菜的。
  const emoji = exploringFood?.emoji ?? "🍜";
  const strictDrift = toDriftShops(shops, emoji, "strict");
  const expansionDrift =
    shops.length < STRICT_ENOUGH
      ? toDriftShops(expansion, emoji, "expansion")
      : [];
  const driftShops = [...strictDrift, ...expansionDrift];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* —— 背景层：清冷冰川碧径向渐变 —— */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #f0f7f4 0%, #e4efea 45%, #d3e4df 100%)",
        }}
      />

      <WaterAmbience />

      {/* 涟漪交互层：常驻渲染（筛选屏也在），点裸露水面起涟漪；
          签纸卡 / 控件等 PE-auto 元素会吞掉点击，不冒涟漪。 */}
      <RippleLayer
        taps={w.taps}
        splashing={splashing}
        onTap={w.spawnTap}
        onTapDone={w.removeTap}
      />

      {/* 顶部标题 */}
      <div className="pointer-events-none absolute top-10 z-40 w-full text-center">
        <div className="text-xl tracking-[0.5em] text-brand-soft">今 日 饭 签</div>
        <div className="mt-2 text-[11px] tracking-[0.4em] text-brand-soft/60">
          MODERN WATER DIVINATION
        </div>
      </div>

      {/* ===== ① 筛选屏 ===== */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="filter"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center gap-6 overflow-y-auto px-6 pb-10 pt-32"
          >
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-brand-soft/70">
                当前 {current.emoji} {current.label} · {current.range}
              </span>
              <MealSwitcher value={div.meal} onChange={onChangeMeal} />
            </div>
            <div className="pointer-events-auto">
              <FunnelFilter
                value={div.filters}
                onChange={onChangeFilters}
                region={div.region}
                onRegionChange={onChangeRegion}
              />
            </div>
            <button
              onClick={() => setEntered(true)}
              className="water-action-primary pointer-events-auto rounded-full px-10 py-4 text-base font-medium tracking-[0.2em] text-ink/80"
            >
              开 始 投 签
            </button>

            {/* 两个弱入口：翻菜谱（自己做）/ 干饭日记。不抢主流程，藏在投签按钮下方。 */}
            <div className="pointer-events-auto flex items-center gap-5 text-xs tracking-[0.2em] text-brand-soft/70">
              <button
                onClick={() => setPanel("recipes")}
                className="transition-colors hover:text-accent"
              >
                🍳 自己做
              </button>
              <span className="text-brand-soft/30">·</span>
              <button
                onClick={() => setPanel("diary")}
                className="transition-colors hover:text-accent"
              >
                📖 我的干饭日记
              </button>
              <span className="text-brand-soft/30">·</span>
              {/* 风格切换（低干扰）：切到新版菜单板，记住选择。与两个弱入口
                  同排、同字重，不抢「开始投签」主 CTA。 */}
              <StyleSwitch
                to="menu"
                className="transition-colors hover:text-accent"
              >
                ✨ 新版菜单板
              </StyleSwitch>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 覆盖面板：自己做翻菜谱 / 干饭日记（浮在水面上）===== */}
      <AnimatePresence>
        {panel === "recipes" && (
          <WaterRecipePanel key="recipes" onClose={() => setPanel(null)} />
        )}
        {panel === "diary" && (
          <WaterDiaryPanel key="diary" onClose={() => setPanel(null)} />
        )}
      </AnimatePresence>

      {/* ===== ② 水占屏（进场后渲染签纸 + 探店）===== */}
      {entered && (
        <>
          {/* 顶部常驻控制条：随时回首页 / 途中临时调口味（探店时藏起，那屏自带返回） */}
          {w.phase !== "exploring" && (
            <div className="pointer-events-none absolute inset-x-0 top-8 z-40 flex items-center justify-between px-5">
              <button
                onClick={onHome}
                className="water-glass-panel pointer-events-auto rounded-full px-3.5 py-2 text-xs tracking-[0.15em] text-ink/70 transition-colors hover:text-accent"
              >
                🏠 首页
              </button>
              <button
                onClick={() => setQuickFilter(true)}
                className="water-glass-panel pointer-events-auto rounded-full px-3.5 py-2 text-xs tracking-[0.15em] text-ink/70 transition-colors hover:text-accent"
              >
                🎚 口味
              </button>
            </div>
          )}

          {/* 途中调口味浮层：改完即时生效，下次投签/换一道按新口味；不退场景、不丢候选篮 */}
          <AnimatePresence>
            {quickFilter && (
              <motion.div
                key="quick-filter"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-50 flex items-center justify-center px-5"
                style={{
                  background: "rgba(227,239,234,0.55)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
                onClick={() => setQuickFilter(false)}
              >
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 16, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[82vh] w-full max-w-md flex-col items-center gap-5 overflow-y-auto rounded-3xl border border-white/60 bg-white/85 px-6 py-7 backdrop-blur-md"
                  style={{ boxShadow: "0 20px 50px rgba(63,143,208,0.2)" }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm tracking-[0.25em] text-brand-soft">
                      临 时 换 个 口 味
                    </span>
                    <p className="text-xs text-ink-muted/60">
                      突然想吃别的？改完下一签就按它来
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-brand-soft/70">
                      {current.emoji} {current.label} · {current.range}
                    </span>
                    <MealSwitcher value={div.meal} onChange={onChangeMeal} />
                  </div>
                  <FunnelFilter
                    value={div.filters}
                    onChange={onChangeFilters}
                    region={div.region}
                    onRegionChange={onChangeRegion}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setQuickFilter(false)}
                      className="water-glass-strong rounded-full px-6 py-3 text-sm font-medium text-ink/70"
                    >
                      调好了
                    </button>
                    <button
                      onClick={() => {
                        setQuickFilter(false);
                        void recastNow();
                      }}
                      disabled={casting}
                      className="water-action-primary rounded-full px-6 py-3 text-sm font-medium text-ink/80 disabled:opacity-50"
                    >
                      就按这个，占一签 →
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <DivinationSlip
            phase={w.phase}
            contentVisible={w.contentVisible}
            reveal={reveal}
            onAlighted={w.onSlipAlighted}
          />

          {/* ===== ③ 探店屏（仅 exploring）===== */}
          <AnimatePresence>
            {w.phase === "exploring" && (
              <DriftExplore
                loading={loading}
                fetched={fetched}
                error={error}
                needCity={needCity}
                shops={driftShops}
                dishName={exploringFood?.name ?? ""}
                dishes={confirmed}
                activeId={exploringId}
                onPickDish={onPickExploreDish}
                onPickCity={onPickCity}
                onVisit={onVisitShop}
                onClose={w.backToSlip}
                onHome={onHome}
              />
            )}
          </AnimatePresence>

          {/* —— 底部控制 —— */}
          <div className="absolute bottom-12 z-40 flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              {showLever && (
                <motion.div
                  key="lever"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col items-center gap-3"
                >
                  {exhausted && (
                    // 这个口味∩餐段都翻遍了：老实说，不硬抽重复（A 方案）。
                    <div className="flex max-w-[80vw] flex-col items-center gap-2 rounded-2xl border border-white/55 bg-white/55 px-5 py-3 text-center backdrop-blur">
                      <p className="text-sm leading-relaxed text-ink/80">
                        这个口味的都给你翻遍啦
                        {basket.length > 0 ? "，已攒的可以直接定，或" : "，"}换个筛选再占？
                      </p>
                      {/* 已攒了菜时，翻遍了也别把篮子困死：给一条定下出口（修 exhausted 困住 basket）。 */}
                      {basket.length > 0 && (
                        <button
                          onClick={onConfirmBasketOnly}
                          className="text-sm font-medium tracking-[0.12em] text-ink/80 transition-colors hover:text-accent"
                        >
                          定下已攒的 {basket.length} 道 →
                        </button>
                      )}
                      <button
                        onClick={() => setQuickFilter(true)}
                        className="text-xs tracking-[0.15em] text-accent transition-colors hover:text-accent-hot"
                      >
                        🎚 换个口味
                      </button>
                    </div>
                  )}
                  <motion.button
                    onClick={onCast}
                    disabled={casting || div.verifying || exhausted}
                    whileTap={{ scale: 0.94 }}
                    className="water-action-primary rounded-full px-10 py-4 text-base font-medium tracking-[0.2em] text-ink/80 disabled:opacity-50"
                  >
                    {div.verifying
                      ? "🛰️ 问 签 中…"
                      : exhausted
                        ? "这类都翻遍了"
                        : "投 签 入 水"}
                  </motion.button>
                </motion.div>
              )}

              {showActions && committed && (
                // 已定过这一桌（从探店收回签纸回来）：不再重复记日记。
                // 要么再去看店，要么整桌作废从头占。
                <motion.div
                  key="committed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex max-w-[88vw] flex-wrap items-center justify-center gap-1.5">
                    {confirmed.map((f) => (
                      <span
                        key={f.id}
                        className="flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-xs text-ink/75 backdrop-blur"
                      >
                        <span>{f.emoji}</span>
                        <span className="max-w-[6rem] truncate">{f.name}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onReExplore}
                      className="water-action-primary rounded-full px-6 py-3 text-sm font-medium text-ink/80"
                    >
                      循此而去 →
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={onFreshRecast}
                      disabled={casting}
                      className="text-xs tracking-[0.15em] text-brand-soft/60 transition-colors hover:text-accent disabled:opacity-50"
                    >
                      ↻ 重新占一桌
                    </button>
                    <button
                      onClick={onHome}
                      className="text-xs tracking-[0.15em] text-brand-soft/60 transition-colors hover:text-accent"
                    >
                      🏠 返回首页
                    </button>
                  </div>
                </motion.div>
              )}

              {showActions && !committed && (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col items-center gap-3"
                >
                  {/* 候选篮：连占攒下的菜 + 当前签面（待定）。点 × 丢掉不想要的。 */}
                  {(basket.length > 0 || div.pick) && (
                    <div className="flex max-w-[88vw] flex-wrap items-center justify-center gap-1.5">
                      {basket.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => removeFromBasket(f.id)}
                          title="点一下丢掉这道"
                          className="group flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-xs text-ink/75 backdrop-blur transition-colors hover:border-accent-pink/50"
                          style={{ boxShadow: "0 2px 8px rgba(150,179,170,0.15)" }}
                        >
                          <span>{f.emoji}</span>
                          <span className="max-w-[6rem] truncate">{f.name}</span>
                          <span className="text-ink-muted/40 group-hover:text-accent-pink">
                            ×
                          </span>
                        </button>
                      ))}
                      {div.pick && (
                        <span
                          className="flex items-center gap-1 rounded-full border border-dashed border-brand/40 px-2.5 py-1 text-xs text-brand-soft"
                          title="当前这道：留下会进篮子，换一道会跳过它"
                        >
                          <span>{div.pick.emoji}</span>
                          <span className="max-w-[6rem] truncate">
                            {div.pick.name}
                          </span>
                          <span className="text-brand-soft/50">这道</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={onAddAndRecast}
                      disabled={casting}
                      className="water-glass-strong rounded-full px-5 py-3 text-sm font-medium text-ink/70 disabled:opacity-50"
                    >
                      ＋ 留下，再占
                    </button>
                    <button
                      onClick={onSkipAndRecast}
                      disabled={casting}
                      className="water-glass-subtle rounded-full px-5 py-3 text-sm font-medium text-ink/65 disabled:opacity-50"
                    >
                      ↻ 换一道
                    </button>
                    <button
                      onClick={onConfirm}
                      className="water-action-primary rounded-full px-6 py-3 text-sm font-medium text-ink/80"
                    >
                      定了 · 共 {basket.length + (div.pick ? 1 : 0)} 道 →
                    </button>
                  </div>

                  {/* 已攒了菜时，给一条「不要当前这道、只定已攒的」出口：
                      抽到第三道不想要也能只定前两道，不被迫凑够当前这道。 */}
                  <div className="flex flex-col items-center gap-1.5">
                    {basket.length > 0 && (
                      <button
                        onClick={onConfirmBasketOnly}
                        className="text-xs tracking-[0.12em] text-brand-soft/75 transition-colors hover:text-accent"
                      >
                        不要这道，只定已攒的 {basket.length} 道 →
                      </button>
                    )}
                    <button
                      onClick={onFreshRecast}
                      disabled={casting}
                      className="text-xs tracking-[0.15em] text-brand-soft/55 transition-colors hover:text-accent disabled:opacity-50"
                    >
                      ↻ 这套都不要，重新占
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </main>
  );
}

/**
 * 探店层包装：处理 loading / 定位失败选城市 / 有店 / 真空 四态。
 * DriftCards 只管渲染卡片，其余状态在这里兜（loading/需选城市/有店/真空 都不留白）。
 */
function DriftExplore({
  loading,
  fetched,
  error,
  needCity,
  shops,
  dishName,
  dishes,
  activeId,
  onPickDish,
  onPickCity,
  onVisit,
  onClose,
  onHome,
}: {
  loading: boolean;
  fetched: boolean;
  /** useShops 的错误信息；非空 = 真·查询失败（区别于「搜完 0 家」），要如实提示+给重试，别伪装成「附近没有」 */
  error: string | null;
  needCity: boolean;
  shops: DriftShop[];
  dishName: string;
  /** 已定的整桌；>1 道时顶部出现切菜 chips */
  dishes: Food[];
  activeId: string | null;
  onPickDish: (id: string) => void;
  onPickCity: (city: string) => void;
  onVisit: (shop: DriftShop) => void;
  onClose: () => void;
  /** 返回首页（筛选屏），重置全部状态 */
  onHome: () => void;
}) {
  // 多道菜时，顶部一排可切换的菜 chip：点哪道看哪道的店。
  const switcher =
    dishes.length > 1 ? (
      <div className="pointer-events-auto absolute left-1/2 top-20 z-40 flex max-w-[88vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
        {dishes.map((f) => {
          const active = f.id === activeId;
          return (
            <button
              key={f.id}
              onClick={() => onPickDish(f.id)}
              aria-pressed={active}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs backdrop-blur transition-colors"
              style={{
                background: active
                  ? "rgba(150,179,170,0.45)"
                  : "rgba(255,255,255,0.5)",
                border: active
                  ? "1px solid rgba(255,255,255,0.8)"
                  : "1px solid rgba(255,255,255,0.45)",
                color: active ? "rgb(var(--c-ink))" : "rgb(var(--c-brand-soft))",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span>{f.emoji}</span>
              <span className="max-w-[6rem] truncate">{f.name}</span>
            </button>
          );
        })}
      </div>
    ) : null;

  // 有店（严格 shops 或第二层扩展店）→ 漂卡
  if (!loading && fetched && shops.length > 0) {
    return (
      <>
        {switcher}
        <DriftCards
          shops={shops}
          onClose={onClose}
          onVisit={onVisit}
          onHome={onHome}
        />
      </>
    );
  }

  return (
    <motion.div
      className="water-depth-overlay absolute inset-0 z-30 flex flex-col items-center justify-end pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {switcher}
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <p className="mb-20 text-sm tracking-[0.2em] text-brand-soft">
            — 正在水底寻店… —
          </p>
          <button
            onClick={onClose}
            className="text-sm text-brand-soft transition-colors hover:text-accent"
          >
            ↑ 收回签纸
          </button>
        </div>
      ) : needCity ? (
        // 定位失败：让用户手输城市兜底
        <div className="mb-16 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-brand/20 bg-white/85 px-5 py-4 backdrop-blur-md">
          <p className="text-center text-xs leading-relaxed text-ink-muted/80">
            没拿到你的位置，滚动选个城市，看看哪儿能吃到「{dishName}」：
          </p>
          <CityPicker onConfirm={onPickCity} />
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      ) : error && !needCity ? (
        // 真·查询失败（网络/接口报错）：如实说，给重试，别伪装成「附近没有」误导用户。
        <div className="mb-16 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-accent-pink/30 bg-white/85 px-5 py-4 text-center backdrop-blur-md">
          <p className="text-sm leading-relaxed text-accent-pink">{error}</p>
          <p className="text-xs text-ink-muted/70">网络或服务出了点岔子，不是附近没有。</p>
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      ) : (
        // 真·附近没有（高德也翻不出相关店）
        <div className="flex flex-col items-center gap-3">
          <p className="mb-20 text-sm tracking-[0.2em] text-brand-soft">
            — 这会儿附近没寻到卖「{dishName}」的店，换一签试试 —
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-sm text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-sm text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
