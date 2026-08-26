# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32
# Production image for @repo/api — turbo prune + tsdown bundle.
# Also the migrate job: `node dist/migrate.mjs` (SQL at /app/migrations).
# Shape: docs/architecture/11-infrastructure-and-deployment.md

ARG NODE_IMAGE=node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43
ARG ALPINE_IMAGE=alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.10.7 prune @repo/api --docker

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
# Root prepare references this; turbo prune's json output omits scripts/.
COPY --from=pruner /app/scripts/install-hooks.ts ./scripts/install-hooks.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM deps AS builder
COPY --from=pruner /app/out/full/ .
ENV SKIP_ENV_VALIDATION=1
# Package script directly (not `turbo run`) so Dockerfile ENV is not filtered.
# Strip sourcemaps from the runtime layer — CI uploads them to Sentry from the host build.
RUN pnpm --filter @repo/api build \
  && find apps/api/dist -type f -name '*.map' -delete

# Fresh Alpine + only the node binary — avoids shipping yarn/npm from the Node image.
FROM ${ALPINE_IMAGE} AS runner
RUN apk add --no-cache libstdc++ libgcc ca-certificates \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
COPY --from=base /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=app:nodejs /app/apps/api/dist ./dist
# Sibling of dist/ so migrate.mjs resolves ../migrations via import.meta.url.
COPY --from=builder --chown=app:nodejs /app/packages/db/migrations ./migrations
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-api" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "dist/index.mjs"]
