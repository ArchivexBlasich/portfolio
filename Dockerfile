# syntax=docker/dockerfile:1.7
# Build stages use bun (the project's package manager). node:lts-alpine does NOT
# ship bun, so the old base image could never have built successfully.
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Rootless Alpine image (~16MB) with built-in gzip/brotli and cache-control.
# Replaces nginx + nginx.conf: Dokploy's edge proxy already handles TLS/edge concerns,
# so we only need a tiny static file server inside the container.
FROM joseluisq/static-web-server:2-alpine AS runner

COPY --from=build /app/dist /public
# Advanced config: 301 redirects for legacy /en/* URLs (SEO migration).
# General server options stay driven by the ENV vars below — the TOML only
# declares the [advanced.redirects] section, so precedence is not an issue.
COPY sws.toml /public/sws.toml

ENV SERVER_ROOT=/public \
    SERVER_PORT=80 \
    SERVER_CONFIG_FILE=/public/sws.toml \
    SERVER_COMPRESSION=true \
    SERVER_CACHE_CONTROL_HEADERS=true \
    SERVER_DIRECTORY_LISTING=false \
    SERVER_LOG_LEVEL=warn

# /public/404.html is produced by src/pages/404.astro and picked up by
# SERVER_ERROR_PAGE_404 default (./404.html relative to SERVER_ROOT).
EXPOSE 80