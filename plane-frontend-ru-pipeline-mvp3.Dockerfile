# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

FROM base AS builder
WORKDIR /app

ARG TURBO_VERSION=2.9.4
RUN npm install -g pnpm@10.32.1 turbo@${TURBO_VERSION}
COPY . .

RUN turbo prune --scope=web --docker

FROM base AS installer
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN npm install -g pnpm@10.32.1

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --store-dir=/pnpm/store
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store CI=true pnpm install --offline --frozen-lockfile --store-dir=/pnpm/store

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_ADMIN_BASE_URL=""
ENV VITE_ADMIN_BASE_URL=$VITE_ADMIN_BASE_URL

ARG VITE_ADMIN_BASE_PATH="/god-mode"
ENV VITE_ADMIN_BASE_PATH=$VITE_ADMIN_BASE_PATH

ARG VITE_LIVE_BASE_URL=""
ENV VITE_LIVE_BASE_URL=$VITE_LIVE_BASE_URL

ARG VITE_LIVE_BASE_PATH="/live"
ENV VITE_LIVE_BASE_PATH=$VITE_LIVE_BASE_PATH

ARG VITE_SPACE_BASE_URL=""
ENV VITE_SPACE_BASE_URL=$VITE_SPACE_BASE_URL

ARG VITE_SPACE_BASE_PATH="/spaces"
ENV VITE_SPACE_BASE_PATH=$VITE_SPACE_BASE_PATH

ARG VITE_WEB_BASE_URL=""
ENV VITE_WEB_BASE_URL=$VITE_WEB_BASE_URL

ARG VITE_DEFAULT_LANGUAGE="ru"
ENV VITE_DEFAULT_LANGUAGE=$VITE_DEFAULT_LANGUAGE

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1

RUN pnpm turbo run build --filter=web

FROM nginx:1.27-alpine AS production

COPY apps/web/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=installer /app/apps/web/build/client /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
