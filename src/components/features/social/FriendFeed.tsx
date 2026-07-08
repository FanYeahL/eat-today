"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  getFriendFeed,
  comboOf,
  foodById,
  type FriendActivity,
} from "@/config/social-mock";

type FriendFeedProps = {
  /**
   * 「我也想吃这个」回调：把好友这套组合的食物 id 灌进抽取候选作高概率候选。
   * 不传则只展示、不可种草（如落地页纯氛围展示）。
   */
  onSeed?: (ids: string[]) => void;
};

/** 相对时间换算成人话 */
function agoLabel(min: number): string {
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  return `${h}小时前`;
}

/** 单条广播卡片 */
function FeedCard({
  act,
  onSeed,
}: {
  act: FriendActivity;
  onSeed?: (ids: string[]) => void;
}) {
  const food = foodById(act.finalPickId);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = () => {
    if (!onSeed) return;
    onSeed(comboOf(act));
    setSeeded(true);
    // 短暂反馈后复位，允许再次种别人的
    window.setTimeout(() => setSeeded(false), 1800);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand/15 bg-surface/70 px-3.5 py-2.5">
      {/* 匿名头像 */}
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-base"
      >
        {act.avatar}
      </span>

      <div className="min-w-0 flex-1 text-left leading-snug">
        <p className="text-[11px] text-ink-muted/60">
          {agoLabel(act.minutesAgo)} · {act.alias}
        </p>
        <p className="truncate text-sm text-ink">
          {food ? (
            <>
              摇{act.shakeCount}次，最终吃{" "}
              <span className="font-semibold text-accent">
                {food.emoji} {food.name}
              </span>
            </>
          ) : (
            act.note
          )}
        </p>
      </div>

      {/* 我也想吃这个 → 种草 */}
      {onSeed && (
        <button
          onClick={handleSeed}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
            seeded
              ? "border-accent bg-accent-hot/15 text-accent"
              : "border-brand/40 bg-brand/5 text-ink-muted hover:border-accent/60 hover:text-accent"
          }`}
        >
          {seeded ? "✓ 已加" : "我也想吃"}
        </button>
      )}
    </div>
  );
}

/**
 * 好友干饭广播看板（匿名 · 温和社交）
 *
 * 蓝白圆角卡片，纵向无缝自动滚动（hover 暂停），展示匿名好友的干饭动态。
 * 每条右侧「我也想吃这个」一键把好友的选择种进自己的抽取候选 → 完美复刻
 * 「看到别人摇的，突然也想吃同款」的种草心理。
 *
 * 隐私：全程匿名代号 + emoji，无真实姓名。
 * SSR 安全：列表静态，无依赖时间的首屏差异。
 */
export default function FriendFeed({ onSeed }: FriendFeedProps) {
  const [feed, setFeed] = useState<FriendActivity[]>([]);
  const [paused, setPaused] = useState(false);

  // 挂载后再灌数据，保持首屏稳定（未来换成云端 fetch 也走这里）
  useEffect(() => {
    setFeed(getFriendFeed());
  }, []);

  if (feed.length === 0) return null;

  // 复制一份接在后面，实现无缝循环（滚到 -50% 即回到起点视觉等价）
  const loop = [...feed, ...feed];

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm" aria-hidden>
          🍽️
        </span>
        <span className="text-xs font-semibold text-brand-soft">
          饭友们最近都在吃
        </span>
      </div>

      <div
        className="relative h-[132px] overflow-hidden rounded-2xl border border-brand/50 bg-surface/80 p-2 backdrop-blur"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <motion.div
          className="flex flex-col gap-2"
          animate={{ y: paused ? undefined : ["0%", "-50%"] }}
          transition={{
            duration: feed.length * 4,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {loop.map((act, i) => (
            <FeedCard key={`${act.id}-${i}`} act={act} onSeed={onSeed} />
          ))}
        </motion.div>

        {/* 顶/底渐隐遮罩，滚动更柔和 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface/90 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface/90 to-transparent"
        />
      </div>
    </div>
  );
}
