"use client";

/**
 * 水底探店层（去货架化）
 * ─────────────────────────────────────────────
 * 不做点评列表。三张被水流洗过的极简白卡，缓缓上浮漂入，常驻微浮动。
 * 一次聚焦一张：拖拽（drag）向左/右划走，露出下一张，像在水里捞鱼。
 * 只承载：店名 / 距离 / 一键导航。
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { driftCardVariants } from "@/lib/water-motion";
import { shopsSignature, clampFocus } from "./drift-cards.logic";

export interface DriftShop {
  id: string;
  emoji: string;
  name: string;
  /** 距离展示文本，如 "240m" / "1.2km" */
  distance: string;
  /** "lng,lat" 经纬度；用于拼跳转高德的导航链接（可能缺失） */
  location: string;
  /** strict=直接卖这道的店 / expansion=第二层「通常也有」的同类店 */
  tier: "strict" | "expansion";
  /** 店类型标签（仅 expansion 卡展示，如「快餐厅」「咖啡厅」），可能缺失 */
  category: string | null;
}

type DriftCardsProps = {
  shops: DriftShop[];
  onClose: () => void;
  /** 点「一键导航」跳高德那下：记一次常客信号（真意图，非浏览） */
  onVisit: (shop: DriftShop) => void;
  /** 返回首页（筛选屏） */
  onHome: () => void;
};

/** 拼一个跳转到高德地图的链接（有坐标 marker 定位，否则按店名搜索）。 */
function amapLink(shop: DriftShop): string {
  if (!shop.location) {
    return `https://uri.amap.com/search?keyword=${encodeURIComponent(shop.name)}`;
  }
  return `https://uri.amap.com/marker?position=${shop.location}&name=${encodeURIComponent(
    shop.name,
  )}`;
}

export default function DriftCards({
  shops,
  onClose,
  onVisit,
  onHome,
}: DriftCardsProps) {
  // 当前聚焦的卡 index；划走一张就 +1，到底回到 0（循环捞）
  const [focus, setFocus] = useState(0);

  // 切菜（shops 换成另一道的店集）时把 focus 归零：否则 focus 停在旧高 index，
  // 新列表更短时所有 offset=i-focus<0 会被下面的门控全过滤 → 界面空白（原 bug）。
  // 依赖用「内容签名」而非 shops 数组引用——父层每帧重建 driftShops（新引用），
  // 用引用会每帧 reset、划卡立刻被打回第一张。
  const sig = shopsSignature(shops);
  useEffect(() => {
    setFocus(0);
  }, [sig]);

  // 渲染时再夹一层：即便 effect 还没提交，focus 也不越界，绝不产生空白帧。
  const safeFocus = clampFocus(focus, shops.length);

  const strictCount = shops.filter((s) => s.tier === "strict").length;
  const hasExpansion = shops.some((s) => s.tier === "expansion");
  // 标题随两级动态：纯严格 / 严格不足靠同类店补 / 全是同类店
  const heading =
    strictCount === 0
      ? "— 附近没主打这道的店 · 这些通常也有 —"
      : hasExpansion
        ? `— 主打这道的 ${strictCount} 家 · 后面是通常也有的 —`
        : "— 水底漂来这几家 · 划走看下一家 —";

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-10"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, rgba(63,143,208,0.08) 60%, rgba(63,143,208,0.16) 100%)",
        backdropFilter: "blur(2px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="mb-5 rounded-full px-4 py-1.5 text-xs tracking-[0.2em] text-ink/70"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 4px 14px rgba(63,143,208,0.12)",
        }}
      >
        {heading}
      </div>

      <div className="relative h-52 w-72">
        <AnimatePresence>
          {shops.map((shop, i) => {
            const offset = i - safeFocus;
            // 只渲染当前及其后两张，叠成一小摞
            if (offset < 0 || offset > 2) return null;
            const isTop = offset === 0;
            const isExpansion = shop.tier === "expansion";
            return (
              <motion.div
                key={shop.id}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-3xl border border-brand/20 bg-white/90 px-6 backdrop-blur-md"
                style={{
                  boxShadow: "0 16px 40px rgba(63,143,208,0.18)",
                  zIndex: 10 - offset,
                  willChange: "transform, opacity",
                }}
                custom={offset}
                variants={driftCardVariants}
                initial="hidden"
                animate={["shown", "float"]}
                exit={{
                  x: 320,
                  opacity: 0,
                  rotate: 12,
                  transition: { duration: 0.45, ease: "easeIn" },
                }}
                // 叠摞透视：后面的卡略小、略下沉
                transformTemplate={(_, gen) =>
                  `translateY(${offset * 14}px) scale(${1 - offset * 0.05}) ${gen}`
                }
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 90) {
                    // 从当前实际显示的卡（safeFocus）推进，避免 focus 若为脏值时跳错。
                    setFocus((f) => (clampFocus(f, shops.length) + 1) % shops.length);
                  }
                }}
              >
                {/* 只有顶层卡渲染内容；后面两张只露空白卡壳做厚度感，
                    不再透出多余的 emoji / 店名 / 导航按钮（叠摞才干净）。 */}
                {isTop && (
                  <>
                    <div className="text-4xl">{shop.emoji}</div>
                    <div className="text-lg font-bold text-ink">{shop.name}</div>
                    {/* 第二层卡：标出店类型 + 一句「通常也有」，让用户懂为什么推它 */}
                    {isExpansion && (
                      <div className="flex flex-col items-center gap-1">
                        {shop.category && (
                          <span className="rounded-full bg-brand/12 px-2.5 py-0.5 text-[11px] font-medium text-brand-soft">
                            {shop.category}
                          </span>
                        )}
                        <span className="text-[11px] text-ink-muted/60">
                          这类店通常也有
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-semibold tracking-wide text-info">
                      {shop.distance}
                    </div>
                    <button
                      className="mt-1 rounded-full bg-accent-hot px-5 py-1.5 text-sm font-semibold text-white"
                      onClick={() => {
                        onVisit(shop);
                        window.open(
                          amapLink(shop),
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      一键导航 ›
                    </button>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center gap-5">
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
    </motion.div>
  );
}
