# Multi-stage Dockerfile for ParalegalAI
# This Dockerfile builds the frontend, then creates a production image with server and collector

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/yarn.lock ./

# Install frontend dependencies
RUN yarn install --frozen-lockfile

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN yarn build

# Stage 2: Production Image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    openssl-dev \
    libc6-compat \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files for all components
COPY package.json ./
COPY server/package.json ./server/
COPY collector/package.json ./collector/

# Install root dependencies
RUN yarn install --production

# Install server dependencies
WORKDIR /app/server
COPY server/yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Install collector dependencies
WORKDIR /app/collector
COPY collector/yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Go back to root
WORKDIR /app

# Copy source code
COPY server/ ./server/
COPY collector/ ./collector/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./server/public

# Create storage directory
RUN mkdir -p /app/server/storage

# Set environment variables
ENV NODE_ENV=production
ENV STORAGE_DIR=/app/server/storage
ENV ANYTHING_LLM_RUNTIME=docker

# Expose ports
EXPOSE 3001 8888

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Set environment variables' >> /app/start.sh && \
    echo 'export NODE_ENV=production' >> /app/start.sh && \
    echo 'export STORAGE_DIR=/app/server/storage' >> /app/start.sh && \
    echo 'export ANYTHING_LLM_RUNTIME=docker' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Generate Prisma client for Alpine Linux' >> /app/start.sh && \
    echo 'cd /app/server' >> /app/start.sh && \
    echo 'npx prisma generate --schema=./prisma/schema.prisma --generator client' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Run database migrations' >> /app/start.sh && \
    echo 'npx prisma migrate deploy --schema=./prisma/schema.prisma' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start collector in background' >> /app/start.sh && \
    echo 'cd /app/collector' >> /app/start.sh && \
    echo 'node index.js &' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start server' >> /app/start.sh && \
    echo 'cd /app/server' >> /app/start.sh && \
    echo 'node index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/ping || exit 1

# Set the startup command
CMD ["/app/start.sh"]

