# ACE Governance Platform - Production Dockerfile
# Multi-stage build for security and size optimization

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:20-alpine AS builder

# Security: Don't run as root during build
RUN addgroup -g 1001 -S acegroup && \
    adduser -S aceuser -u 1001 -G acegroup

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including dev for build)
# Using npm install instead of npm ci for flexibility (no lockfile required)
RUN npm install --ignore-scripts

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# =============================================================================
# Stage 2: Production Runtime
# =============================================================================
FROM node:20-alpine AS runtime

# Security hardening
RUN addgroup -g 1001 -S acegroup && \
    adduser -S aceuser -u 1001 -G acegroup

# Security: Remove unnecessary packages
RUN apk --no-cache add dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Create directories with proper permissions
RUN mkdir -p /app/audit_logs /app/data && \
    chown -R aceuser:acegroup /app

# Copy built application from builder
COPY --from=builder --chown=aceuser:acegroup /app/dist ./dist
COPY --from=builder --chown=aceuser:acegroup /app/node_modules ./node_modules
COPY --from=builder --chown=aceuser:acegroup /app/package.json ./

# Security: Set proper permissions
RUN chmod -R 750 /app && \
    chmod -R 700 /app/audit_logs

# Environment defaults (override in production)
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_LEVEL=INFO \
    AUDIT_STORE_PATH=/app/audit_logs \
    COMPLIANCE_LEVEL=production

# Security: Run as non-root user
USER aceuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
