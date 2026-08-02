# syntax=docker/dockerfile:1.7
# One-shot migration image — applies Drizzle SQL from packages/db/migrations.
# Never runs on application boot; CD and `compose.prod` call this explicitly.
# Shape: docs/architecture/11-infrastructure-and-deployment.md

ARG NODE_IMAGE=node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.10.7 prune @repo/db --docker

FROM base AS runner
RUN apk add --no-cache libc6-compat \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
COPY --from=pruner /app/out/json/ .
# Root prepare references this; turbo prune's json output omits scripts/.
COPY --from=pruner /app/scripts/install-hooks.ts ./scripts/install-hooks.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile
COPY --from=pruner --chown=app:nodejs /app/out/full/ .
USER app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="repo-migrate" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
# Exits 0 on success so Compose `service_completed_successfully` can gate apps.
CMD ["pnpm", "--filter", "@repo/db", "exec", "tsx", "src/migrate.ts"]
