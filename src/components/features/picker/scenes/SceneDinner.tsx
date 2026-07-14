/**
 * SceneDinner / 都市夜 + 流星
 * ─────────────────────────────────────────────
 * 构图签名：**双层天际线 + 丰富屋顶轮廓线**（五幕里唯一满宽密集轮廓的一幕）。
 * 远层低对比楼群（密、无窗、矮）退到后面，近层楼群近实、高、屋顶有词汇量（女儿墙/斜坡顶/
 * 天线/水塔/空调箱/阶梯退台），禁止两栋相邻楼同宽同高同顶。窗密度逐栋不同（1/3、1/4、1/2 混排），
 * 留 1–2 栋全暗楼。近层挂 ≤2 块霓虹招牌（青 flicker + 粉非对称闪），全五幕唯一冷色点缀。
 * 星（三档 twinkle）+ 流星 ×2（斜下坠）+ 地平线橙暖 glow + 小月牙。「城市是活的」靠亮窗 flicker。
 */

import { Stars, Meteor, SilhouetteBand } from "./scene-parts";

/** 远层天际线：低对比、密集、矮、无窗——只作退远的剪影底。 */
function SkylineFar() {
  // 密排、宽度参差的矮楼，平顶为主（远处细节读不出）。
  const far = [
    { x: 0, w: 30, h: 40 },
    { x: 32, w: 22, h: 56 },
    { x: 56, w: 34, h: 34 },
    { x: 92, w: 26, h: 62 },
    { x: 120, w: 30, h: 46 },
    { x: 152, w: 20, h: 58 },
    { x: 174, w: 38, h: 38 },
    { x: 214, w: 24, h: 66 },
    { x: 240, w: 32, h: 44 },
    { x: 274, w: 22, h: 60 },
    { x: 298, w: 36, h: 36 },
    { x: 336, w: 28, h: 54 },
    { x: 366, w: 34, h: 42 },
  ];
  return (
    <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="h-[70px] w-full">
      {far.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={70 - b.h}
          width={b.w}
          height={b.h}
          fill="rgb(var(--sil) / 0.45)"
        />
      ))}
    </svg>
  );
}

/**
 * 近层天际线：近实楼群 + 屋顶词汇量 + 窗网格（密度逐栋不同）+ ≤2 块霓虹招牌。
 * 每栋从 roof 词汇里选一种收顶，宽度/高度非均匀且相邻不重样。
 */
function SkylineNear() {
  // roof: 收顶造型词汇。winEvery: 每 N 个格点亮一扇（大=稀，0=全暗楼）。
  const buildings: {
    x: number;
    w: number;
    h: number;
    roof: "flat" | "parapet" | "slope" | "antenna" | "tank" | "acbox" | "setback";
    winEvery: number;
  }[] = [
    { x: 6, w: 30, h: 84, roof: "parapet", winEvery: 3 },
    { x: 40, w: 24, h: 112, roof: "antenna", winEvery: 4 },
    { x: 68, w: 44, h: 66, roof: "acbox", winEvery: 2 },
    { x: 116, w: 22, h: 98, roof: "slope", winEvery: 0 }, // 全暗楼
    { x: 142, w: 38, h: 122, roof: "setback", winEvery: 3 }, // 塔楼阶梯退台
    { x: 184, w: 28, h: 76, roof: "tank", winEvery: 4 },
    { x: 216, w: 46, h: 92, roof: "flat", winEvery: 2 },
    { x: 266, w: 24, h: 116, roof: "antenna", winEvery: 3 },
    { x: 294, w: 40, h: 70, roof: "parapet", winEvery: 0 }, // 全暗楼
    { x: 338, w: 30, h: 104, roof: "slope", winEvery: 4 },
    { x: 372, w: 28, h: 82, roof: "acbox", winEvery: 3 },
  ];
  const H = 130;
  let winKey = 0;

  return (
    <svg viewBox={`0 0 400 ${H}`} preserveAspectRatio="none" className="h-[110px] w-full">
      {buildings.map((b, bi) => {
        const topY = H - b.h;
        const parts: JSX.Element[] = [];
        // 楼身
        parts.push(
          <rect key="body" x={b.x} y={topY} width={b.w} height={b.h} fill="rgb(var(--sil))" />,
        );
        // 收顶词汇
        if (b.roof === "parapet") {
          // 女儿墙：顶上一圈略高的边框凸起（两小块）
          parts.push(
            <rect key="p1" x={b.x} y={topY - 4} width={5} height={4} fill="rgb(var(--sil))" />,
            <rect key="p2" x={b.x + b.w - 5} y={topY - 4} width={5} height={4} fill="rgb(var(--sil))" />,
          );
        } else if (b.roof === "slope") {
          // 斜坡顶：一个三角盖
          parts.push(
            <path
              key="s"
              d={`M${b.x} ${topY} L${b.x + b.w / 2} ${topY - 12} L${b.x + b.w} ${topY} Z`}
              fill="rgb(var(--sil))"
            />,
          );
        } else if (b.roof === "antenna") {
          // 天线杆：1–2 根细高杆
          parts.push(
            <rect key="a1" x={b.x + b.w / 2 - 1.5} y={topY - 22} width={3} height={22} fill="rgb(var(--sil))" />,
            <rect key="a2" x={b.x + b.w / 2 + 5} y={topY - 14} width={2} height={14} fill="rgb(var(--sil))" />,
          );
        } else if (b.roof === "tank") {
          // 水塔：小圆桶 + 支架
          parts.push(
            <rect key="leg1" x={b.x + 6} y={topY - 10} width={2} height={10} fill="rgb(var(--sil))" />,
            <rect key="leg2" x={b.x + 14} y={topY - 10} width={2} height={10} fill="rgb(var(--sil))" />,
            <rect key="drum" x={b.x + 3} y={topY - 18} width={16} height={9} rx={3} fill="rgb(var(--sil))" />,
          );
        } else if (b.roof === "acbox") {
          // 空调箱：屋顶一两个小矩形
          parts.push(
            <rect key="ac1" x={b.x + 6} y={topY - 6} width={10} height={6} fill="rgb(var(--sil))" />,
            <rect key="ac2" x={b.x + b.w - 14} y={topY - 5} width={8} height={5} fill="rgb(var(--sil))" />,
          );
        } else if (b.roof === "setback") {
          // 阶梯式退台：顶部两级收窄
          parts.push(
            <rect key="sb1" x={b.x + 6} y={topY - 12} width={b.w - 12} height={12} fill="rgb(var(--sil))" />,
            <rect key="sb2" x={b.x + 12} y={topY - 22} width={b.w - 24} height={10} fill="rgb(var(--sil))" />,
          );
        }
        // 窗网格（密度逐栋不同；winEvery=0 全暗）
        if (b.winEvery > 0) {
          const cols = Math.max(1, Math.floor(b.w / 11));
          const rows = Math.floor(b.h / 14);
          for (let ry = 0; ry < rows; ry++) {
            for (let rx = 0; rx < cols; rx++) {
              const k = winKey++;
              if (k % b.winEvery !== 0) continue;
              const flick = k % 9 === 0;
              parts.push(
                <rect
                  key={`w-${ry}-${rx}`}
                  x={b.x + 4 + rx * 11}
                  y={topY + 8 + ry * 14}
                  width={3}
                  height={4}
                  fill="#FFD9A0"
                  className={flick ? "picker-scene-flicker" : undefined}
                  style={flick ? { animationDelay: `${(k % 6) * 1.3}s` } : undefined}
                  opacity={flick ? undefined : 0.85}
                />,
              );
            }
          }
        }
        return <g key={bi}>{parts}</g>;
      })}

      {/* 霓虹招牌 ×2（近层唯一冷色点缀，克制在 2 块内）：青块对称 flicker、粉块非对称闪 */}
      {/* 青招牌：挂在第 3 栋（acbox）楼身 */}
      <rect
        x={80}
        y={H - 40}
        width={6}
        height={10}
        rx={1}
        fill="#4DD9E8"
        className="picker-scene-flicker"
        style={{ animationDelay: "1.2s" }}
      />
      {/* 粉招牌：挂在第 7 栋（flat）楼身，非对称「闪两下灭一下」 */}
      <rect
        x={230}
        y={H - 58}
        width={6}
        height={10}
        rx={1}
        fill="#FF6E9C"
        className="picker-scene-neon-pink"
      />
    </svg>
  );
}

export default function SceneDinner() {
  return (
    <div className="absolute inset-0">
      {/* 星野：三档 twinkle 错峰 */}
      <Stars
        points={[
          { x: 10, y: 8, r: 0.6, speed: "a" },
          { x: 24, y: 16, r: 0.5, speed: "b" },
          { x: 33, y: 6, r: 0.7, speed: "c" },
          { x: 44, y: 20, r: 0.5, speed: "a" },
          { x: 56, y: 10, r: 0.6, speed: "b" },
          { x: 63, y: 22, r: 0.5, speed: "c" },
          { x: 72, y: 8, r: 0.7, speed: "a" },
          { x: 82, y: 18, r: 0.5, speed: "b" },
          { x: 90, y: 12, r: 0.6, speed: "c" },
          { x: 16, y: 26, r: 0.5, speed: "b" },
          { x: 50, y: 30, r: 0.5, speed: "c" },
          { x: 78, y: 28, r: 0.5, speed: "a" },
        ]}
      />

      {/* 小月牙：下移左移到 right 34% / top 12vh，避开右上角 chip 堆 + 「点我会怎样」switch
          （原 right14%/top6vh 撞进两者底下）。与满月同区，五幕月相位置一致。 */}
      <div
        className="absolute"
        style={{
          right: "34%",
          top: "12vh",
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "#F2EBDD",
          opacity: 0.85,
          boxShadow: "8px 3px 0 -3px rgb(var(--sky-0)) inset",
        }}
      />

      {/* 流星 ×2：低频、快速划过（≤1s）、斜下坠、方向不同。
          35° 从左上向右下、145° 从右上向左下；两颗错峰（delay 0 / 6s）。 */}
      <Meteor style={{ left: "10%", top: "6vh" }} duration={11} delay={0} angle={35} />
      <Meteor style={{ left: "85%", top: "8vh" }} duration={11} delay={6} angle={145} />

      {/* 地平线橙暖 glow（天际线后，与 skyline 带对齐在 ~46vh） */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "42vh",
          height: 140,
          background:
            "linear-gradient(to top, rgb(var(--glow) / 0.28), transparent 92%)",
        }}
      />

      {/* 双层天际线：远层退远（低对比、密、矮，topVh 44）+ 近层近实（词汇量 + 窗 + 霓虹，topVh 46）。
          两层之间的高差 + 对比差 = 灰度下也能读出的「双层天际线」构图签名。 */}
      <SilhouetteBand topVh={44}>
        <SkylineFar />
      </SilhouetteBand>
      <SilhouetteBand topVh={46}>
        <SkylineNear />
      </SilhouetteBand>
    </div>
  );
}
