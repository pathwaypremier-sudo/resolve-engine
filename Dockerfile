# ============================================================
# Resolve Engine - Production Dockerfile
# Multi-stage build for Next.js standalone deployment
# ============================================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules (prisma, better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ============================================================
# Stage 2: Build application
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema for runtime (needed by @prisma/client)
COPY --from=builder /app/prisma ./prisma

# Create storage directory for evidence files
RUN mkdir -p .re_storage && chown nextjs:nodejs .re_storage

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
