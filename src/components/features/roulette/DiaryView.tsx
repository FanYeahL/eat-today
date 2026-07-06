"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import NeonButton from "@/components/common/NeonButton";
import { mealMeta } from "@/config/meals";
import {
  getEntries,
  computeStats,
  gentleReminder,
  clearDiary,
  type DiaryEntry,
  type DiaryStats,
} from "@/lib/diary";

type DiaryViewProps = {
  /** 返回上一层 */
  onBack: () => void;
};

/** 把时间戳格式化成「6月23日 周一」 */
function formatDay(ts: number): string {
  const d = new Date(ts);
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
}

/** 把同一天的记录归到一组，组内按时间倒序 */
function groupByDay(entries: DiaryEntry[]): { day: string; rows: DiaryEntry[] }[] {
  const map = new Map<string, DiaryEntry[]>();
  // 倒序：最近的在最前
  for (const e of [...entries].reverse()) {
    const key = formatDay(e.ts);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map, ([day, rows]) => ({ day, rows }));
}

/** 一块统计数字卡 */
function StatCard({
  value,
  label,
  emoji,
}: {
  value: string | number;
  label: string;
  emoji: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-brand/20 bg-brand/5 px-3 py-4">
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="text-2xl font-black text-ink">{value}</span>
      <span className="text-xs text-ink-muted/70">{label}</span>
    </div>
  );
}

/**
 * 干饭日记
 * 把每次「定了」的记录铺成简约看板：本月解决几次 / 最懂的品类 / 陪伴天数，
 * 外加一句从最近吃饭模式里长出来的轻提醒。
 * 纪律：口径只增不减，没有连续打卡，不制造愧疚——只做温柔的陪伴。
 */
export default function DiaryView({ onBack }: DiaryViewProps) {
  // 统计 / 列表都依赖「现在」，放 effect 里取，避免 SSR 水合不一致
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [reminder, setReminder] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    setStats(computeStats(now));
    setReminder(gentleReminder(now));
    setEntries(getEntries());
  }, []);

  const grouped = useMemo(() => groupByDay(entries), [entries]);

  const handleClear = () => {
    if (typeof window !== "undefined" && window.confirm("清空全部干饭记录？这步没法撤销哦。")) {
      clearDiary();
      const now = Date.now();
      setStats(computeStats(now));
      setReminder(null);
      setEntries([]);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex w-full flex-col items-center gap-6"
    >
      <button
        onClick={onBack}
        className="self-start text-sm text-brand-soft transition-colors hover:text-accent"
      >
        ← 返回
      </button>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm uppercase tracking-[0.3em] text-brand-soft">
          我的干饭日记
        </span>
        <p className="text-xs text-ink-muted/60">
          每次「定了」都会悄悄记一笔，陪你一起对抗纠结症
        </p>
      </div>

      {/* 还没有记录：温柔的空态，不催 */}
      {stats && !stats.hasData && (
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="text-4xl">🍚</span>
          <p className="max-w-xs text-balance text-sm leading-relaxed text-ink-muted/80">
            还没有记录呢。去摇一套、点个「定了」，
            <br />
            这里就会留下你的第一笔干饭足迹。
          </p>
          <NeonButton onClick={onBack} variant="primary">
            去摇一个
          </NeonButton>
        </div>
      )}

      {stats && stats.hasData && (
        <>
          {/* 三块统计 */}
          <div className="flex w-full max-w-md gap-3">
            <StatCard value={stats.thisMonth} label="本月解决次数" emoji="🏁" />
            <StatCard
              value={stats.topFamily ? stats.topFamily.label : "—"}
              label={stats.topFamily ? `最懂你 · ${stats.topFamily.count}次` : "最懂你"}
              emoji={stats.topFamily ? stats.topFamily.emoji : "🍽️"}
            />
            <StatCard value={stats.companionDays} label="陪伴天数" emoji="🪐" />
          </div>

          {/* 轻提醒：从最近吃饭模式里长出来的一句关心 */}
          {reminder && (
            <div className="w-full max-w-md rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-left">
              <p className="text-sm leading-relaxed text-ink">💬 {reminder}</p>
            </div>
          )}

          {/* 记录列表，按天分组 */}
          <div className="flex w-full max-w-md flex-col gap-4">
            {grouped.map(({ day, rows }) => (
              <div key={day} className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-brand-soft/80">{day}</span>
                {rows.map((e) => (
                  <div
                    key={e.ts}
                    className="flex items-start gap-2 rounded-xl border border-brand/20 bg-surface/70 px-3 py-2.5"
                  >
                    <span className="shrink-0 text-xs text-ink-muted/60">
                      {mealMeta(e.meal).emoji}
                    </span>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink">
                      {e.items.map((f) => (
                        <span key={f.id} className="leading-none">
                          {f.emoji} {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="text-xs text-ink-muted/40 transition-colors hover:text-accent-pink"
          >
            清空记录
          </button>
        </>
      )}
    </motion.section>
  );
}
