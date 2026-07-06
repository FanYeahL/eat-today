"use client";

/**
 * 水占状态机 hook（图层之上的「大脑」）
 * ─────────────────────────────────────────────
 * 把「投签 → 落水 → 涟漪 → 显影 → 探店」的相位流转，与渲染层彻底解耦。
 * 组件只读 phase 渲染、调方法推进；所有计时与清理收在这里，避免散落在各组件的 effect 里。
 *
 * 相位（单向推进，reset 回到 idle）：
 *   idle      —— 签纸悬浮空中，等用户「投签」（拉杆/点击）
 *   casting   —— 签纸旋转倾斜、阻尼下落中（落水动画交给 DivinationSlip）
 *   splash    —— 触水瞬间：涟漪扩散、纸张洇湿（阴影消失、透明度降）
 *   revealing —— 菜名/文案由模糊到清晰显影中
 *   revealed  —— 签面定形，可「再占」或「探店」
 *   exploring —— 水底漂流卡漂入，左右划看附近店
 *
 * 关键：相位推进由「动画完成回调 + 兜底计时器」双驱动——
 * 动画 onComplete 正常推进；万一某帧丢了回调，计时器兜底，状态机绝不卡死。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { TIMING } from "@/lib/water-motion";

export type WaterPhase =
  | "idle"
  | "casting"
  | "splash"
  | "revealing"
  | "revealed"
  | "exploring";

/** 点击涟漪：屏幕坐标 + 唯一 id（动画结束自销毁） */
export interface TapRipple {
  id: number;
  x: number;
  y: number;
}

export interface UseWaterDivination {
  phase: WaterPhase;
  /** 签面内容是否该显影（revealing/revealed/exploring 为真） */
  contentVisible: boolean;
  /** 当前点击涟漪列表（交给 RippleLayer 渲染） */
  taps: TapRipple[];
  /** 投签：idle → casting，启动落水 */
  cast: () => void;
  /** 由 DivinationSlip 在落水动画结束时调用：casting → splash */
  onSlipAlighted: () => void;
  /** 进入水底探店：revealed → exploring */
  explore: () => void;
  /** 从探店返回签面：exploring → revealed */
  backToSlip: () => void;
  /** 复位：任意相位 → idle（清空计时器与涟漪） */
  reset: () => void;
  /** 在坐标处激起一圈点击涟漪（常驻交互层用） */
  spawnTap: (x: number, y: number) => void;
  /** 某点击涟漪动画结束，移除它 */
  removeTap: (id: number) => void;
}

export function useWaterDivination(): UseWaterDivination {
  const [phase, setPhase] = useState<WaterPhase>("idle");
  const [taps, setTaps] = useState<TapRipple[]>([]);

  // 所有兜底计时器集中管理，reset/卸载时一次清干净
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tapSeq = useRef(0);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, sec: number) => {
    const t = setTimeout(fn, sec * 1000);
    timers.current.push(t);
  }, []);

  // 卸载时清计时器，防泄漏
  useEffect(() => () => clearTimers(), [clearTimers]);

  const cast = useCallback(() => {
    setPhase((p) => (p === "idle" ? "casting" : p));
    // 触水点即起涟漪：早于完全定格，涟漪与落水同步（晃动收敛在后台继续）。
    schedule(() => {
      setPhase((p) => (p === "casting" ? "splash" : p));
    }, TIMING.contact);
    // 兜底：万一 schedule 被打断，按 drop 时长再兜一次。
    schedule(() => {
      setPhase((p) => (p === "casting" ? "splash" : p));
    }, TIMING.drop + 0.5);
  }, [schedule]);

  // 落水弹簧 onComplete 的兜底推进（与 contact 计时器谁先到谁推，幂等）。
  const onSlipAlighted = useCallback(() => {
    setPhase((p) => (p === "casting" ? "splash" : p));
  }, []);

  // splash 进入后，编排「涟漪起拍 → 显影 → 定形」
  useEffect(() => {
    if (phase !== "splash") return;
    schedule(() => setPhase("revealing"), TIMING.beat);
    schedule(
      () => setPhase("revealed"),
      TIMING.beat + TIMING.develop + 0.1,
    );
  }, [phase, schedule]);

  const explore = useCallback(() => {
    setPhase((p) => (p === "revealed" ? "exploring" : p));
  }, []);

  const backToSlip = useCallback(() => {
    setPhase((p) => (p === "exploring" ? "revealed" : p));
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setTaps([]);
    setPhase("idle");
  }, [clearTimers]);

  const spawnTap = useCallback((x: number, y: number) => {
    const id = ++tapSeq.current;
    setTaps((prev) => [...prev, { id, x, y }]);
  }, []);

  const removeTap = useCallback((id: number) => {
    setTaps((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contentVisible =
    phase === "revealing" || phase === "revealed" || phase === "exploring";

  return {
    phase,
    contentVisible,
    taps,
    cast,
    onSlipAlighted,
    explore,
    backToSlip,
    reset,
    spawnTap,
    removeTap,
  };
}
