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

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install all workspace dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Set build-time env
ENV NEXT_PUBLIC_API_URL=/api/v1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Build Next.js Web application
RUN pnpm --filter @vending/web run build

# Stage 2: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy workspace build artifacts
COPY --from=builder /app /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@vending/web", "start"]
