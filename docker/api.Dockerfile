# syntax=docker/dockerfile:1.7
# Production image for @repo/api — turbo prune + tsdown bundle.
# Shape: docs/architecture/11-infrastructure-and-deployment.md

ARG NODE_IMAGE=node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3

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
RUN pnpm turbo run build --filter=@repo/api

FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache libc6-compat \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=app:nodejs /app/apps/api/dist ./dist
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-api" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "dist/index.mjs"]
