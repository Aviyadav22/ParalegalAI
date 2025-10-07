#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          ParalegalAI Quick Start Setup                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "❗ IMPORTANT: Edit .env file with your credentials:"
    echo "   1. AZURE_STORAGE_CONNECTION_STRING"
    echo "   2. GEMINI_API_KEY"
    echo "   3. JWT_SECRET, SIG_KEY, SIG_SALT"
    echo ""
    echo "Run this script again after editing .env"
    exit 1
fi

# Check required variables
source .env
if [ -z "$AZURE_STORAGE_CONNECTION_STRING" ] || [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Missing required environment variables in .env"
    echo "   Please set AZURE_STORAGE_CONNECTION_STRING and GEMINI_API_KEY"
    exit 1
fi

echo "✅ Environment configuration found"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Start services
echo "🚀 Starting ParalegalAI services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check services
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Qdrant:    http://localhost:6333/dashboard"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:3000"
echo "   2. Create your admin account"
echo "   3. Create a workspace"
echo "   4. Upload your first PDF"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop all:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
