"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reel from "./Reel";
import ShopList from "./ShopList";
import NeonButton from "@/components/common/NeonButton";
import type { RouletteResult, RouletteStatus } from "@/hooks/useRoulette";
import type { Food } from "@/types/food";

type SlotMachineProps = {
  status: RouletteStatus;
  result: RouletteResult;
  /** 当前餐段主食池（前两轴滚动用） */
  mainPool: Food[];
  /** 当前餐段饮品池（第三轴滚动用） */
  drinkPool: Food[];
  /** 每次开摇递增，用于重新触发滚轮动画 */
  spinId: number;
  /** 最后一轴停稳时调用 */
  onRest: () => void;
  /** 再摇一次 */
  onSpinAgain: () => void;
  /** 正在校验附近可用性（按钮置灰防连点） */
  verifying: boolean;
  /** 回到 hero */
  onReset: () => void;
  // —— 多轮攒候选（按单个食物） ——
  /** 已攒下的候选食物 */
  candidates: Food[];
  /** 是否已点「定了」进入汇总视图 */
  confirmed: boolean;
  /** 切换某食物在候选篮里的去留 */
  onToggleCandidate: (food: Food) => void;
  /** 从候选篮移除某 id */
  onRemoveCandidate: (id: string) => void;
  /** 清空候选篮 */
  onClearBasket: () => void;
  /** 点「定了」铺出全部候选 */
  onConfirm: () => void;
  /** 从汇总返回继续摇 */
  onUnconfirm: () => void;
};

// 三轴依次停下：时长递增
const DURATIONS = [2.2, 2.8, 3.4];

/**
 * 可操作的食物卡片：左侧加入候选（勾选态），点名字区展开附近店铺。
 * 一张卡两个动作分明：➕/✓ 管收藏，名字区管查店。
 */
function FoodChip({
  food,
  inBasket,
  shopsOpen,
  onToggleBasket,
  onToggleShops,
}: {
  food: Food;
  inBasket: boolean;
  shopsOpen: boolean;
  onToggleBasket: () => void;
  onToggleShops: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border pr-1 transition-all ${
        shopsOpen
          ? "border-accent bg-accent-hot/10"
          : "border-brand/50 bg-brand/5"
      }`}
    >
      {/* 加入/移出候选 */}
      <button
        onClick={onToggleBasket}
        aria-pressed={inBasket}
        aria-label={inBasket ? "移出候选" : "加入候选"}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
          inBasket
            ? "bg-accent text-white"
            : "bg-brand/10 text-brand-soft hover:bg-accent/20 hover:text-accent"
        }`}
      >
        {inBasket ? "✓" : "＋"}
      </button>
      {/* 名字区：查店 */}
      <button
        onClick={onToggleShops}
        className="flex items-center gap-1.5 py-2 pl-1 pr-3 text-sm font-semibold text-ink"
      >
        <span className="text-lg leading-none">{food.emoji}</span>
        {food.name}
      </button>
    </div>
  );
}

/**
 * 三轴干饭老虎机 + 多轮攒候选（按单个食物）
 *
 * 流程：摇出「两菜一饮」→ 想要哪样就点哪样的「＋」加进候选（不强制整套）→
 * 「再摇三个」继续 → 反复，直到「就这些了，定了」→ 铺出你挑中的全部食物，
 * 每样可点开查附近店。
 */
export default function SlotMachine({
  status,
  result,
  mainPool,
  drinkPool,
  spinId,
  onRest,
  onSpinAgain,
  verifying,
  onReset,
  candidates,
  confirmed,
  onToggleCandidate,
  onRemoveCandidate,
  onClearBasket,
  onConfirm,
  onUnconfirm,
}: SlotMachineProps) {
  const [mainA, mainB] = result.mains;
  const isDone = status === "done";

  // 当前展开店铺列表的食物 id；null 表示都收起
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 再摇一次（离开 done）时收起已展开的店铺列表
  useEffect(() => {
    if (status !== "done") setSelectedId(null);
  }, [status]);

  const toggleShops = (id: string) =>
    setSelectedId((cur) => (cur === id ? null : id));

  const picks: Food[] = [mainA, mainB, result.drink];
  const inBasket = (id: string) => candidates.some((f) => f.id === id);
  const selectedFood = picks.find((f) => f.id === selectedId) ?? null;

  // ===== 汇总视图：点了「定了」之后，铺出挑中的全部食物 =====
  if (confirmed) {
    return (
      <SummaryView
        candidates={candidates}
        onUnconfirm={onUnconfirm}
        onReset={onReset}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-sm uppercase tracking-[0.3em] text-brand-soft">
        {isDone ? "今日干饭套餐" : "天选干饭中…"}
      </p>

      {/* 候选篮：攒了才显示 */}
      <AnimatePresence>
        {candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-soft">
                🧺 候选篮 · {candidates.length} 样
              </span>
              <button
                onClick={onClearBasket}
                className="text-xs text-ink-muted/60 transition-colors hover:text-accent-pink"
              >
                清空
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((f) => (
                <span
                  key={f.id}
                  className="flex items-center gap-1 rounded-full border border-brand/30 bg-surface/70 py-1 pl-2.5 pr-1 text-sm text-ink"
                >
                  <span className="leading-none">
                    {f.emoji} {f.name}
                  </span>
                  <button
                    onClick={() => onRemoveCandidate(f.id)}
                    aria-label="移除"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-ink-muted/50 transition-colors hover:text-accent-pink"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 三轴滚轮 */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Reel pool={mainPool} target={mainA} spinId={spinId} duration={DURATIONS[0]} />
        <Reel pool={mainPool} target={mainB} spinId={spinId} duration={DURATIONS[1]} />
        <Reel
          pool={drinkPool}
          target={result.drink}
          spinId={spinId}
          duration={DURATIONS[2]}
          onRest={onRest}
        />
      </div>

      {/* 结果区：停稳后淡入 */}
      <AnimatePresence mode="wait">
        {isDone && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex w-full flex-col items-center gap-5 text-center"
          >
            <p className="max-w-md text-lg leading-relaxed text-ink">
              今天就吃{" "}
              <span className="font-bold text-accent">{mainA.name}</span>
              {" + "}
              <span className="font-bold text-accent">{mainB.name}</span>
              ，再来一杯{" "}
              <span className="font-bold text-info">{result.drink.name}</span>！
            </p>

            {/* 可操作食物卡片：＋加入候选 / 点名字查店 */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-ink-muted/60">
                想要哪样点「＋」加进候选，点名字看看附近哪家店
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {picks.map((food) => (
                  <FoodChip
                    key={food.id}
                    food={food}
                    inBasket={inBasket(food.id)}
                    shopsOpen={selectedId === food.id}
                    onToggleBasket={() => onToggleCandidate(food)}
                    onToggleShops={() => toggleShops(food.id)}
                  />
                ))}
              </div>
            </div>

            {/* 选中食物的店铺列表 */}
            <div className="w-full max-w-md">
              <AnimatePresence mode="wait">
                {selectedFood && (
                  <ShopList key={selectedFood.id} food={selectedFood} />
                )}
              </AnimatePresence>
            </div>

            {/* 动作区 */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <NeonButton onClick={onSpinAgain} variant="ghost" disabled={verifying}>
                  {verifying ? "🛰️ 看看附近…" : "🎰 再摇三个"}
                </NeonButton>
                <NeonButton
                  onClick={onConfirm}
                  variant="primary"
                  disabled={candidates.length === 0}
                >
                  ✅ 就这些了，定了
                </NeonButton>
              </div>
              {candidates.length === 0 && (
                <p className="text-xs text-ink-muted/50">
                  先点「＋」把想吃的加进候选，再点定了～
                </p>
              )}
              <button
                onClick={onReset}
                className="text-sm text-brand-soft transition-colors hover:text-accent"
              >
                不摇了，回首页
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 汇总视图：把挑中的全部食物铺成卡片，每样可点开查附近店。
 */
function SummaryView({
  candidates,
  onUnconfirm,
  onReset,
}: {
  candidates: Food[];
  onUnconfirm: () => void;
  onReset: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // 盖章仪式：进入汇总的一瞬放一次「啪」的盖章动画，给决策一点仪式感。
  // 1.6s 后淡出，不挡操作。
  const [stamped, setStamped] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setStamped(false), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col items-center gap-6"
    >
      {/* 盖章仪式：一次性，盖完即淡出 */}
      <AnimatePresence>
        {stamped && (
          <motion.div
            key="stamp"
            initial={{ opacity: 0, scale: 1.8, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
            className="pointer-events-none absolute z-20 mt-10 rounded-2xl border-[3px] border-accent/70 px-6 py-2.5"
          >
            <span className="text-lg font-black tracking-wide text-accent">
              盖章 · 今天就吃它了
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-soft">
          你挑中的干饭清单
        </p>
        <p className="text-xs text-ink-muted/60">
          一共 {candidates.length} 样 · 点开任意一样看看附近哪家店
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {candidates.map((food) => (
          <div
            key={food.id}
            className="flex flex-col gap-2 rounded-2xl border border-brand/50 bg-surface/80 p-3 backdrop-blur"
          >
            <button
              onClick={() =>
                setOpenId((cur) => (cur === food.id ? null : food.id))
              }
              className="flex items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="text-lg leading-none">{food.emoji}</span>
                {food.name}
              </span>
              <span className="text-xs text-brand-soft">
                {openId === food.id ? "收起" : "找附近 ›"}
              </span>
            </button>
            <AnimatePresence mode="wait">
              {openId === food.id && <ShopList key={food.id} food={food} />}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <NeonButton onClick={onUnconfirm} variant="ghost">
          ← 再摇几个
        </NeonButton>
        <NeonButton onClick={onReset} variant="primary">
          回首页
        </NeonButton>
      </div>
    </motion.div>
  );
}
