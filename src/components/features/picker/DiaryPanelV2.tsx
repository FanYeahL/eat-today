"use client";

/**
 * Universal Food Picker · 吃饭记录（V2 轻壳）
 * ─────────────────────────────────────────────
 * 只做视觉统一的轻壳：暖色 organic 面板外壳，内部原样复用 DiaryView
 * （逻辑一行不改，与旧 WaterDiaryPanel 共用同一本 lib/diary 记录）。
 * DiaryView 自带 onBack 返回按钮，这里只提供暖色容器 + 滚动。
 */

import { motion } from "framer-motion";
import DiaryView from "@/components/features/water/DiaryView";

type DiaryPanelV2Props = {
  /** 收起面板，回到主流程 */
  onClose: () => void;
};

export default function DiaryPanelV2({ onClose }: DiaryPanelV2Props) {
  return (
    <motion.div
      key="diary-panel-v2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute inset-0 z-50 flex justify-center overflow-y-auto bg-base px-5 pb-12 pt-16"
    >
      <div className="w-full max-w-md">
        <DiaryView onBack={onClose} />
      </div>
    </motion.div>
  );
}
