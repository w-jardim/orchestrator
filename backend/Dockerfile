# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy workspace manifests first for layer caching
COPY package.json ./
COPY core/package.json ./core/
COPY integrations/package.json ./integrations/
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source code
COPY core/ ./core/
COPY integrations/ ./integrations/
COPY backend/ ./backend/

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed node_modules and source
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/core ./node_modules/@plagard/core
COPY --from=builder /build/integrations ./node_modules/@plagard/integrations
COPY --from=builder /build/backend/src ./src
COPY --from=builder /build/backend/package.json ./package.json

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/saude || exit 1

CMD ["node", "src/server.js"]
