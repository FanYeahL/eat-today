/** @type {import('next').NextConfig} */
const nextConfig = {
  // 容器部署：产出自包含的 .next/standalone（含 server.js 与被 trace 的依赖、
  // 静态 import 的菜谱 JSON），镜像无需整个 node_modules，启动快、体积小。
  output: "standalone",
};

export default nextConfig;
