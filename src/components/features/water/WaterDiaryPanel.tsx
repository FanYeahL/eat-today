"use client";

/**
 * 水占·干饭日记面板
 * ─────────────────────────────────────────────
 * 把老虎机的 DiaryView 原样搬进水占：DiaryView 本就用全站浅色 token
 * （天空蓝/草木绿），不需重画配色——这里只负责一层「浮在水面上」的
 * 半透明卡壳 + 滚动容器，让它落进水占的清冷氛围里。
 *
 * 数据骨干仍是 lib/diary（与老虎机同源）：水占「循此而去」写入的记录，
 * 这里直接读得到，两个入口共用同一本日记。
 */

import { motion } from "framer-motion";
import DiaryView from "@/components/features/water/DiaryView";

type WaterDiaryPanelProps = {
  /** 收回面板，回到投签场景 */
  onClose: () => void;
};

export default function WaterDiaryPanel({ onClose }: WaterDiaryPanelProps) {
  return (
    <motion.div
      key="diary-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute inset-0 z-50 flex justify-center overflow-y-auto px-5 pb-12 pt-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(240,247,244,0.92) 0%, rgba(227,239,234,0.96) 100%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="w-full max-w-md">
        <DiaryView onBack={onClose} />
      </div>
    </motion.div>
  );
}
