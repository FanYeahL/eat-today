# eat-today —— CloudBase 云托管用 Dockerfile
# 多阶段构建：deps 装依赖 → builder 跑 next build 出 standalone → runner 最小运行时镜像。
# 依赖 next.config.mjs 里的 output: "standalone"。

# 1) 依赖层：只装生产+构建所需依赖，利用层缓存
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2) 构建层：跑 next build，产出 .next/standalone（自包含 server.js）
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) 运行层：仅拷贝运行所需，镜像精简
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 云托管把外部流量转发到容器的这个端口；Next standalone 的 server.js 读 PORT/HOSTNAME。
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 运行
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 产物：server.js + 被 trace 的最小 node_modules（含静态 import 的菜谱 JSON）
COPY --from=builder /app/.next/standalone ./
# 静态资源与 public 不在 standalone 里，需单独拷贝
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
