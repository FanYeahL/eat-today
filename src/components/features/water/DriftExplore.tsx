"use client";

import { motion } from "framer-motion";
import DriftCards, { type DriftShop } from "./DriftCards";
import CityPicker from "./CityPicker";
import GeoRetry from "@/components/common/GeoRetry";
import type { GeoReason } from "@/lib/geo";
import type { Food } from "@/types/food";

export default function DriftExplore({
  loading,
  fetched,
  error,
  needCity,
  geoReason,
  onRetryGeo,
  shops,
  dishName,
  dishes,
  activeId,
  onPickDish,
  onPickCity,
  onVisit,
  onClose,
  onHome,
}: {
  loading: boolean;
  fetched: boolean;
  /** useShops 的错误信息；非空 = 真·查询失败（区别于「搜完 0 家」），要如实提示+给重试，别伪装成「附近没有」 */
  error: string | null;
  needCity: boolean;
  geoReason: GeoReason;
  onRetryGeo: () => void;
  shops: DriftShop[];
  dishName: string;
  /** 已定的整桌；>1 道时顶部出现切菜 chips */
  dishes: Food[];
  activeId: string | null;
  onPickDish: (id: string) => void;
  onPickCity: (city: string) => void;
  onVisit: (shop: DriftShop) => void;
  onClose: () => void;
  /** 返回首页（筛选屏），重置全部状态 */
  onHome: () => void;
}) {
  // 多道菜时，顶部一排可切换的菜 chip：点哪道看哪道的店。
  const switcher =
    dishes.length > 1 ? (
      <div className="pointer-events-auto absolute left-1/2 top-20 z-40 flex max-w-[88vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
        {dishes.map((f) => {
          const active = f.id === activeId;
          return (
            <button
              key={f.id}
              onClick={() => onPickDish(f.id)}
              aria-pressed={active}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs backdrop-blur transition-colors"
              style={{
                background: active
                  ? "rgba(150,179,170,0.45)"
                  : "rgba(255,255,255,0.5)",
                border: active
                  ? "1px solid rgba(255,255,255,0.8)"
                  : "1px solid rgba(255,255,255,0.45)",
                color: active
                  ? "rgb(var(--c-ink))"
                  : "rgb(var(--c-brand-soft))",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span>{f.emoji}</span>
              <span className="max-w-[6rem] truncate">{f.name}</span>
            </button>
          );
        })}
      </div>
    ) : null;

  // 有店（严格 shops 或第二层扩展店）→ 漂卡
  if (!loading && fetched && shops.length > 0) {
    return (
      <>
        {switcher}
        <DriftCards
          shops={shops}
          onClose={onClose}
          onVisit={onVisit}
          onHome={onHome}
        />
      </>
    );
  }

  return (
    <motion.div
      className="water-depth-overlay absolute inset-0 z-30 flex flex-col items-center justify-end pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {switcher}
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <p className="mb-20 text-sm tracking-[0.2em] text-brand-soft">
            — 正在水底寻店… —
          </p>
          <button
            onClick={onClose}
            className="text-sm text-brand-soft transition-colors hover:text-accent"
          >
            ↑ 收回签纸
          </button>
        </div>
      ) : needCity ? (
        // 定位失败：让用户手输城市兜底
        <div className="mb-16 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-brand/20 bg-white/85 px-5 py-4 backdrop-blur-md">
          <p className="text-center text-xs leading-relaxed text-ink-muted/80">
            没拿到你的位置，滚动选个城市，看看哪儿能吃到「{dishName}」：
          </p>
          <CityPicker onConfirm={onPickCity} />
          <GeoRetry reason={geoReason} onRetry={onRetryGeo} />
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      ) : error && !needCity ? (
        // 真·查询失败（网络/接口报错）：如实说，给重试，别伪装成「附近没有」误导用户。
        <div className="mb-16 flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-accent-pink/30 bg-white/85 px-5 py-4 text-center backdrop-blur-md">
          <p className="text-sm leading-relaxed text-accent-pink">{error}</p>
          <p className="text-xs text-ink-muted/70">
            网络或服务出了点岔子，不是附近没有。
          </p>
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-xs text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      ) : (
        // 真·附近没有（高德也翻不出相关店）
        <div className="flex flex-col items-center gap-3">
          <p className="mb-20 text-sm tracking-[0.2em] text-brand-soft">
            — 这会儿附近没寻到卖「{dishName}」的店，换一签试试 —
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-sm text-brand-soft transition-colors hover:text-accent"
            >
              ↑ 收回签纸
            </button>
            <button
              onClick={onHome}
              className="text-sm text-brand-soft transition-colors hover:text-accent"
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
