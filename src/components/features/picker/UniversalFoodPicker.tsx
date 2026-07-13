"use client";

/**
 * Universal Food Picker / 全民今日吃啥机（主编排器）
 * ─────────────────────────────────────────────
 * /picker 的大脑 + 四屏流转，明亮 organic 主题，去水占化：
 *   choose  —— 选餐段 + 轻筛选 + 发光主按钮「帮我选一个」；下方两个弱入口（自己做/吃饭记录）
 *   picking —— 克制的 organic 轻悬念（emoji 轻晃 + 底衬 morph blob），承接慢网络
 *   result  —— 主角菜卡（DishReveal，glow reveal）+ 候选篮 + 动作区
 *   shops   —— 附近店（ShopResults，暖色卡片列表）
 *
 * 复用（逻辑零改）：useDivinationPick（抽取）+ useShops（查店）+ MenuFilter（填空
 * 句式筛选）/ MealSwitcher（餐段）+ RecipePanelV2 / DiaryPanelV2（次入口轻壳）。
 * 编排逻辑（basket/seenRef/exhausted/confirmed/exploringId/并发锁/commitTable…）
 * 从旧 water-concept/page.tsx 原样搬来——只是不再挂 useWaterDivination 的落水相位，
 * 改用本地 PickerPhase。副作用（logPick/recordVisit/addEntry）全部保留。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDivinationPick } from "@/hooks/useDivinationPick";
import { useShops } from "@/hooks/useShops";
import { addEntry } from "@/lib/diary";
import { logPick, type PickAction } from "@/lib/pick-log";
import { recordVisit } from "@/lib/regulars";
import { keywordOf } from "@/lib/availability";
import { mealTaglines } from "@/config/meals";
import MenuFilter from "./MenuFilter";
import MealTabs from "./MealTabs";
import DishReveal from "./DishReveal";
import ShopResults, { type ShopCard } from "./ShopResults";
import RecipePanelV2 from "./RecipePanelV2";
import DiaryPanelV2 from "./DiaryPanelV2";
import StyleSwitch from "@/components/common/StyleSwitch";
import {
  PICK_CTA,
  PICKING_LINES,
  RESULT_LINES,
  RESULT_ACTIONS,
  RESULT_LABELS,
  EXHAUSTED_HINT,
  SIDE_ENTRIES,
  HERO,
  randomLine,
} from "./picker-copy";
import type { Shop } from "@/types/shop";
import type { Food } from "@/types/food";

/** 严格匹配 ≥ 这个数就够选了，不必展开第二层扩展店（沿用旧页阈值）。 */
const STRICT_ENOUGH = 4;

/** 四相位：选择 → 挑选中 → 结果 → 探店。 */
type PickerPhase = "choose" | "picking" | "result" | "shops";

/** 距离 number(米) → 展示字符串。null 时留空。 */
function fmtDistance(d: number | null): string {
  if (d === null) return "";
  return d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
}

/** Shop[] → ShopCard[]：emoji 用当前探店那道菜的。 */
function toShopCards(
  shops: Shop[],
  emoji: string,
  tier: "strict" | "expansion",
): ShopCard[] {
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

export default function UniversalFoodPicker() {
  const div = useDivinationPick();
  const { shops, expansion, loading, error, needCity, fetched, fetchShops, clear } =
    useShops();

  const [phase, setPhase] = useState<PickerPhase>("choose");
  // 覆盖面板：null=主流程 / "cook"=自己做 / "diary"=吃饭记录
  const [panel, setPanel] = useState<null | "cook" | "diary">(null);

  // 候选篮：连抽时攒下的菜（不含当前 result 那道，那道在 div.pick）。
  const [basket, setBasket] = useState<Food[]>([]);
  // 本轮已见过的菜 id（篮子 ∪ 跳过 ∪ 当前）：传给 cast 硬排除，定下前不重复。
  const seenRef = useRef<Set<string>>(new Set());
  // 本轮该「家族∩餐段」是否翻遍（cast 返回 exhausted）：停在提示不硬抽重复（A 方案）。
  const [exhausted, setExhausted] = useState(false);
  // 已定的整桌（进探店后用）。
  const [confirmed, setConfirmed] = useState<Food[]>([]);
  // 探店时当前正在看哪道菜的店。
  const [exploringId, setExploringId] = useState<string | null>(null);
  // 抽取并发硬锁：cast 异步（定位+可用性），不锁会多 cast 串线覆盖。ref 立即生效。
  const castingRef = useRef(false);
  const [casting, setCasting] = useState(false);
  // picking 悬念句（每次进 picking 随机取一条，客户端取避免 SSR 不一致）。
  const [pickingLine, setPickingLine] = useState(PICKING_LINES[0]);

  // choose 屏 tagline / result 暖话：随机值一律在挂载后（effect）定，
  // 绝不在渲染期调 Math.random——否则 SSR 与客户端各抽一次会 hydration mismatch
  // （meals.ts 已就此明确警告）。SSR 出稳定占位，客户端挂载后再随机。
  const [tagline, setTagline] = useState("");
  useEffect(() => {
    const pool = mealTaglines[div.meal];
    setTagline(pool[Math.floor(Math.random() * pool.length)]);
  }, [div.meal]);

  // result 页那句暖话：依赖 pick.id，换一道时重取一句；同一道菜期间稳定。
  const [resultLine, setResultLine] = useState("");
  useEffect(() => {
    if (div.pick) setResultLine(randomLine(RESULT_LINES));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [div.pick?.id]);

  // ——— 抽取（含定位+可用性门控）：进 picking 悬念 → 出结果或翻遍提示 ———
  const runCast = useCallback(
    async (opts?: { fresh?: boolean }) => {
      if (castingRef.current) return; // 并发硬锁
      castingRef.current = true;
      setCasting(true);
      setPickingLine(randomLine(PICKING_LINES));
      setPhase("picking");
      try {
        // 轻量载入：给 picking 一个最短 700ms 的悬念窗（餐盘转一圈的时长），
        // 让「点了→在挑→出结果」有节奏；本地秒出时也不会一闪而过。
        // 与真实抽取并行，取较慢者，不额外拖慢慢网络。
        const minSuspense = new Promise((r) => setTimeout(r, 700));
        const [{ food, exhausted: ex }] = await Promise.all([
          div.cast(seenRef.current),
          minSuspense,
        ]);
        if (food) {
          seenRef.current.add(food.id);
          setExhausted(false);
          setPhase("result");
        } else if (ex) {
          setExhausted(true);
          // 翻遍了：退回 choose 展示提示（不硬抽重复）。fresh 时已清 pick。
          setPhase(opts?.fresh ? "choose" : "result");
        } else {
          setPhase("choose");
        }
      } finally {
        castingRef.current = false;
        setCasting(false);
      }
    },
    [div],
  );

  // 埋点：记录当前 result 那道菜的处置（accept/reroll）。纯本地，不改抽签行为。
  const logCurrent = (action: PickAction) => {
    if (div.pick) logPick(div.pick, div.filters.budget, action, Date.now());
  };

  // 主按钮 tap 反馈：点一下播放一次 press+glow（class 加上，animationend 卸下），
  // 非常驻闪、非仅 active:scale。动画跑完再进 picking，节奏更明确。
  const pickBtnRef = useRef<HTMLButtonElement | null>(null);

  // 首次「帮我选一个」：本轮还没见过任何菜。
  const onPick = () => {
    const btn = pickBtnRef.current;
    if (btn) {
      btn.classList.remove("picker-press-glow");
      // 强制 reflow，保证连点也能重新触发动画
      void btn.offsetWidth;
      btn.classList.add("picker-press-glow");
    }
    void runCast();
  };

  // 换一个：把当前记进 seen（无论如何本轮不再现），再抽下一道。
  const recastNow = useCallback(async () => {
    if (castingRef.current) return;
    if (div.pick) seenRef.current.add(div.pick.id);
    await runCast();
  }, [div.pick, runCast]);

  // 留下当前 + 再抽一道（连抽攒篮子）。
  const onAddAndRecast = () => {
    if (div.pick) {
      logCurrent("accept");
      setBasket((prev) =>
        prev.some((f) => f.id === div.pick!.id) ? prev : [...prev, div.pick!],
      );
    }
    void recastNow();
  };

  // 不要当前这道、保留已攒的：直接抽下一道（cast 内部自动避开刚抽的）。
  const onSkipAndRecast = () => {
    logCurrent("reroll");
    void recastNow();
  };

  // 这套都不要、重新开始：清空已定/篮子/seen，重抽。
  const onFreshRecast = () => {
    logCurrent("reroll");
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false);
    void runCast({ fresh: true });
  };

  // 从候选篮移除某道。
  const removeFromBasket = (id: string) => {
    setBasket((prev) => prev.filter((f) => f.id !== id));
  };

  // 定一桌：写一条吃饭记录（含全部菜），进探店看第一道。
  const commitTable = (table: Food[]) => {
    if (table.length === 0) return;
    addEntry(table, div.meal, Date.now());
    setConfirmed(table);
    setBasket([]);
    seenRef.current = new Set();
    setExhausted(false);
    const first = table[0];
    setExploringId(first.id);
    setPhase("shops");
    fetchShops(keywordOf(first));
  };

  // 定了（含当前 result 这道）：篮子 + 当前合并去重 = 今天这一桌。
  const onConfirm = () => {
    logCurrent("accept");
    const table: Food[] = [];
    for (const f of [...basket, ...(div.pick ? [div.pick] : [])]) {
      if (!table.some((x) => x.id === f.id)) table.push(f);
    }
    commitTable(table);
  };

  // 只定已攒的（不要当前这道）。
  const onConfirmBasketOnly = () => {
    logCurrent("reroll");
    commitTable([...basket]);
  };

  // 返回首页（choose）：清空全部状态。
  const onHome = () => {
    div.reset();
    clear();
    setBasket([]);
    setConfirmed([]);
    setExploringId(null);
    seenRef.current = new Set();
    setExhausted(false);
    setPhase("choose");
  };

  // 改筛选/餐段/地区会改变抽签池上下文，「翻遍了」不再成立——清掉它。
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

  // 从探店返回结果页（不重复记日记）。
  const onBackToResult = () => {
    setPhase("result");
  };

  // 探店里切看另一道菜的店。
  const onPickExploreDish = (id: string) => {
    const target = confirmed.find((f) => f.id === id);
    if (!target) return;
    setExploringId(id);
    fetchShops(keywordOf(target));
  };

  // 点「去这儿」跳高德那下记常客信号（真意图）。
  const onVisitShop = (card: ShopCard) => {
    const food =
      confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;
    if (!food) return;
    recordVisit(
      {
        shopId: card.id,
        shopName: card.name,
        foodId: food.id,
        cuisine: food.cuisine,
        kind: food.kind,
      },
      Date.now(),
    );
  };

  // 定位失败手输城市后重查。
  const onPickCity = (city: string) => {
    const target =
      confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;
    if (target) fetchShops(keywordOf(target), city);
  };

  // 当前正在探店的菜（emoji/名字用它）。
  const exploringFood =
    confirmed.find((f) => f.id === exploringId) ?? confirmed[0] ?? div.pick;

  // 展示用店（两级）：严格匹配 + 严格不足时补扩展店。emoji 用当前探店那道菜的。
  const emoji = exploringFood?.emoji ?? "🍜";
  const strictCards = toShopCards(shops, emoji, "strict");
  const expansionCards =
    shops.length < STRICT_ENOUGH ? toShopCards(expansion, emoji, "expansion") : [];
  const shopCards = [...strictCards, ...expansionCards];

  const basketCount = basket.length + (div.pick ? 1 : 0);

  // isolate：建独立层叠上下文，背景层用正 z（z-0）稳在内容之下、
  // 又不会被负 z-index 压到 main 背后被父级白底盖住（曾导致「背景没加」）。
  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      {/* —— 语义背景层（z-0，全静态）：冷暖双区。
          上/右暖橙（食欲），左下压一块薄荷青（--c-info）作冷色，形成明显冷暖对比，
          不再是一整片浅橙。两个 radial 叠加：暖色主底 + 青色角落。 —— */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 82% -8%, #fff4e2 0%, #ffd9b0 42%, #ffb27a 100%)",
        }}
      />
      {/* 左下薄荷青冷区：明显但克制的第二色，和暖橙拉开冷暖 */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(95% 70% at 8% 108%, rgb(var(--c-info) / 0.42) 0%, rgb(var(--c-info) / 0.14) 40%, transparent 68%)",
        }}
      />
      {/* 静态斜带：一条暖 + 一条青，交叉给背景层次（纯装饰、不动） */}
      <div aria-hidden className="picker-warm-band absolute inset-0 z-0" />
      <div aria-hidden className="picker-cool-band absolute inset-0 z-0" />
      {/* 餐垫点阵纹：暖色圆点铺满，可见但克制，给空白肌理 */}
      <div aria-hidden className="picker-placemat absolute inset-0 z-0" />
      {/* organic 色块：右上暖锚点（带 idle 慢位移）+ 左侧一块明显青绿辅色（冷）+ 底部暖色。 */}
      <div
        aria-hidden
        className="picker-idle-drift absolute -right-24 top-[20%] z-0 h-72 w-72 rounded-[58%_42%_38%_62%/56%_58%_42%_44%] bg-accent/28 blur-[2px]"
      />
      <div
        aria-hidden
        className="absolute -left-20 top-[30%] z-0 h-64 w-64 rounded-[42%_58%_63%_37%/45%_42%_58%_55%] bg-info/24"
      />
      <div
        aria-hidden
        className="absolute -left-10 bottom-[24%] z-0 h-48 w-48 rounded-[46%_54%_57%_43%/52%_46%_54%_48%] bg-info/18"
      />
      {/* 底部桌面色带：暖色渐变横带，与主按钮形成一整块行动区（锚定 CTA） */}
      <div
        aria-hidden
        className="picker-table-band absolute inset-x-0 bottom-0 z-0 h-56"
      />

      {/* ===== 次入口面板（浮层）===== */}
      <AnimatePresence>
        {panel === "cook" && (
          <RecipePanelV2 key="cook" onClose={() => setPanel(null)} />
        )}
        {panel === "diary" && (
          <DiaryPanelV2 key="diary" onClose={() => setPanel(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ══════════ ① CHOOSE：今日菜单板 ══════════ */}
        {phase === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6"
          >
            {/* 顶栏：中文品牌突出（左，品牌字）+ 工具入口（右上角）。
                中文「今日菜单板」是主品牌标识，英文降级为极小副标，去模板感。 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-6 w-[3px] rounded-full bg-gradient-to-b from-accent-hot to-brand"
                />
                <div className="flex flex-col leading-none">
                  <span className="picker-brand text-lg text-ink">
                    {HERO.board}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-muted/50">
                    {HERO.brand}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPanel("cook")}
                  className="flex items-center gap-1 rounded-full border border-brand/30 bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink-muted transition-transform duration-100 active:scale-[0.94]"
                >
                  {SIDE_ENTRIES.cook.emoji} {SIDE_ENTRIES.cook.label}
                </button>
                <button
                  onClick={() => setPanel("diary")}
                  className="flex items-center gap-1 rounded-full border border-brand/30 bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink-muted transition-transform duration-100 active:scale-[0.94]"
                >
                  {SIDE_ENTRIES.diary.emoji} {SIDE_ENTRIES.diary.label}
                </button>
              </div>
            </div>

            {/* 彩蛋入口（独立成行、右对齐、极弱）：切回经典水占版，记住选择。
                文案「👀 点我会怎样」不明说目的地。用 tap 反馈（active:scale），不依赖
                hover（小程序无 hover）；[11px]+/70 透明度确保弱于上方两个 chip、更弱于主 CTA。 */}
            <div className="mt-1.5 flex justify-end">
              <StyleSwitch
                to="classic"
                className="inline-flex items-center gap-1 rounded-full border border-accent-hot/20 bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-ink-muted/70 transition-transform duration-100 active:scale-[0.94]"
              >
                👀 点我会怎样
              </StyleSwitch>
            </div>

            {/* Hero 菜单板：首页最强色块——饱满橙红渐变（与更浅/偏冷的背景强对比），
                白字标题读感强、有食欲不广告。右侧餐盘配薄荷青环，呼应背景冷色。 */}
            <div className="relative mt-6">
              <div
                aria-hidden
                className="absolute -right-3 -top-5 z-0 h-28 w-28 rounded-[58%_42%_38%_62%/56%_58%_42%_44%] bg-accent-hot/40"
              />
              <div
                className="relative flex items-center gap-3 overflow-hidden rounded-[2rem] rounded-tr-[5rem] px-6 py-7 shadow-[0_26px_54px_rgb(var(--c-accent-hot)_/_0.4)]"
                style={{
                  background:
                    "linear-gradient(135deg, #ff8a4c 0%, #f0562f 55%, #d63f22 100%)",
                }}
              >
                {/* 左侧色条（静态）：薄荷青竖条压在橙红上，冷暖对比锚点，像菜单书脊 */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-1.5 bg-info"
                />
                {/* 左：品牌大标题 + 定位句（白字，橙红底达对比） */}
                <div className="min-w-0 flex-1">
                  <h1 className="picker-brand text-[2.9rem] leading-[1.06] text-white">
                    {HERO.title}
                  </h1>
                  <p className="mt-2.5 max-w-[15rem] text-sm leading-relaxed text-white/85">
                    {tagline || HERO.lede}
                  </p>
                </div>
                {/* 右：餐盘小组件——白盘 + 薄荷青虚线内圈（冷色点缀），稳稳坐着 */}
                <div className="relative shrink-0">
                  <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-surface shadow-[0_10px_24px_rgb(var(--c-accent-hot)_/_0.35)]">
                    <div className="flex h-[3.4rem] w-[3.4rem] items-center justify-center rounded-full border-2 border-dashed border-info/60 text-3xl">
                      🍜
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 餐段 tab：坐在一块薄荷青浅垫上（冷调），与下方暖调筛选卡分出层级 */}
            <div className="mt-7 rounded-2xl border border-info/25 bg-info/10 px-3 py-3">
              <span className="mb-2 block px-1 text-xs font-medium text-ink-muted/70">
                这会儿是
              </span>
              <MealTabs value={div.meal} onChange={onChangeMeal} />
            </div>

            {/* 填空句式筛选：纯白卡 + 暖色左描边，与上方冷调餐段垫对照，层级清晰 */}
            <div className="mt-5 rounded-2xl rounded-bl-[3.5rem] border border-accent-hot/25 border-l-4 border-l-accent-hot bg-surface px-5 py-4 shadow-[0_12px_30px_rgb(var(--c-accent)_/_0.14)]">
              <MenuFilter
                value={div.filters}
                onChange={onChangeFilters}
                region={div.region}
                onRegionChange={onChangeRegion}
              />
            </div>

            {exhausted && (
              <p className="mt-4 text-sm font-medium text-accent">
                {EXHAUSTED_HINT}
              </p>
            )}

            {/* 弹性留白：把上方内容向视口上半分布，避免中部一大块空白显得未完成。
                下方固定行动条在其上浮（pb-28 已给出空间）。 */}
            <div className="flex-1" />

            {/* 底部固定行动条：主按钮强（拇指区，非居中悬浮）。
                反馈 = tap 触发一次 press+glow（onPick 里加 class，animationend 卸下）。 */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-6">
              <div className="pointer-events-auto w-full max-w-md">
                <button
                  ref={pickBtnRef}
                  onClick={onPick}
                  onAnimationEnd={() =>
                    pickBtnRef.current?.classList.remove("picker-press-glow")
                  }
                  disabled={casting}
                  className="picker-dots w-full rounded-2xl bg-gradient-to-r from-accent-hot via-accent to-brand py-[1.15rem] text-xl font-black tracking-wide text-white shadow-[0_16px_38px_rgb(var(--c-accent-hot)_/_0.5)] ring-1 ring-white/20 active:scale-[0.98] disabled:opacity-70"
                >
                  {casting ? "正在为你挑…" : PICK_CTA}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════ ② PICKING：菜单卡片归位（非老虎机、非漂浮 emoji）══════════ */}
        {phase === "picking" && (
          <motion.div
            key="picking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 px-5"
          >
            {/* 三张小菜单卡从下方错峰滑入归位（一次性，transform/opacity）。
                flex 行 + gap 排开，卡间有真实间距不重叠；各卡轻微倾斜给一点手摊开的活泼。
                像在餐桌上把几张候选菜卡摊开——菜单板隐喻，克制不喧闹。 */}
            <div className="flex items-center justify-center gap-3">
              {[
                { icon: "🍚", r: "-6deg", i: 0 },
                { icon: "🍜", r: "0deg", i: 1 },
                { icon: "🥗", r: "6deg", i: 2 },
              ].map((c) => (
                <div
                  key={c.icon}
                  className="picker-card-land flex h-28 w-[4.5rem] items-center justify-center rounded-2xl border border-brand/20 bg-surface text-4xl shadow-[0_10px_24px_rgb(var(--c-accent)_/_0.14)]"
                  style={
                    {
                      "--i": c.i,
                      "--r": c.r,
                    } as React.CSSProperties
                  }
                >
                  {c.icon}
                </div>
              ))}
            </div>
            <p className="picker-brand text-xl text-ink/90">{pickingLine}</p>
          </motion.div>
        )}

        {/* ══════════ ③ RESULT：今日菜单海报 ══════════ */}
        {phase === "result" && div.pick && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5"
          >
            {/* 顶栏：返回（左）+ 今天这桌计数（右，非游戏分数） */}
            <div className="flex items-center justify-between">
              <button
                onClick={onHome}
                className="text-sm font-medium text-brand-soft transition-colors hover:text-accent"
              >
                ← 首页
              </button>
              {basketCount > 0 && (
                <span className="rounded-full bg-surface/70 px-3 py-1 text-xs font-semibold text-ink-muted">
                  {RESULT_LABELS.tableTitle} · {basketCount}
                </span>
              )}
            </div>

            {/* 海报主视觉 */}
            <div className="mt-4">
              <DishReveal food={div.pick} line={resultLine} />
            </div>

            {exhausted && (
              <p className="mt-3 text-center text-sm font-medium text-accent">
                {EXHAUSTED_HINT}
              </p>
            )}

            {/* 动作层级：次级成对（小）+ 主行动大（找店）。
                随海报分层出现；反馈用 tap 下压（active:scale），主按钮 reveal 时亮一次 */}
            <div
              className="picker-serve-up mt-5 flex flex-col gap-2.5"
              style={{ ["--i" as string]: 4 }}
            >
              <div className="flex gap-2.5">
                <button
                  onClick={onSkipAndRecast}
                  disabled={casting}
                  className="flex-1 rounded-xl border border-brand/40 bg-surface py-3 text-sm font-semibold text-ink-muted transition-transform duration-100 active:scale-[0.96] disabled:opacity-50"
                >
                  {RESULT_ACTIONS.again}
                </button>
                <button
                  onClick={onAddAndRecast}
                  disabled={casting}
                  className="flex-1 rounded-xl border border-brand/40 bg-brand/5 py-3 text-sm font-semibold text-brand-soft transition-transform duration-100 active:scale-[0.96] disabled:opacity-50"
                >
                  {RESULT_ACTIONS.add}
                </button>
              </div>
              <button
                key={div.pick.id}
                onClick={onConfirm}
                className="picker-pop-once w-full rounded-2xl bg-gradient-to-r from-accent-hot to-brand py-4 text-base font-black text-white shadow-[0_10px_28px_rgb(var(--c-accent-hot)_/_0.34)] transition-transform duration-100 active:scale-[0.97]"
              >
                {RESULT_ACTIONS.confirm(basketCount)} →
              </button>
              {basket.length > 0 && (
                <button
                  onClick={onConfirmBasketOnly}
                  className="text-xs text-brand-soft/75 transition-colors active:text-accent"
                >
                  不要这道，只吃已选的 {basket.length} 道 →
                </button>
              )}
            </div>

            {/* 底部：今天这桌托盘（攒的菜堆在这，非分数条） */}
            {basketCount > 0 && (
              <div className="mt-auto pt-5">
                <div className="rounded-2xl border border-brand/15 bg-surface/70 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-muted/80">
                      🧺 {RESULT_LABELS.tableTitle}
                    </span>
                    <button
                      onClick={onFreshRecast}
                      disabled={casting}
                      className="text-xs text-brand-soft transition-colors hover:text-accent disabled:opacity-50"
                    >
                      清空重选
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {basket.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => removeFromBasket(f.id)}
                        title="点一下从今天这桌移除"
                        className="group flex items-center gap-1 rounded-full border border-brand/30 bg-surface px-2.5 py-1 text-xs text-ink/75 transition-colors hover:border-accent-pink/50"
                      >
                        <span>{f.emoji}</span>
                        <span className="max-w-[6rem] truncate">{f.name}</span>
                        <span className="text-ink-muted/60 group-hover:text-accent-pink">
                          ×
                        </span>
                      </button>
                    ))}
                    {div.pick && (
                      <span className="flex items-center gap-1 rounded-full border border-dashed border-accent/50 px-2.5 py-1 text-xs text-accent">
                        <span>{div.pick.emoji}</span>
                        <span className="max-w-[6rem] truncate">
                          {div.pick.name}
                        </span>
                        <span className="opacity-70">这道</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════ ④ SHOPS：这份菜单附近哪里能吃到 ══════════ */}
        {phase === "shops" && (
          <motion.div
            key="shops"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5"
          >
            <ShopResults
              cards={shopCards}
              strictCount={shops.length}
              exploringFood={exploringFood}
              confirmed={confirmed}
              exploringId={exploringId}
              loading={loading}
              error={error}
              needCity={needCity}
              fetched={fetched}
              onVisit={onVisitShop}
              onPickCity={onPickCity}
              onPickDish={onPickExploreDish}
              onBack={onBackToResult}
              onHome={onHome}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
