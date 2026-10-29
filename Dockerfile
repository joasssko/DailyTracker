# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
# Herramientas por si better-sqlite3 necesita compilar en musl
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/dailytracker.db \
    STATIC_DIR=/app/web \
    MIGRATIONS_DIR=/app/api/drizzle
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./api/dist
COPY --from=build /app/apps/api/drizzle ./api/drizzle
COPY --from=build /app/apps/web/dist ./web

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "api/dist/index.js"]
