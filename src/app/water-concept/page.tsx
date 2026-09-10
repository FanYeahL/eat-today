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

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWaterDivination } from "@/hooks/useWaterDivination";
import { useFoodOrchestration } from "@/hooks/useFoodOrchestration";
import { verseFor, gradeFor } from "@/config/divination";
import WaterAmbience from "@/components/features/water/WaterAmbience";
import RippleLayer from "@/components/features/water/RippleLayer";
import DivinationSlip from "@/components/features/water/DivinationSlip";
import DriftExplore from "@/components/features/water/DriftExplore";
import WaterDiaryPanel from "@/components/features/water/WaterDiaryPanel";
import WaterRecipePanel from "@/components/features/water/WaterRecipePanel";
import FunnelFilter from "@/components/features/water/FunnelFilter";
import MealSwitcher from "@/components/features/water/MealSwitcher";
import StyleSwitch from "@/components/common/StyleSwitch";
import { mealMeta } from "@/config/meals";

import { toShopCards as toDriftShops } from "@/lib/shop-format";
import { STRICT_ENOUGH } from "@/lib/shop-policy";

/** idle 签纸悬浮时的占位文案（还没抽，纸是空白的） */
const EMPTY_REVEAL = { emoji: "", name: "", verse: "", grade: undefined };

export default function WaterConceptPage() {
  const w = useWaterDivination();
  // 是否已离开筛选屏、进入水占场景
  const [entered, setEntered] = useState(false);
  // 覆盖面板：null=水占主流程 / "diary"=干饭日记 / "recipes"=自己做翻菜谱
  const [panel, setPanel] = useState<null | "diary" | "recipes">(null);
  // 水占途中临时调口味的浮层（突然想吃某类时，不退出场景就能改 tag）
  const [quickFilter, setQuickFilter] = useState(false);

  const {
    div,
    shops,
    expansion,
    loading,
    error,
    fetched,
    needCity,
    geoReason,
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
    onReExplore,
    onVisitShop,
    onPickCity,
    onRetryGeo,
  } = useFoodOrchestration({
    excludeCurrentOnFresh: true,
    clearShopsOnHome: false,
    onCastStart: (mode) => {
      if (mode !== "initial") w.reset();
    },
    onCastResult: ({ food }) => {
      if (food) w.cast();
    },
    onCastFailed: () => w.reset(),
    onExplore: () => w.explore(),
    onHome: () => {
      w.reset();
      setQuickFilter(false);
      setEntered(false);
    },
  });
  const onCast = () => runCast();

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

      {castError && (
        <p
          role="alert"
          className="relative z-50 p-4 text-center text-accent-pink"
        >
          {castError}
        </p>
      )}
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
        <div className="text-xl tracking-[0.5em] text-brand-soft">
          今 日 饭 签
        </div>
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
              {/* 风格切换（低干扰）：切到新版菜单板，记住选择。文案「👀 点我会怎样」
                  （神秘彩蛋感，不明说目的地），与两个弱入口同排、同字重，不抢「开始投签」主 CTA。 */}
              <StyleSwitch
                to="menu"
                className="transition-colors hover:text-accent"
              >
                👀 点我会怎样
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
                        void runCast("recast");
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
                geoReason={geoReason}
                onRetryGeo={onRetryGeo}
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
                        {basket.length > 0 ? "，已攒的可以直接定，或" : "，"}
                        换个筛选再占？
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
                          style={{
                            boxShadow: "0 2px 8px rgba(150,179,170,0.15)",
                          }}
                        >
                          <span>{f.emoji}</span>
                          <span className="max-w-[6rem] truncate">
                            {f.name}
                          </span>
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
