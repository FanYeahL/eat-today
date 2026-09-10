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
 * 业务编排统一由 useFoodOrchestration 持有；页面只负责 PickerPhase、文案与渲染。
 * 副作用（logPick/recordVisit/addEntry）与水主题共用一份实现。
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFoodOrchestration } from "@/hooks/useFoodOrchestration";
import { mealTaglines } from "@/config/meals";
import DishReveal from "./DishReveal";
import ShopResults from "./ShopResults";
import RecipePanelV2 from "./RecipePanelV2";
import DiaryPanelV2 from "./DiaryPanelV2";
import PickerScene from "./scenes/PickerScene";
import PickerAmbience from "./scenes/PickerAmbience";
import PickerForeground from "./scenes/PickerForeground";
import PickerChooseScreen from "./PickerChooseScreen";
import PickerConsole from "./PickerConsole";
import {
  PICKING_LINES,
  RESULT_LINES,
  RESULT_ACTIONS,
  RESULT_LABELS,
  EXHAUSTED_HINT,
  randomLine,
} from "./picker-copy";

import { toShopCards } from "@/lib/shop-format";
import { STRICT_ENOUGH } from "@/lib/shop-policy";

/** 四相位：选择 → 挑选中 → 结果 → 探店。 */
type PickerPhase = "choose" | "picking" | "result" | "shops";

export default function UniversalFoodPicker() {
  const [phase, setPhase] = useState<PickerPhase>("choose");
  const [panel, setPanel] = useState<null | "cook" | "diary">(null);
  const [pickingLine, setPickingLine] = useState(PICKING_LINES[0]);
  const {
    div,
    shops,
    expansion,
    loading,
    error,
    needCity,
    geoReason,
    fetched,
    basket,
    exhausted,
    confirmed,
    exploringId,
    exploringFood,
    casting,
    castError,
    runCast,
    onAddAndRecast,
    onSkipAndRecast,
    onFreshRecast,
    removeFromBasket,
    onConfirm,
    onConfirmBasketOnly,
    onHome,
    onChangeFilters,
    onChangeMeal,
    onChangeRegion,
    onPickExploreDish,
    onVisitShop,
    onPickCity,
    onRetryGeo,
  } = useFoodOrchestration({
    minRevealMs: 700,
    onCastStart: () => {
      setPickingLine(randomLine(PICKING_LINES));
      setPhase("picking");
    },
    onCastResult: ({ food, exhausted }, mode) => {
      setPhase(
        food ? "result" : exhausted && mode !== "fresh" ? "result" : "choose",
      );
    },
    onCastFailed: () => setPhase("choose"),
    onExplore: () => setPhase("shops"),
    onHome: () => setPhase("choose"),
  });

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

  const onBackToResult = () => setPhase("result");

  // 展示用店（两级）：严格匹配 + 严格不足时补扩展店。emoji 用当前探店那道菜的。
  const emoji = exploringFood?.emoji ?? "🍜";
  const strictCards = toShopCards(shops, emoji, "strict");
  const expansionCards =
    shops.length < STRICT_ENOUGH
      ? toShopCards(expansion, emoji, "expansion")
      : [];
  const shopCards = [...strictCards, ...expansionCards];

  const basketCount = basket.length + (div.pick ? 1 : 0);

  // isolate：stage 壳建独立层叠上下文，背景层用正 z（z-0）稳在内容之下、
  // 又不会被负 z-index 压到 stage 背后被父级白底盖住（曾导致「背景没加」）。
  // <main> 只承载全屏氛围底 + stage 封顶容器，本身 relative + overflow-hidden。
  return (
    <main
      data-meal={div.meal}
      className="relative min-h-screen overflow-hidden bg-base"
      style={
        {
          // 桌面画廊栏宽（S4）：min(46vw, 满高竖构图所需宽)——PickerScene 画栏与 PickerLayout
          // hero 列共用此值保持同步。仅 lg: 类消费；手机忽略。0.671 = 底图宽高比 780/1163。
          "--gallery-w": "min(46vw, calc(100vh * 0.671))",
        } as React.CSSProperties
      }
    >
      {/* 氛围出血层（桌面 lg+，全屏出血，不进 stage 封顶）：超宽屏 stage 居中后两侧余白由它托住。
          放在 stage 之外、z-0 最底——< 2xl 时被 stage 完全盖住。 */}
      <PickerAmbience meal={div.meal} />

      {/* 舞台（stage）：画廊画 + 内容双栏同处此壳，一起 2xl 封顶居中——画与操作台绑定不错位。
          < 2xl 时 w-full 撑满 = 与旧版逐像素一致（仅 ≥1720px 才收边露出氛围层）。 */}
      <div className="relative isolate min-h-screen w-full overflow-hidden 2xl:mx-auto 2xl:max-w-[1720px]">
        {/* 饭点「场景舞台」背景层（按 meal 换整幕场景，见 PickerScene） */}
        <PickerScene meal={div.meal} />

        {/* 前景层（z-[5]，夹在场景 z-0 与内容 z-10 之间；可与标题/盘子交叠但压不住文字） */}
        <PickerForeground meal={div.meal} />

        {castError && (
          <p
            role="alert"
            className="relative z-20 p-4 text-center text-accent-pink"
          >
            {castError}
          </p>
        )}
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
          {/* ══════════ ① CHOOSE：今日菜单板（复古菜单海报，见 PickerChooseScreen）══════════ */}
          {phase === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <PickerChooseScreen
                meal={div.meal}
                filters={div.filters}
                region={div.region}
                tagline={tagline}
                exhausted={exhausted}
                casting={casting}
                pickBtnRef={pickBtnRef}
                onPick={onPick}
                onChangeMeal={onChangeMeal}
                onChangeFilters={onChangeFilters}
                onChangeRegion={onChangeRegion}
                onOpenCook={() => setPanel("cook")}
                onOpenDiary={() => setPanel("diary")}
              />
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
            >
              <PickerConsole align="center" className="items-center gap-8 px-5">
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
                <p className="picker-brand text-xl text-ink/90">
                  {pickingLine}
                </p>
              </PickerConsole>
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
            >
              <PickerConsole align="start" className="px-5 pb-6 pt-5">
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

                {/* 海报主视觉：手机顶部留天空带，让当前时段光源在卡片上方完整可见；
                桌面画在左画廊栏、内容在右操作台，无需让天空，lg:mt-0。 */}
                <div className="mt-[13vh] lg:mt-4">
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
                    className="picker-pop-once w-full rounded-2xl bg-gradient-to-r from-[rgb(var(--c-cta-a))] to-[rgb(var(--c-cta-b))] py-4 text-base font-black text-white shadow-[0_10px_28px_rgb(var(--c-cta-a)_/_0.34)] transition-transform duration-100 active:scale-[0.97]"
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
                            <span className="max-w-[6rem] truncate">
                              {f.name}
                            </span>
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
              </PickerConsole>
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
            >
              <PickerConsole align="start" className="px-5 pb-6 pt-5">
                <ShopResults
                  cards={shopCards}
                  strictCount={shops.length}
                  exploringFood={exploringFood}
                  confirmed={confirmed}
                  exploringId={exploringId}
                  loading={loading}
                  error={error}
                  needCity={needCity}
                  geoReason={geoReason}
                  onRetryGeo={onRetryGeo}
                  fetched={fetched}
                  onVisit={onVisitShop}
                  onPickCity={onPickCity}
                  onPickDish={onPickExploreDish}
                  onBack={onBackToResult}
                  onHome={onHome}
                />
              </PickerConsole>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
