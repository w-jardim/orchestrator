# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json ./
COPY core/package.json ./core/
COPY worker/package.json ./worker/

RUN npm install --workspaces --include-workspace-root

COPY core/ ./core/
COPY worker/ ./worker/

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/core ./node_modules/@plagard/core
COPY --from=builder /build/worker/src ./src
COPY --from=builder /build/worker/package.json ./package.json

RUN chown -R appuser:appgroup /app

USER appuser

CMD ["node", "src/index.js"]
