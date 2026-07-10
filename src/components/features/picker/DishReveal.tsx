"use client";

/**
 * 今日菜单板 · 结果主视觉（今日菜单海报）
 * ─────────────────────────────────────────────
 * 不是「奖品爆出」，而是一张今日菜单海报：
 *  - 左侧：大菜名（杂志标题式，左对齐，允许换行不裁切）
 *  - 右侧：餐盘视觉——emoji 坐在有机圆盘里，从右缘略微溢出，克制不满屏乱飞
 *  - 下方：「为什么推荐它」推荐理由（顶饱/辣度/推荐度 + 一句话），回应「更想吃」
 *
 * 动效 =「端上桌」：内容分层从下方轻推上来（.picker-serve-up + --i 控制次序）。
 * 只用 opacity/translate，可降级（reduced motion 下直接落定），语义对应小程序
 * 「class + animation-delay」，可迁移。餐盘为静态有机圆角，不做 blob morph。
 * 长菜名允许换行（项目历史：去 whitespace-nowrap）。标签纯展示，不影响生成。
 */

import type { CSSProperties } from "react";
import type { Food } from "@/types/food";
import {
  recommendLabel,
  spicyLabel,
  satietyLabel,
  RESULT_LABELS,
} from "./picker-copy";

type DishRevealProps = {
  food: Food;
  /** 推荐语（父层随机取，避免 SSR 水合不一致） */
  line: string;
};

/** 分层序号 → inline --i（driver of stagger delay，见 globals .picker-serve-up）。 */
const layer = (i: number): CSSProperties => ({ ["--i" as string]: i });

export default function DishReveal({ food, line }: DishRevealProps) {
  const spicy = spicyLabel(food.spicy);
  const satiety = satietyLabel(food.satiety);

  return (
    // key=food.id：换一道时整卡重挂，分层动效重放
    <article
      key={food.id}
      className="relative w-full overflow-hidden rounded-[2rem] rounded-tr-[5.5rem] border border-brand/20 bg-surface shadow-[0_22px_50px_rgb(var(--c-accent)_/_0.16)]"
    >
      {/* ① 顶部小标：今天推荐（菜单板口吻，非「开奖」） */}
      <div
        className="picker-serve-up flex items-center gap-2 px-6 pt-5"
        style={layer(0)}
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {RESULT_LABELS.todayPick}
        </span>
      </div>

      {/* 海报主区：左菜名 + 右餐盘，不对称 */}
      <div className="flex items-center gap-2 px-6 pb-2 pt-2">
        {/* ② 左：大菜名（品牌字·杂志标题式，左对齐，可换行） */}
        <h2
          className="picker-serve-up picker-brand flex-1 text-[2.25rem] leading-[1.18] text-ink"
          style={layer(1)}
        >
          {food.name}
        </h2>
        {/* ③ 右：餐盘视觉——emoji 坐在静态有机圆盘，略溢出右缘，克制 */}
        <div
          className="picker-serve-up relative -mr-4 shrink-0"
          style={layer(2)}
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-[58%_42%_38%_62%/56%_58%_42%_44%] bg-accent-hot/12"
          />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-surface-2 text-6xl shadow-[inset_0_2px_12px_rgb(var(--c-brand)_/_0.15)]">
            {food.emoji}
          </div>
        </div>
      </div>

      {/* ④ 推荐理由区：标签做成「理由」，让人知道为什么该吃它（非对称圆角） */}
      <div
        className="picker-serve-up mx-5 mb-5 mt-1 rounded-2xl rounded-br-[2.5rem] bg-surface-2/70 px-4 py-3"
        style={layer(3)}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted/70">
          {RESULT_LABELS.reason}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-accent-hot/12 px-2.5 py-1 text-xs font-semibold text-accent-hot">
            {recommendLabel(food.recommend)}
          </span>
          {satiety && (
            <span className="rounded-full bg-info/18 px-2.5 py-1 text-xs font-semibold text-ink/90">
              {satiety}
            </span>
          )}
          {spicy && (
            <span className="rounded-full bg-gold/25 px-2.5 py-1 text-xs font-semibold text-ink/90">
              🌶️ {spicy}
            </span>
          )}
        </div>
        {/* 一句推荐语 + 菜自带描述（若有） */}
        <p className="mt-2 text-sm leading-relaxed text-ink/80">
          {food.description ? `${food.description}` : line}
        </p>
      </div>
    </article>
  );
}
