FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY server/ ./server/
COPY public/ ./public/
COPY documentation/guides/ ./documentation/guides/

# Create logs directory
RUN mkdir -p logs

EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/health/live || exit 1

CMD ["node", "server/index.js"]
