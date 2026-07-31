# syntax=docker/dockerfile:1.7
# Production image for @repo/web — turbo prune + Next standalone output.
# Shape: docs/architecture/11-infrastructure-and-deployment.md

ARG NODE_IMAGE=node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /app

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@2.10.7 prune @repo/web --docker

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/scripts/install-hooks.ts ./scripts/install-hooks.ts
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM deps AS builder
COPY --from=pruner /app/out/full/ .
# Public vars are baked at build time — keep the set small and environment-neutral
# so one image promotes staging → production (09 §5).
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV} \
    SKIP_ENV_VALIDATION=1 \
    NODE_ENV=production
# Call the package script directly — Turbo's strict env mode would strip
# SKIP_ENV_VALIDATION before next build. Prune still uses turbo above.
RUN pnpm --filter @repo/web build

FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache libc6-compat \
  && addgroup -S nodejs \
  && adduser -S app -G nodejs
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_SHARP_PATH=/app/node_modules/sharp
# Next standalone traces the monorepo layout under apps/web.
COPY --from=builder --chown=app:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# File tracing often drops sharp's Alpine libvips `.so` from the pnpm store
# layout. Install a complete platform binary, then patch the traced paths Next
# still resolves for `@repo/storage` / image optimization.
RUN npm install --omit=dev --no-audit --no-fund sharp@0.35.3 \
  && LIBVIPS_SO="$(find /app/node_modules/@img -name 'libvips-cpp.so*' | head -1)" \
  && test -n "$LIBVIPS_SO" \
  && LIBVIPS_DIR="$(dirname "$LIBVIPS_SO")" \
  && for dest in /app/node_modules/.pnpm/@img+sharp-libvips-linuxmusl-*/node_modules/@img/sharp-libvips-linuxmusl-*/lib; do \
       if [ -d "$dest" ]; then cp -a "$LIBVIPS_DIR"/. "$dest"/; fi; \
     done \
  && rm -rf package.json package-lock.json /root/.npm /tmp/* \
  && rm -rf \
    /opt/yarn-* \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
  && chown -R app:nodejs /app/node_modules
USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
LABEL org.opencontainers.image.title="repo-web" \
      org.opencontainers.image.source="https://github.com/jleveneur/nextjs-boilerplate"
CMD ["node", "apps/web/server.js"]
