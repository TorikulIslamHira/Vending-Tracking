# ==============================================================================
# Next.js Web Frontend Dockerfile (Monorepo Multi-Stage Build)
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
# Note: packages/database is intentionally never copied into this image —
# the web app depends only on @vending/shared-types and @vending/validation.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Now copy the actual source and build. Only this layer (and below) is busted
# by a source change; the dependency-install layer above stays cached.
COPY packages/shared-types ./packages/shared-types
COPY packages/validation ./packages/validation
COPY apps/web ./apps/web

# Set build-time env. NEXT_PUBLIC_* vars are inlined into the client bundle
# by `next build` — they can't be supplied at container runtime like a
# normal env var, so this one is threaded through as a build ARG instead
# (see docker-compose.yml's `build.args` for the web service).
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_API_URL=/api/v1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Build workspace packages and Next.js Web application
RUN pnpm --filter @vending/shared-types run build && \
    pnpm --filter @vending/validation run build && \
    pnpm --filter @vending/web run build

# Drop devDependencies (typescript, tailwind, autoprefixer, postcss, ...) —
# only the resolved production dependency graph is needed from here on.
# CI=true skips pnpm's interactive confirmation prompt (no TTY in a RUN step).
RUN CI=true pnpm prune --prod

# Stage 2: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy the pruned install + built code, owned by the non-root `node` user
# that ships in the base image (uid/gid 1000), and run as that user.
COPY --from=builder --chown=node:node /app /app
USER node
WORKDIR /app/apps/web

EXPOSE 3000

# Invoke the local Next.js binary directly instead of `pnpm run start`: pnpm's
# startup dependency-status check tries to run a real `pnpm install` against
# the registry on every container start, which is both wrong (a production
# container shouldn't need network access to npm just to boot) and breaks
# under the non-root user's restricted permissions.
CMD ["node_modules/.bin/next", "start", "--port", "3000"]
