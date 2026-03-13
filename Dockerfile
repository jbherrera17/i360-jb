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

EXPOSE 3000

CMD ["node", "server/index.js"]
