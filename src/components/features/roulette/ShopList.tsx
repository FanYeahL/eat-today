"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useShops, type GeoReason } from "@/hooks/useShops";
import { recordVisit } from "@/lib/regulars";
import { keywordOf } from "@/lib/availability";
import CityPicker from "./CityPicker";
import type { Shop } from "@/types/shop";
import type { Food } from "@/types/food";

type ShopListProps = {
  /** 当前查询的食物（用名字查店铺，没店时用 recipe 走 DIY） */
  food: Food;
};

/** 根据定位失败原因给出针对性提示 */
function geoHint(reason: GeoReason): string {
  switch (reason) {
    case "denied":
      return "定位权限被拒了。可在地址栏/系统设置里给浏览器开定位，或直接滚动选城市：";
    case "unavailable":
      return "系统暂时拿不到位置（定位服务可能没开）。滚动选个城市再查：";
    case "timeout":
      return "定位超时了。滚动选个城市，或稍后重试：";
    case "unsupported":
      return "当前用 HTTP 地址打开，手机浏览器不给定位权限，只能按城市搜（无距离排序）。想要「就近」请改用 https 地址访问。先滚动选城市：";
    default:
      return "没拿到你的位置，滚动选个城市再查：";
  }
}

/** 拼一个跳转到高德地图的链接（marker 定位到店铺） */
function amapLink(shop: Shop): string {
  if (!shop.location) {
    return `https://uri.amap.com/search?keyword=${encodeURIComponent(
      shop.name,
    )}`;
  }
  return `https://uri.amap.com/marker?position=${shop.location}&name=${encodeURIComponent(
    shop.name,
  )}`;
}

/** 严格匹配≥这个数就够选了，不必展开第二层 */
const STRICT_ENOUGH = 4;

/** 单张店铺卡片 */
function ShopCard({ shop, onVisit }: { shop: Shop; onVisit: () => void }) {
  return (
    <a
      href={amapLink(shop)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onVisit}
      className="group flex items-start justify-between gap-3 rounded-xl border border-brand/30 bg-surface/70 px-4 py-3 text-left transition-colors hover:border-accent/60 hover:bg-surface-2/80"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink group-hover:text-accent">
          {shop.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted/70">
          {shop.address}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        {shop.rating !== null && (
          <span className="font-semibold text-gold">
            ★ {shop.rating.toFixed(1)}
          </span>
        )}
        {shop.distance !== null && (
          <span className="text-info">
            {shop.distance >= 1000
              ? `${(shop.distance / 1000).toFixed(1)}km`
              : `${shop.distance}m`}
          </span>
        )}
      </div>
    </a>
  );
}

/** 第二层·扩展推荐卡片：突出「店类型」标签（这家是哪类、为什么可能也卖） */
function ExpansionCard({ shop, onVisit }: { shop: Shop; onVisit: () => void }) {
  return (
    <a
      href={amapLink(shop)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onVisit}
      className="group flex items-start justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-surface-2/70"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate font-semibold text-ink group-hover:text-accent">
            {shop.name}
          </span>
          {shop.category && (
            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand-soft">
              {shop.category}
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted/70">
          {shop.address}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        {shop.rating !== null && (
          <span className="font-semibold text-gold">
            ★ {shop.rating.toFixed(1)}
          </span>
        )}
        {shop.distance !== null && (
          <span className="text-info">
            {shop.distance >= 1000
              ? `${(shop.distance / 1000).toFixed(1)}km`
              : `${shop.distance}m`}
          </span>
        )}
      </div>
    </a>
  );
}

/**
 * 店铺列表
 * 挂载即按 keyword 查询；自带 loading / 错误 / 手输城市兜底 / 空态。
 */
export default function ShopList({ food }: ShopListProps) {
  // 查店关键词与门控统一：shopKeyword ?? 菜系店类型词（回锅肉→川菜，问「附近有没有川菜馆」）。
  // 不再拿菜名硬搜，否则店招不含菜名时搜不到——但店里其实卖这道菜。
  const keyword = keywordOf(food);
  // 搜索词 ≠ 菜名时，提示显示菜名（你点的是啥），而不是搜索词，否则让人困惑。
  const useDishName = keyword !== food.name;
  const { shops, expansion, loading, error, needCity, fetched, geoReason, fetchShops } =
    useShops();

  // 挂载时自动查一次（走定位）
  useEffect(() => {
    fetchShops(keyword);
  }, [keyword, fetchShops]);

  // 记一次点店（常客信号），严格店 / 扩展店共用
  const visit = (shop: Shop) =>
    recordVisit(
      {
        shopId: shop.id,
        shopName: shop.name,
        foodId: food.id,
        cuisine: food.cuisine,
        kind: food.kind,
      },
      Date.now(),
    );

  // 两级推荐：严格匹配 < STRICT_ENOUGH 家、且有同类店时，在严格结果下方追加第二层。
  // 这样「找到了但选择太少（1~3 家）」也能给足选项，不必执着 keyword 是否 100% 精确。
  const showExpansion =
    !loading && fetched && shops.length < STRICT_ENOUGH && expansion.length > 0;
  // 严格、扩展都空 → 才是真·附近没有，温和诚实
  const showEmpty =
    !loading && fetched && shops.length === 0 && expansion.length === 0;
  // 第二层标题文案：完全没严格匹配 vs 有几家但不多，语气不同
  const expansionLead =
    shops.length === 0
      ? `附近暂时没有主打「${food.name}」的店，不过这些店通常也有，去看看 👇`
      : `直接卖「${food.name}」的选择不多，这些店通常也供应，可以一并看看 👇`;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-2 pt-3">
        {loading && (
          <p className="py-4 text-center text-sm text-ink-muted/70">
            {useDishName
              ? `正在找附近卖「${food.name}」的店…`
              : `正在搜「${keyword}」附近的店铺…`}
          </p>
        )}

        {!loading &&
          shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} onVisit={() => visit(shop)} />
          ))}

        {/* 第二层·扩展推荐：严格匹配不足时，追加「这些店通常也有」+ 店类型标签 */}
        {showExpansion && (
          <>
            <div className="mt-1 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-left">
              <p className="text-sm leading-relaxed text-ink">📍 {expansionLead}</p>
            </div>
            {expansion.map((shop) => (
              <ExpansionCard
                key={shop.id}
                shop={shop}
                onVisit={() => visit(shop)}
              />
            ))}
          </>
        )}

        {/* 严格、扩展都空 → 真·附近没有，温和诚实，不塞「自己做」 */}
        {showEmpty && (
          <p className="py-4 text-center text-sm text-ink-muted/70">
            这会儿附近是真没搜到「{food.name}」相关的店，换一样或再摇一次试试～
          </p>
        )}

        {/* 定位不可用 → 滚轮选城市兜底 */}
        {!loading && needCity && (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs text-ink-muted/80">{geoHint(geoReason)}</p>
            <CityPicker onConfirm={(city) => fetchShops(keyword, city)} />
          </div>
        )}

        {/* 错误态（非 needCity 的普通错误） */}
        {!loading && error && !needCity && (
          <p className="py-3 text-center text-sm text-accent-pink">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
