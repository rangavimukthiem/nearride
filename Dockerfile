# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app

# Install native compilation dependencies for bcrypt and sharp
RUN apk add --no-cache libc6-compat python3 make g++ git

# Multi-engine fallback dependency installation
COPY package*.json pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f "pnpm-lock.yaml" ]; then corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f "yarn.lock" ]; then yarn install --frozen-lockfile; \
    elif [ -f "package-lock.json" ]; then npm ci --legacy-peer-deps || npm install --legacy-peer-deps; \
    else npm install --legacy-peer-deps; fi

# Copy application source
COPY . .

# Run build if defined in package.json
RUN if grep -q '"build":' package.json; then npm run build; fi

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies and curl for health check
RUN apk add --no-cache libc6-compat curl

# Copy application from builder stage
COPY --from=builder /app ./

# Ensure upload directories exist and are writable
RUN mkdir -p public/uploads/avatars public/uploads/listings

EXPOSE 3000

# Health check against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health || exit 1

CMD ["npm", "start"]
