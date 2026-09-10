"use client";

interface FilterPillProps {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  multi?: boolean;
}

/** 共享单/多选无障碍语义与按钮结构，视觉 classes 仍按主题保留。 */
function FilterPill({
  selected,
  onClick,
  emoji,
  label,
  multi = false,
  theme,
}: FilterPillProps & { theme: "picker" | "water" }) {
  const classes =
    theme === "picker"
      ? `flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.94] ${selected ? "-translate-y-0.5 border-brand bg-brand text-white shadow-[0_5px_14px_rgb(var(--c-brand)_/_0.3)]" : "border-brand/40 bg-surface text-ink-muted"}`
      : `flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all ${selected ? "border-accent bg-accent-hot/15 text-accent shadow-[0_4px_14px_rgb(var(--c-accent)_/_0.18)]" : "border-brand/40 bg-brand/5 text-ink-muted hover:border-accent/60 hover:text-accent"}`;
  return (
    <button
      {...(multi
        ? { "aria-pressed": selected }
        : { role: "radio", "aria-checked": selected })}
      onClick={onClick}
      className={classes}
    >
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </button>
  );
}

export function PickerFilterPill(props: FilterPillProps) {
  return <FilterPill {...props} theme="picker" />;
}
export function WaterFilterPill(props: FilterPillProps) {
  return <FilterPill {...props} theme="water" />;
}
