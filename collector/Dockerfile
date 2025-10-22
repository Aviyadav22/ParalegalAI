FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy application code
COPY . .

# Create storage directory
RUN mkdir -p /app/storage

# Expose port
EXPOSE 8888

# Start collector
CMD ["node", "index.js"]
