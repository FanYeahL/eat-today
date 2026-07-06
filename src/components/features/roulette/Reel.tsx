"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ReelItem } from "@/types/food";

/** 单格高度（px），窗口只露出一格 */
export const ITEM_HEIGHT = 112;
/** 滚动条里垫多少个随机格，越多转得越久越爽 */
const STRIP_LENGTH = 32;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ReelProps = {
  /** 这一轴的候选池（主食池 / 饮品池 / 菜谱池） */
  pool: ReelItem[];
  /** 本轮要停在的目标项 */
  target: ReelItem;
  /** 每次开摇递增的 id，用于强制重新触发动画 */
  spinId: number;
  /** 转动时长（秒），三轴递增形成依次停下的效果 */
  duration: number;
  /** 停稳回调（只有最后一轴需要传，用来翻到 done） */
  onRest?: () => void;
};

/**
 * 单个竖向滚轮
 * 一条由随机食物组成的长条，末尾是 target；
 * 挂载即把长条向上推，最终让 target 停在窗口中央。
 * 靠 key={spinId} 在每次开摇时重挂载、重新播放动画。
 */
export default function Reel({
  pool,
  target,
  spinId,
  duration,
  onRest,
}: ReelProps) {
  // 用 spinId + target.id 作为依赖，保证每次开摇都生成一条新长条
  const strip = useMemo<ReelItem[]>(() => {
    const filler = Array.from({ length: STRIP_LENGTH }, () => pickRandom(pool));
    return [...filler, target];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId, target.id]);

  // 目标在长条最后一格，需要把它顶到窗口位置
  const finalY = -(strip.length - 1) * ITEM_HEIGHT;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-brand/50 bg-surface/80 shadow-[0_4px_14px_rgb(var(--c-brand)_/_0.18)] backdrop-blur"
      style={{ height: ITEM_HEIGHT, width: 132 }}
    >
      <motion.div
        // key 变化时 Framer Motion 会重挂载并重新播放动画，
        // 即便两次目标相同也能重新转起来
        key={spinId}
        initial={{ y: 0 }}
        animate={{ y: finalY }}
        transition={{
          duration,
          ease: [0.12, 0.67, 0.16, 1], // 强 easeOut：先快后极缓，模拟物理减速
        }}
        onAnimationComplete={onRest}
        className="flex flex-col"
      >
        {strip.map((food, i) => (
          <div
            key={`${food.id}-${i}`}
            className="flex flex-col items-center justify-center gap-1"
            style={{ height: ITEM_HEIGHT }}
          >
            <span className="text-4xl leading-none">{food.emoji}</span>
            <span className="text-sm font-semibold text-ink">
              {food.name}
            </span>
          </div>
        ))}
      </motion.div>

      {/* 中央高亮 payline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-2xl ring-1 ring-inset ring-accent/30"
      />
    </div>
  );
}
