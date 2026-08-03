"use client";

/**
 * 今日菜单板 · 填空句式筛选
 * ─────────────────────────────────────────────
 * 把「风味 / 心情 / 预算」三档做成一句可点的填空短语：
 *   「我想吃 [口味▾] [心情▾] [预算▾]」
 * 每个 [ ] 是一个下拉气泡（tap 展开选项），比旧的一排 chip 表单更像人话、
 * 结构上也彻底不同（不是三行 label + chip 组）。
 * 注：S6.1 去掉了「，今天」「，预算」「。」连接词——它们约 70px 前缀是手机上折行的元凶；
 * 一行化后句式趣味改由 pill 占位文案承载（不挑心情 / 不限预算 / 随便吃点…）。
 *
 * 只做表现层：读写的仍是 pick-core 的 Filters（families/mood/budget）+ RegionKey，
 * 抽取逻辑一行不改。风味多选（经典中式时露地区二级）；心情/预算单选。
 * 可点区域用足够大的 slot 按钮保证可用性，不为句式牺牲点击目标。
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { familyList } from "@/config/cuisine";
import { regionList } from "@/config/regions-cuisine";
import type { Filters } from "@/lib/pick-core";
import type { CuisineFamily, RegionKey } from "@/types/food";

type MenuFilterProps = {
  value: Filters;
  onChange: (next: Filters) => void;
  region: RegionKey;
  onRegionChange: (region: RegionKey) => void;
};

const MOODS: { key: Filters["mood"]; label: string; emoji: string }[] = [
  { key: "any", label: "不挑心情", emoji: "🤙" },
  { key: "spicy", label: "想吃点辣的", emoji: "🌶️" },
  { key: "mild", label: "淡淡的就好", emoji: "🌿" },
  { key: "meat", label: "大口吃肉", emoji: "🍖" },
  { key: "light", label: "控卡轻食", emoji: "🥗" },
];

const BUDGETS: { key: Filters["budget"]; label: string; emoji: string }[] = [
  { key: "any", label: "不限预算", emoji: "💸" },
  { key: "budget", label: "随便吃点", emoji: "🪙" },
  { key: "normal", label: "正常水平", emoji: "💵" },
  { key: "treat", label: "想吃好的", emoji: "💎" },
];

/** 风味家族多选 → 一句话摘要（填进 slot）。 */
function familiesSummary(families: CuisineFamily[]): string {
  if (families.length === 0) return "不限口味";
  return families
    .map((f) => familyList.find((x) => x.key === f)?.label ?? f)
    .join(" · ");
}

/** 可点的填空槽：下划线气泡按钮，展开一个浮层选项面板。 */
function Slot({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={active}
      className={`mx-0.5 inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 text-sm font-bold transition-all duration-200 active:scale-[0.95] ${
        active
          ? "border-transparent bg-brand text-white"
          : "border-ink/12 bg-surface text-ink"
      }`}
    >
      {text}
      <span aria-hidden className="text-[10px] opacity-70">
        ▾
      </span>
    </button>
  );
}

/** 选项面板里的单个选项按钮。 */
function Opt({
  selected,
  onClick,
  emoji,
  label,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  multi?: boolean;
}) {
  return (
    <button
      {...(multi
        ? { "aria-pressed": selected }
        : { role: "radio", "aria-checked": selected })}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.94] ${
        selected
          ? "-translate-y-0.5 border-brand bg-brand text-white shadow-[0_5px_14px_rgb(var(--c-brand)_/_0.3)]"
          : "border-brand/40 bg-surface text-ink-muted"
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </button>
  );
}

type OpenSlot = null | "flavor" | "mood" | "budget";

export default function MenuFilter({
  value,
  onChange,
  region,
  onRegionChange,
}: MenuFilterProps) {
  const [open, setOpen] = useState<OpenSlot>(null);
  const toggle = (slot: Exclude<OpenSlot, null>) =>
    setOpen((o) => (o === slot ? null : slot));

  const toggleFamily = (fam: CuisineFamily) => {
    const has = value.families.includes(fam);
    const families = has
      ? value.families.filter((f) => f !== fam)
      : [...value.families, fam];
    onChange({ ...value, families });
  };

  const showRegion =
    value.families.length === 0 || value.families.includes("chinese");
  const moodLabel = MOODS.find((m) => m.key === value.mood)?.label ?? "不挑心情";
  const budgetLabel =
    BUDGETS.find((b) => b.key === value.budget)?.label ?? "不限预算";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 填空句一行化（方案 §4.5 字面形态：「我想吃 [口味▾] [心情▾] [预算▾]」）——
          去掉「，今天」「，预算」「。」连接词（它们是换行的元凶，约 70px 前缀）：
          一句「我想吃」引子 + 三个 pill，句式趣味保留在 pill 占位文案里（不挑心情 / 不限预算…）。
          flex-wrap 仍兜底极窄屏；nowrap 短语 token 防中文断字。 */}
      <p className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-semibold leading-relaxed text-ink">
        <span className="inline-flex items-center whitespace-nowrap">
          我想吃
          <Slot
            text={familiesSummary(value.families)}
            active={open === "flavor"}
            onClick={() => toggle("flavor")}
          />
        </span>
        <span className="inline-flex items-center whitespace-nowrap">
          <Slot
            text={moodLabel}
            active={open === "mood"}
            onClick={() => toggle("mood")}
          />
        </span>
        <span className="inline-flex items-center whitespace-nowrap">
          <Slot
            text={budgetLabel}
            active={open === "budget"}
            onClick={() => toggle("budget")}
          />
        </span>
      </p>

      {/* 展开的选项面板：一次只开一个槽，选项用足够大的按钮 */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, height: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, height: "auto", y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-brand/20 bg-surface/80 p-3.5">
              {open === "flavor" && (
                <>
                  <div
                    role="group"
                    aria-label="选择风味（可多选）"
                    className="flex flex-wrap gap-2"
                  >
                    {familyList.map((f) => (
                      <Opt
                        key={f.key}
                        multi
                        selected={value.families.includes(f.key)}
                        onClick={() => toggleFamily(f.key)}
                        emoji={f.emoji}
                        label={f.label}
                      />
                    ))}
                  </div>
                  {showRegion && (
                    <div className="flex flex-col gap-1.5 border-t border-brand/15 pt-2.5">
                      <span className="text-xs text-ink-muted/70">
                        按家乡口味调一调（可选）
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="选择口味地区"
                        className="flex flex-wrap gap-2"
                      >
                        {regionList.map((r) => (
                          <Opt
                            key={r.key}
                            selected={r.key === region}
                            onClick={() => onRegionChange(r.key)}
                            emoji={r.emoji}
                            label={r.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {open === "mood" && (
                <div
                  role="radiogroup"
                  aria-label="选择心情"
                  className="flex flex-wrap gap-2"
                >
                  {MOODS.map((m) => (
                    <Opt
                      key={m.key}
                      selected={value.mood === m.key}
                      onClick={() => {
                        onChange({ ...value, mood: m.key });
                        setOpen(null);
                      }}
                      emoji={m.emoji}
                      label={m.label}
                    />
                  ))}
                </div>
              )}

              {open === "budget" && (
                <div
                  role="radiogroup"
                  aria-label="选择预算"
                  className="flex flex-wrap gap-2"
                >
                  {BUDGETS.map((b) => (
                    <Opt
                      key={b.key}
                      selected={value.budget === b.key}
                      onClick={() => {
                        onChange({ ...value, budget: b.key });
                        setOpen(null);
                      }}
                      emoji={b.emoji}
                      label={b.label}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
