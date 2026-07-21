# ============================================================
#  Backend Dockerfile — El Fogón Criollo
#  Multi-stage: development (nodemon) | production (node)
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget curl postgresql17-client

# ── Dependencias ─────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && cp -r node_modules /tmp/prod_modules
RUN npm ci

# ── Desarrollo (hot-reload con nodemon) ──────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npx", "nodemon", "--legacy-watch", "src/server.js"]

# ── Producción ───────────────────────────────────────────
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /tmp/prod_modules ./node_modules
COPY . .
RUN addgroup -S fogon && adduser -S fogon -G fogon
USER fogon
EXPOSE 3000
CMD ["node", "src/server.js"]
