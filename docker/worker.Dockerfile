# syntax=docker/dockerfile:1.7
# Production image for @repo/worker — turbo prune + tsdown bundle + sharp.
# Shape: docs/architecture/11-infrastructure-and-deployment.md

ARG NODE_IMAGE=node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3
ARG ALPINE_IMAGE=alpine:3.24.1

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.10.7 prune @repo/worker --docker

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/scripts/install-hooks.ts ./scripts/install-hooks.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM deps AS builder
COPY --from=pruner /app/out/full/ .
ENV SKIP_ENV_VALIDATION=1
# Package script directly (not `turbo run`) so Dockerfile ENV is not filtered.
# Strip sourcemaps from the runtime layer — CI uploads them to Sentry from the host build.
RUN pnpm --filter @repo/worker build \
  && find apps/worker/dist -type f -name '*.map' -delete

FROM ${NODE_IMAGE} AS sharp
WORKDIR /sharp
RUN npm install --omit=dev --no-audit --no-fund sharp@0.35.3 \
  && rm -rf package.json package-lock.json /root/.npm /tmp/*

FROM ${ALPINE_IMAGE} AS runner
RUN apk add --no-cache libstdc++ libgcc ca-certificates \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
COPY --from=base /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=app:nodejs /app/apps/worker/dist ./dist
COPY --from=sharp --chown=app:nodejs /sharp/node_modules ./node_modules
USER app
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_PORT||3002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-worker" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "dist/index.mjs"]
