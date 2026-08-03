"use client";

/**
 * Universal Food Picker · 探店结果（V2 暖色）
 * ─────────────────────────────────────────────
 * 替代旧 DriftCards 的水占「水底漂流卡」职责，但去水占化：
 * 不做滑动摞 / 收回签纸 / 水底措辞，改成明亮 organic 的竖向卡片列表——
 * 更清楚、更省心（对齐上班族/普通用户「好懂可信」的验收点）。
 *
 * 保留全部功能：strict + expansion 两级、多道菜切换、一键导航（amap）+ onVisit
 * 常客信号、loading / needCity(CityPicker) / error / 空 四态兜底。
 * 逻辑不重写——所有编排（查店/切菜/记信号）仍在 UniversalFoodPicker 里，
 * 这里只负责把状态渲染成暖色卡片。
 */

import { motion } from "framer-motion";
import CityPicker from "@/components/features/water/CityPicker";
import { shopsHeading, SHOPS_LEDE } from "./picker-copy";
import type { Food } from "@/types/food";

/** 一张店卡的最小渲染单元（由父层从 Shop[] 组装，带 emoji / 分级）。 */
export interface ShopCard {
  id: string;
  emoji: string;
  name: string;
  /** 距离展示文本，如 "240m" / "1.2km"（空串则不显示） */
  distance: string;
  /** "lng,lat"；用于拼高德导航链接（可能缺失） */
  location: string;
  /** strict=直接卖这道 / expansion=同类店「通常也有」 */
  tier: "strict" | "expansion";
  /** 店类型标签（仅 expansion 展示，如「快餐厅」） */
  category: string | null;
}

type ShopResultsProps = {
  cards: ShopCard[];
  /** 严格匹配店数（决定标题措辞） */
  strictCount: number;
  /** 当前正在探店的菜（emoji / 名字用它） */
  exploringFood: Food | null;
  /** 已定的整桌（>1 道时给切菜 chips） */
  confirmed: Food[];
  /** 当前探哪道的 id */
  exploringId: string | null;
  loading: boolean;
  error: string | null;
  needCity: boolean;
  /** 是否已成功查过一次（区分「搜完 0 家」与「还没搜」） */
  fetched: boolean;
  /** 点导航跳高德那下：记一次常客信号 */
  onVisit: (card: ShopCard) => void;
  /** 定位失败手输城市后重查 */
  onPickCity: (city: string) => void;
  /** 切看另一道菜的店 */
  onPickDish: (id: string) => void;
  /** 返回结果页 */
  onBack: () => void;
  /** 返回首页（choose） */
  onHome: () => void;
};

/** 拼跳转高德地图的链接（有坐标 marker 定位，否则按店名搜索）。 */
function amapLink(card: ShopCard): string {
  if (!card.location) {
    return `https://uri.amap.com/search?keyword=${encodeURIComponent(card.name)}`;
  }
  return `https://uri.amap.com/marker?position=${card.location}&name=${encodeURIComponent(
    card.name,
  )}`;
}

export default function ShopResults({
  cards,
  strictCount,
  exploringFood,
  confirmed,
  exploringId,
  loading,
  error,
  needCity,
  fetched,
  onVisit,
  onPickCity,
  onPickDish,
  onBack,
  onHome,
}: ShopResultsProps) {
  const hasExpansion = cards.some((c) => c.tier === "expansion");
  const empty = fetched && !loading && !error && cards.length === 0;
  const dishName = exploringFood?.name ?? "这道菜";

  return (
    <motion.div
      key="shop-results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex w-full flex-col gap-4"
    >
      {/* 顶栏：返回结果（左）+ 回首页（右） */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-medium text-brand-soft transition-colors hover:text-accent"
        >
          ← 返回推荐
        </button>
        <button
          onClick={onHome}
          className="text-sm font-medium text-brand-soft transition-colors hover:text-accent"
        >
          🏠 首页
        </button>
      </div>

      {/* 标题区：这份推荐附近哪里能吃到（左对齐，非居中） */}
      <div>
        <span className="text-xs font-medium text-ink-muted/70">{SHOPS_LEDE}</span>
        {exploringFood && (
          <h2 className="mt-0.5 flex items-center gap-2 text-2xl font-black text-ink">
            <span>{exploringFood.emoji}</span>
            {exploringFood.name}
          </h2>
        )}
      </div>

      {/* 多道菜切换 tab：定了不止一道时，切看每道的店（左对齐横排） */}
      {confirmed.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmed.map((f) => {
            const active = f.id === exploringId;
            return (
              <button
                key={f.id}
                onClick={() => onPickDish(f.id)}
                aria-pressed={active}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border-accent bg-accent-hot/12 text-accent-hot"
                    : "border-brand/40 bg-brand/5 text-ink-muted hover:border-accent/60 hover:text-accent"
                }`}
              >
                <span>{f.emoji}</span>
                <span className="max-w-[6rem] truncate">{f.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== 状态分支：loading / needCity / error / 空 / 店卡 ===== */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="relative h-16 w-16">
            <div
              aria-hidden
              className="picker-plate-spin absolute inset-0 rounded-full border-[3px] border-dashed border-accent/30 bg-accent-hot/8"
            />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">
              {exploringFood?.emoji ?? "🍜"}
            </span>
          </div>
          <p className="text-sm text-ink-muted/80">正在找附近的店…</p>
        </div>
      )}

      {/* 定位不可用：手输城市兜底（CityPicker 走 token，作用域内自动暖色） */}
      {!loading && needCity && (
        <div className="flex w-full flex-col items-center gap-3 py-4">
          <p className="text-sm text-ink-muted/80">
            没拿到你的位置，选个城市，帮你找「{dishName}」。
          </p>
          <div className="w-full">
            <CityPicker onConfirm={onPickCity} />
          </div>
        </div>
      )}

      {!loading && !needCity && error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-accent-pink">{error}</p>
        </div>
      )}

      {empty && !needCity && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-4xl">🤔</div>
          <p className="text-sm text-ink-muted/80">
            这会儿附近没找到卖「{dishName}」的店，换一道再试试。
          </p>
        </div>
      )}

      {/* 店卡列表 */}
      {!loading && !needCity && !error && cards.length > 0 && (
        <>
          <p className="text-center text-xs font-medium tracking-wide text-brand-soft">
            {shopsHeading(strictCount, hasExpansion)}
          </p>
          <div className="flex w-full flex-col gap-3">
            {cards.map((card, i) => {
              const isExpansion = card.tier === "expansion";
              return (
                <div
                  key={card.id}
                  // 店卡轻微 stagger 出现（.picker-serve-up + --i，克制：最多 6 档延迟）。
                  // 语义可迁移小程序（class + animation-delay），非 JS 逐帧。
                  className={`picker-serve-up meal-transition flex items-center gap-3 rounded-3xl border border-ink/10 bg-surface/85 px-4 py-3 shadow-[0_8px_20px_rgb(var(--glow)_/_0.1)] ${
                    i % 2 === 0 ? "rounded-tr-[2.75rem]" : "rounded-bl-[2.75rem]"
                  }`}
                  style={{ ["--i" as string]: Math.min(i, 6) }}
                >
                  {/* emoji 暖圆底 */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-2xl">
                    {card.emoji}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-bold text-ink">
                      {card.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {card.distance && (
                        <span className="text-sm font-semibold text-info">
                          {card.distance}
                        </span>
                      )}
                      {isExpansion && (
                        <span className="flex items-center gap-1 text-xs text-ink-muted/70">
                          {card.category && (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand-soft">
                              {card.category}
                            </span>
                          )}
                          <span>通常也有</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onVisit(card);
                      window.open(amapLink(card), "_blank", "noopener,noreferrer");
                    }}
                    className="shrink-0 rounded-full bg-gradient-to-r from-[rgb(var(--c-cta-a))] to-[rgb(var(--c-cta-b))] px-4 py-2 text-sm font-semibold text-white transition-transform duration-100 active:scale-[0.95]"
                  >
                    去这儿 ›
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
