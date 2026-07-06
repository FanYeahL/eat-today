"use client";

import { useCallback, useEffect, useRef } from "react";

/** 单项高度（px） */
const ITEM_H = 36;
/** 可见项数（奇数，保证正中有一项），5 项 → 高度 180 */
const VISIBLE = 5;
const HEIGHT = ITEM_H * VISIBLE;
/** 上下留白，让首尾项也能滚到正中 */
const PAD = (HEIGHT - ITEM_H) / 2;

type WheelPickerProps = {
  /** 选项列表 */
  options: string[];
  /** 当前选中值（受控） */
  value: string;
  /** 选中项变化回调 */
  onChange: (value: string) => void;
  /** 无障碍标签 */
  label?: string;
};

/**
 * 竖向滚轮选择器
 * 原生 scroll-snap 实现：滚动停在哪一项，哪一项即选中（中间高亮带标记）。
 * 受控：外部 value 变化时自动滚到对应项。
 */
export default function WheelPicker({
  options,
  value,
  onChange,
  label,
}: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 记录上次上报的索引，避免滚动中重复回调 / 受控滚动触发回环
  const lastIndexRef = useRef<number>(-1);
  // 滚动结束判定的计时器
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const indexOfValue = Math.max(0, options.indexOf(value));

  // 滚到指定索引
  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: index * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // 受控：value 变化时滚过去（外部联动重置等）
  useEffect(() => {
    if (indexOfValue !== lastIndexRef.current) {
      lastIndexRef.current = indexOfValue;
      scrollToIndex(indexOfValue, false);
    }
  }, [indexOfValue, scrollToIndex]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 防抖：滚动停下再判定居中项
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const index = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.min(Math.max(index, 0), options.length - 1);
      if (clamped !== lastIndexRef.current) {
        lastIndexRef.current = clamped;
        onChange(options[clamped]);
      }
    }, 90);
  };

  return (
    <div
      className="relative"
      style={{ height: HEIGHT }}
      role="listbox"
      aria-label={label}
    >
      {/* 中间高亮带 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg border border-accent/40 bg-accent-hot/10"
        style={{ height: ITEM_H }}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {options.map((opt) => {
            const active = opt === value;
            return (
              <div
                key={opt}
                role="option"
                aria-selected={active}
                onClick={() => {
                  const i = options.indexOf(opt);
                  lastIndexRef.current = i;
                  scrollToIndex(i, true);
                  onChange(opt);
                }}
                className={`flex cursor-pointer snap-center items-center justify-center text-sm transition-colors ${
                  active
                    ? "font-bold text-accent"
                    : "text-ink-muted/50 hover:text-ink-muted/80"
                }`}
                style={{ height: ITEM_H }}
              >
                {opt}
              </div>
            );
          })}
        </div>
      </div>

      {/* 上下渐隐遮罩，强化滚轮立体感 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-surface to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent"
      />
    </div>
  );
}
