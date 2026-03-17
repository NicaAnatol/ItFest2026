# ============================================================================
# MedGraph AI — Production Dockerfile (multi-stage)
# Target: AWS ECS (Fargate or EC2)
# ============================================================================
# Stage 1: install deps
# Stage 2: build Next.js (standalone output)
# Stage 3: minimal production image
# ============================================================================

# ── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma needs OpenSSL
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# ci = clean install (respects lockfile exactly)
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma@6 generate

# Next.js collects anonymous telemetry — disable in CI
ENV NEXT_TELEMETRY_DISABLED=1

# Build the standalone Next.js app
# Env vars are NOT baked in — they are read at runtime from the container env.
# Only NEXT_PUBLIC_* vars are inlined at build time.
RUN npm run build

# ── Stage 3: Production Runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime dependencies (openssl for Prisma, curl for health checks)
RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy the standalone server
COPY --from=builder /app/.next/standalone ./

# Copy static assets & public data (not included in standalone by default)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public        ./public

# Copy Prisma engine binaries (needed at runtime by the binary engine)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma               ./prisma

# Ensure nextjs user owns the workdir
RUN chown -R nextjs:nodejs /app

USER nextjs

# Next.js standalone listens on port 3000 by default
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check for ECS task health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

