# syntax=docker/dockerfile:1.7
# Production image for @repo/docs — turbo prune + Next standalone output.
# Shape: docs/architecture/11-infrastructure-and-deployment.md
#
# turbo prune omits `docs/` and `apps/api/openapi.json` (not in the package
# graph). The builder stage copies them in so prepare-content can sync MDX
# and Scalar can serve the OpenAPI snapshot.

ARG NODE_IMAGE=node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3
ARG ALPINE_IMAGE=alpine:3.24.1

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

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
ENV NODE_ENV=production \
    PORT=3003 \
    HOSTNAME=0.0.0.0 \
    NEXT_SHARP_PATH=/app/node_modules/sharp
COPY --from=builder --chown=app:nodejs /app/apps/docs/.next/standalone ./
COPY --from=builder --chown=app:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder --chown=app:nodejs /app/apps/docs/public ./apps/docs/public
COPY --from=sharp --chown=app:nodejs /sharp/node_modules/sharp ./node_modules/sharp
COPY --from=sharp --chown=app:nodejs /sharp/node_modules/@img ./node_modules/@img
RUN LIBVIPS_SO="$(find /app/node_modules/@img -name 'libvips-cpp.so*' | head -1)" \
  && test -n "$LIBVIPS_SO" \
  && LIBVIPS_DIR="$(dirname "$LIBVIPS_SO")" \
  && for dest in /app/node_modules/.pnpm/@img+sharp-libvips-linuxmusl-*/node_modules/@img/sharp-libvips-linuxmusl-*/lib; do \
       if [ -d "$dest" ]; then cp -a "$LIBVIPS_DIR"/. "$dest"/; fi; \
     done \
  && chown -R app:nodejs /app/node_modules

USER app
EXPOSE 3003
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3003)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-docs" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "apps/docs/server.js"]
