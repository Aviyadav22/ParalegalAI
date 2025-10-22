FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Create storage directory
RUN mkdir -p /app/storage

# Expose port
EXPOSE 3001

# Run migrations and start server
CMD npx prisma migrate deploy && node index.js
