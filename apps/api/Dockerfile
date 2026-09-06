# ==============================================================================
# Fastify Backend API Dockerfile (Monorepo Multi-Stage Build)
# ==============================================================================

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate

# Stage 1: Dependencies & Build
FROM base AS builder
WORKDIR /app

# Copy only manifests first, so `pnpm install` is its own cached layer and only
# re-runs when a dependency actually changes — not on every source edit.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/database/package.json ./packages/database/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Now copy the actual source and build. Only this layer (and below) is busted
# by a source change; the dependency-install layer above stays cached.
COPY packages/database ./packages/database
COPY packages/shared-types ./packages/shared-types
COPY packages/validation ./packages/validation
COPY apps/api ./apps/api

# No DATABASE_URL needed at build time: this stage only runs `tsc`, which
# type-checks and emits JS but never executes it. The real connection string
# is supplied at container runtime via docker-compose's `environment:` block.

# Build workspace packages and API TypeScript bundle
RUN pnpm --filter @vending/shared-types run build && \
    pnpm --filter @vending/validation run build && \
    pnpm --filter @vending/database run build && \
    pnpm --filter @vending/api run build

# Drop devDependencies (typescript, ts-node, nodemon, drizzle-kit, tsx, ...) —
# only the resolved production dependency graph is needed from here on.
# CI=true skips pnpm's interactive confirmation prompt (no TTY in a RUN step).
RUN CI=true pnpm prune --prod

# Stage 2: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy the pruned install + built code, owned by the non-root `node` user
# that ships in the base image (uid/gid 1000), and run as that user.
COPY --from=builder --chown=node:node /app /app
USER node
WORKDIR /app/apps/api

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

# Invoke the compiled entrypoint directly instead of `pnpm run start`: pnpm's
# startup dependency-status check tries to run a real `pnpm install` against
# the registry on every container start, which is both wrong (a production
# container shouldn't need network access to npm just to boot) and breaks
# under the non-root user's restricted permissions.
CMD ["node", "dist/server.js"]
