"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { topRegularShops, type RegularShop } from "@/lib/regulars";

/**
 * 最近常翻（隐式个性化的「看得见」那一层）
 * app 自己从你的点店历史学出常客，攒够了才浮现——零冷启动，没料不出现。
 * 只是温和地让你看见「它记得你爱去哪」，真正的加权在算法里悄悄发生。
 */
export default function RegularsHint() {
  // 依赖「现在」，放 effect 里读，避免 SSR 水合不一致
  const [shops, setShops] = useState<RegularShop[]>([]);
  useEffect(() => {
    setShops(topRegularShops(Date.now()));
  }, []);

  if (shops.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-2.5 text-sm"
    >
      <span className="text-brand-soft">🏠 最近常翻</span>
      {shops.map((s, i) => (
        <span key={s.shopId} className="text-ink">
          {i > 0 && <span className="text-ink-muted/40"> · </span>}
          {s.shopName}
        </span>
      ))}
    </motion.div>
  );
}
