# ============================================================
#  Frontend Dockerfile — El Fogón Criollo
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget curl

FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── Desarrollo (Vite dev server con HMR) ─────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Producción (serve estático) ───────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
