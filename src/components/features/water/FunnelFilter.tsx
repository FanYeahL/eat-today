"use client";

import { useState } from "react";
import {
  filterOptions,
  toggleFilterFamily,
  showsRegion,
} from "@/lib/filter-options";
import { WaterFilterPill as Chip } from "@/components/common/FilterPill";
import { AnimatePresence, motion } from "framer-motion";
import { familyList } from "@/config/cuisine";
import RegionSwitcher from "./RegionSwitcher";
import type { Filters } from "@/lib/pick-core";
import type { CuisineFamily, RegionKey } from "@/types/food";

type FunnelFilterProps = {
  value: Filters;
  onChange: (next: Filters) => void;
  /** 中餐二级地区（仅在选中「经典中式」时展开） */
  region: RegionKey;
  onRegionChange: (region: RegionKey) => void;
  /**
   * 可折叠模式：摇号过程中用，默认收起成一行「想换个口味？」，
   * 点开才展开筛选，避免喧宾夺主。idle 首次进入时不折叠（直接铺开引导）。
   */
  collapsible?: boolean;
};

/** 心情五态（含不挑） */
const { moods: MOODS, budgets: BUDGETS } = filterOptions("water");
/** 标签按钮：复用全站标签选中/未选中标准样式。
 *  multi=true（多选，如风味家族）→ 用 aria-pressed 按钮语义；
 *  multi=false（单选，如心情/预算，外层是 radiogroup）→ 用 role=radio / aria-checked。
 *  之前一律 radio，但家族是多选，radio 会误告诉读屏「只能选一个」。 */

/**
 * 三秒温和轻筛选漏斗
 * 像朋友在微信上随口问你：想吃啥风味？什么心情？预算多少？
 * 风味可多选；选了「经典中式」时，其下淡入展开中餐地区二级精修。
 * 毛玻璃气泡，低调不喧宾夺主；所有选择由上层 hook useDivinationPick 持久化。
 */
/** 当前筛选的一行摘要，折叠时显示在标题里（让用户不展开也知道选了啥） */
function filtersSummary(value: Filters): string {
  const parts: string[] = [];
  if (value.families.length > 0) {
    parts.push(
      value.families
        .map((f) => familyList.find((x) => x.key === f)?.label ?? f)
        .join("·"),
    );
  } else {
    parts.push("不限风味");
  }
  const mood = MOODS.find((m) => m.key === value.mood);
  if (mood && value.mood !== "any") parts.push(mood.label);
  const budget = BUDGETS.find((b) => b.key === value.budget);
  if (budget && value.budget !== "any") parts.push(budget.label);
  return parts.join(" · ");
}

export default function FunnelFilter({
  value,
  onChange,
  region,
  onRegionChange,
  collapsible = false,
}: FunnelFilterProps) {
  // 折叠模式默认收起；非折叠（idle 首入）始终展开
  const [open, setOpen] = useState(!collapsible);

  const toggleFamily = (fam: CuisineFamily) =>
    onChange(toggleFilterFamily(value, fam));
  const showRegion = showsRegion(value);

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3.5 backdrop-blur-md">
      {/* 折叠模式的标题行：整条做成明显可点的按钮，右侧带箭头 */}
      {collapsible && (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent-hot/10 px-3 py-2 text-left transition-colors hover:border-accent hover:bg-accent-hot/15"
        >
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-accent">
            🎚️ 想换个口味
            {!open && (
              <span className="truncate text-xs font-normal text-ink-muted/70">
                · 现在：{filtersSummary(value)}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
            {open ? "收起" : "点这里调整"}
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
            >
              ▾
            </motion.span>
          </span>
        </button>
      )}

      {/* 筛选主体：折叠模式下受 open 控制淡入淡出 */}
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            key="funnel-body"
            initial={collapsible ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            {/* 风味家族（多选） */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-muted/80">
                今天想吃点什么风味的？（可多选）
              </span>
              <div
                role="group"
                aria-label="选择风味"
                className="flex flex-wrap items-center gap-2"
              >
                {familyList.map((f) => (
                  <Chip
                    key={f.key}
                    multi
                    selected={value.families.includes(f.key)}
                    onClick={() => toggleFamily(f.key)}
                    emoji={f.emoji}
                    label={f.label}
                  />
                ))}
              </div>
            </div>

            {/* 中餐二级地区：仅在「经典中式」或未限风味时展开 */}
            <AnimatePresence initial={false}>
              {showRegion && (
                <motion.div
                  key="region"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-0.5">
                    <RegionSwitcher value={region} onChange={onRegionChange} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 心情 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-muted/80">现在的心情是？</span>
              <div
                role="radiogroup"
                aria-label="选择心情"
                className="flex flex-wrap items-center gap-2"
              >
                {MOODS.map((m) => (
                  <Chip
                    key={m.key}
                    selected={value.mood === m.key}
                    onClick={() => onChange({ ...value, mood: m.key })}
                    emoji={m.emoji}
                    label={m.label}
                  />
                ))}
              </div>
            </div>

            {/* 预算 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-muted/80">今天的预算？</span>
              <div
                role="radiogroup"
                aria-label="选择预算"
                className="flex flex-wrap items-center gap-2"
              >
                {BUDGETS.map((b) => (
                  <Chip
                    key={b.key}
                    selected={value.budget === b.key}
                    onClick={() => onChange({ ...value, budget: b.key })}
                    emoji={b.emoji}
                    label={b.label}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
