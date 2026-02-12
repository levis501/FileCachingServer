# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package*.json ./

# Create cache directory and set permissions
RUN mkdir -p /app/cache && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 9876

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:9876/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start server
CMD ["node", "src/server.js"]
