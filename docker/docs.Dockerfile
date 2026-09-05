# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32
# Production image for @repo/docs — turbo prune + Next standalone output.
# Shape: docs/architecture/11-infrastructure-and-deployment.md
#
# turbo prune omits `docs/` and `apps/api/openapi.json` (not in the package
# graph). The builder stage copies them in so prepare-content can sync MDX
# and Scalar can serve the OpenAPI snapshot.

ARG NODE_IMAGE=node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43
ARG ALPINE_IMAGE=alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

FROM ${NODE_IMAGE} AS base
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack prepare --activate

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.10.7 prune @repo/docs --docker

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/scripts/install-hooks.ts ./scripts/install-hooks.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM deps AS builder
COPY --from=pruner /app/out/full/ .
# Content sources outside the prune graph (see prepare-content.ts).
COPY --from=pruner /app/docs ./docs
RUN mkdir -p apps/api
COPY --from=pruner /app/apps/api/openapi.json ./apps/api/openapi.json
ARG NEXT_PUBLIC_APP_URL=http://localhost:3003
ARG NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV} \
    SKIP_ENV_VALIDATION=1 \
    NODE_ENV=production
# Call the package script directly — Turbo's strict env mode would strip
# SKIP_ENV_VALIDATION before next build. Prune still uses turbo above.
RUN pnpm --filter @repo/docs build

FROM ${ALPINE_IMAGE} AS runner
# alpine:3.24.1 still ships OpenSSL 3.5.7; 3.5.8-r0 fixes CVE-2026-14456.
RUN apk add --no-cache libstdc++ libgcc ca-certificates \
    libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
COPY --from=base /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3003 \
    HOSTNAME=0.0.0.0
# Next 16 ships `sharp` as an optional dependency and traces it into standalone.
COPY --from=builder --chown=app:nodejs /app/apps/docs/.next/standalone ./
COPY --from=builder --chown=app:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder --chown=app:nodejs /app/apps/docs/public ./apps/docs/public

USER app
EXPOSE 3003
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3003)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-docs" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "apps/docs/server.js"]
