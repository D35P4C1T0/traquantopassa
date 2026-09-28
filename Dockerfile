# syntax=docker/dockerfile:1
# Multi-platform index digests, verified 2026-09-28. Update deliberately with security releases.
FROM ghcr.io/pnpm/pnpm:12.6.0@sha256:a7181e1d2a2e3ac5dad5a776a7e27360b0e24b59db4de8949569197e4d4036d1 AS pnpm
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS base
WORKDIR /app

FROM base AS dependencies
COPY --from=pnpm /usr/local/bin/pnpm /usr/local/bin/pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Skip the project prepare hook until sources are present. Vite 8 needs no dependency install hooks.
RUN --mount=type=cache,id=traquantopassa-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store

FROM dependencies AS build
COPY . .
RUN pnpm exec svelte-kit sync && pnpm build

FROM dependencies AS production-dependencies
RUN pnpm prune --prod --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 SHUTDOWN_TIMEOUT=20
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node docker/entrypoint.mjs docker/healthcheck.mjs ./docker/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "docker/healthcheck.mjs"]
# Direct Node process preserves adapter-node's SIGTERM handling; no package-manager wrapper.
CMD ["node", "docker/entrypoint.mjs"]
