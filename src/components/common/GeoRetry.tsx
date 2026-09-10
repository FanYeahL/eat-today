"use client";

import type { GeoReason } from "@/lib/geo";

/** 两套主题共用失败恢复入口，父组件负责选择当前菜并重新查询。 */
export default function GeoRetry({
  reason,
  onRetry,
}: {
  reason: GeoReason;
  onRetry: () => void;
}) {
  if (reason === "unsupported" || reason === null) return null;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {reason === "denied" && (
        <p className="text-xs text-ink-muted">
          请先在浏览器或系统设置中允许定位，再重试。
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-brand/40 px-4 py-2 text-sm text-brand-soft transition-colors hover:border-accent hover:text-accent"
      >
        重试定位
      </button>
    </div>
  );
}
