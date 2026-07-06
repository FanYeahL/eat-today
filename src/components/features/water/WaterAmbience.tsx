"use client";

/**
 * 水底微观生态氛围层
 * ─────────────────────────────────────────────
 * 压在签纸下方（低 z）、背景之上，给静态画面注入纵深与生命力：
 *  ① 锦鲤剪影 —— SVG 路径 + CSS blur，半透明暖橘，极慢横游（blur 制造纵深）。
 *     位置/速度/朝向每次进页面随机生成，但垂直方向「分带 + 带内抖动」保证均匀不扎堆。
 *  ② 上升气泡 —— 透明微泡从底部缓升 + 涨缩呼吸 + 渐隐。
 *  ③ 阳光光柱 —— 两道极淡光束斜射入水，缓慢摇曳。
 *
 * 随机只在挂载后的 effect 里生成一次（避免 SSR 水合不一致 & 每帧抖动）。
 */

import { useEffect, useState } from "react";

/** 一条锦鲤的随机参数 */
type Koi = {
  scale: number;
  top: number;
  blur: number;
  dur: number;
  /** 负延迟（秒）：让它立刻在游、只是切入周期不同阶段 */
  phase: number;
  opacity: number;
  /** 游向：true = 从右往左（剪影水平翻转 + 动画反向） */
  reverse: boolean;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * 生成 n 条锦鲤：把垂直空间均分成 n 个带，每条落在自己带内的随机位置
 * （带内抖动），保证整体均匀又不像公式钉死。其余参数全随机。
 */
function makeKoi(n: number): Koi[] {
  const bandH = 70 / n; // 在 18%~88% 高度区间里分带
  return Array.from({ length: n }, (_, i) => {
    const bandTop = 18 + i * bandH;
    return {
      top: bandTop + rand(0.15, 0.85) * bandH, // 带内随机，不贴带边
      scale: rand(0.5, 1.05),
      blur: rand(1.5, 5),
      dur: rand(44, 74), // 越慢越远
      phase: rand(0, 70), // 随机切入周期
      opacity: rand(0.15, 0.3),
      reverse: Math.random() < 0.5,
    };
  });
}

/** 气泡：水平位置(%) / 尺寸(px) / 时长(s) / 延迟(s) */
const BUBBLES = [
  { left: 22, size: 8, dur: 14, delay: 0 },
  { left: 40, size: 5, dur: 11, delay: 3.5 },
  { left: 58, size: 11, dur: 17, delay: 1.5 },
  { left: 73, size: 6, dur: 13, delay: 6 },
  { left: 86, size: 4, dur: 10, delay: 4.5 },
];

/** 锦鲤剪影：圆头 + 渐窄身躯 + 飘逸双叶尾。头朝右（游动方向）。 */
function KoiShape({ opacity }: { opacity: number }) {
  return (
    <svg
      width="120"
      height="56"
      viewBox="0 0 120 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      {/* 身躯：从右(头)到左(尾根)渐窄的流线 */}
      <path
        d="M112 28c0-7-9-13-22-15-12-2-26-1-40 2-9 2-17 5-22 8 5 3 13 6 22 8 14 3 28 4 40 2 13-2 22-8 22-15z"
        fill={`rgb(232 128 58 / ${opacity})`}
      />
      {/* 尾鳍：套 .koi-tail 轻摆，以尾根为支点 */}
      <g
        className="ambience-anim koi-tail-el"
        style={{
          transformOrigin: "28px 28px",
          animation: "koi-tail 2.8s ease-in-out infinite",
        }}
      >
        <path
          d="M28 28c-8-9-16-13-24-12 4 5 6 8 7 12-1 4-3 7-7 12 8 1 16-3 24-12z"
          fill={`rgb(232 128 58 / ${opacity * 0.8})`}
        />
      </g>
      {/* 背鳍小三角 */}
      <path
        d="M70 14c4-4 8-6 12-5-2 3-3 6-3 9z"
        fill={`rgb(232 128 58 / ${opacity * 0.7})`}
      />
    </svg>
  );
}

export default function WaterAmbience() {
  // 随机锦鲤只在挂载后生成一次：每次进页面都不同，又不触发 SSR 水合不一致。
  // 初始空数组 → 服务端/首帧不渲染鱼，挂载后填入随机的 4~5 条。
  const [koi, setKoi] = useState<Koi[]>([]);
  useEffect(() => {
    setKoi(makeKoi(Math.random() < 0.5 ? 4 : 5));
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {/* ① 阳光光柱：两道斜射光束 */}
      <div
        className="ambience-anim absolute left-[38%] top-[-10%] h-[80%] w-28 rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent 75%)",
          filter: "blur(14px)",
          animation: "light-shaft 13s ease-in-out infinite",
        }}
      />
      <div
        className="ambience-anim absolute left-[64%] top-[-10%] h-[70%] w-20 rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent 70%)",
          filter: "blur(16px)",
          animation: "light-shaft 17s ease-in-out infinite 2s",
        }}
      />

      {/* ② 锦鲤：每条一个横游容器。负延迟(phase)让它立刻在游；
          reverse 的鱼水平翻转剪影 + 动画反向，做出对游的自然感。 */}
      {koi.map((k, i) => (
        <div
          key={i}
          className="ambience-anim absolute left-0"
          style={{
            top: `${k.top}%`,
            animation: `koi-swim ${k.dur}s linear infinite -${k.phase}s`,
            animationDirection: k.reverse ? "reverse" : "normal",
            willChange: "transform",
          }}
        >
          <div
            style={{
              filter: `blur(${k.blur}px)`,
              transform: `scale(${k.scale}) scaleX(${k.reverse ? -1 : 1})`,
            }}
          >
            <KoiShape opacity={k.opacity} />
          </div>
        </div>
      ))}

      {/* ③ 上升气泡 */}
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="ambience-anim absolute rounded-full"
          style={{
            left: `${b.left}%`,
            bottom: "-2%",
            width: b.size,
            height: b.size,
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(200,224,214,0.35) 60%, transparent 75%)",
            border: "1px solid rgba(255,255,255,0.45)",
            animation: `bubble-rise ${b.dur}s ease-in infinite ${b.delay}s`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
