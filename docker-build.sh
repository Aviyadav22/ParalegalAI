#!/bin/bash

# Docker build script for ParalegalAI
# This script builds and optionally runs the Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="paralegal-ai"
CONTAINER_NAME="paralegal-ai"
RUN_AFTER_BUILD=false
CLEAN_BUILD=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -r, --run          Run container after building"
    echo "  -c, --clean        Clean build (no cache)"
    echo "  -n, --name NAME    Set container name (default: paralegal-ai)"
    echo "  -i, --image NAME   Set image name (default: paralegal-ai)"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Build image only"
    echo "  $0 --run           # Build and run container"
    echo "  $0 --clean --run   # Clean build and run"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--run)
            RUN_AFTER_BUILD=true
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -n|--name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

print_status "Starting Docker build for ParalegalAI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "Stopping and removing existing container: ${CONTAINER_NAME}"
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
fi

# Remove existing image if clean build
if [ "$CLEAN_BUILD" = true ]; then
    print_warning "Removing existing image: ${IMAGE_NAME}"
    docker rmi ${IMAGE_NAME} > /dev/null 2>&1 || true
fi

# Build the Docker image
print_status "Building Docker image: ${IMAGE_NAME}"
if [ "$CLEAN_BUILD" = true ]; then
    docker build --no-cache -t ${IMAGE_NAME} .
else
    docker build -t ${IMAGE_NAME} .
fi

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully: ${IMAGE_NAME}"
else
    print_error "Docker build failed"
    exit 1
fi

# Run container if requested
if [ "$RUN_AFTER_BUILD" = true ]; then
    print_status "Starting container: ${CONTAINER_NAME}"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.docker" ]; then
            cp .env.docker .env
            print_warning "Please edit .env file with your configuration before running the container."
        else
            print_error ".env.docker template not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Create volume if it doesn't exist
    if ! docker volume ls --format "table {{.Name}}" | grep -q "^paralegal_data$"; then
        print_status "Creating Docker volume: paralegal_data"
        docker volume create paralegal_data
    fi
    
    # Run the container
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p 3001:3001 \
        -p 8888:8888 \
        --env-file .env \
        -v paralegal_data:/app/server/storage \
        --restart unless-stopped \
        ${IMAGE_NAME}
    
    if [ $? -eq 0 ]; then
        print_status "Container started successfully!"
        print_status "Application is available at: http://localhost:3001"
        print_status "Collector service is available at: http://localhost:8888"
        print_status ""
        print_status "To view logs: docker logs ${CONTAINER_NAME}"
        print_status "To stop: docker stop ${CONTAINER_NAME}"
    else
        print_error "Failed to start container"
        exit 1
    fi
else
    print_status "Build completed. To run the container:"
    print_status "  docker run -d --name ${CONTAINER_NAME} -p 3001:3001 -p 8888:8888 --env-file .env -v paralegal_data:/app/server/storage ${IMAGE_NAME}"
fi

