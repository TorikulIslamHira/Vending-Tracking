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

# Copy monorepo manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install all workspace dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Set build-time env
ENV DATABASE_URL="postgresql://vending_user:vending_secure_password_2026@db:5432/vending_db?schema=public"

# Generate Prisma Client
RUN pnpm --filter @vending/database run db:generate

# Build the API TypeScript bundle
RUN pnpm --filter @vending/api run build

# Stage 2: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy installed node_modules and built code from builder
COPY --from=builder /app /app

EXPOSE 3001

CMD ["pnpm", "--filter", "@vending/api", "start"]
