# ParalegalAI Docker Deployment Guide

This guide covers different deployment options for ParalegalAI using Docker.

## Quick Start

### 1. Basic Docker Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd ParalegalAI

# Create environment file
cp env.docker.example .env
# Edit .env with your configuration

# Build and run
docker-compose up -d
```

### 2. Using Build Scripts

**Linux/macOS:**
```bash
# Build and run
./docker-build.sh --run

# Clean build and run
./docker-build.sh --clean --run
```

**Windows PowerShell:**
```powershell
# Build and run
.\docker-build.ps1 -Run

# Clean build and run
.\docker-build.ps1 -Clean -Run
```

## Deployment Options

### Option 1: Development (docker-compose.yml)

Best for development and testing:

```bash
docker-compose up -d
```

**Features:**
- Simple setup
- Good for development
- Includes all services

### Option 2: Production (docker-compose.production.yml)

Optimized for production deployment:

```bash
docker-compose -f docker-compose.production.yml up -d
```

**Features:**
- Security optimizations
- Resource limits
- Non-root user
- Production-ready configuration

### Option 3: With Nginx (Production + Reverse Proxy)

For production with SSL termination and load balancing:

```bash
# Start with nginx
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

**Features:**
- Nginx reverse proxy
- SSL termination
- Rate limiting
- Security headers

## Environment Configuration

### Required Variables

```bash
# LLM Configuration
OPEN_AI_KEY=your_openai_api_key_here
OPEN_MODEL_PREF=gpt-4

# Application Settings
MULTI_USER_MODE=false
VECTOR_DB=lancedb
```

### Optional Variables

```bash
# Alternative LLM Providers
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL_PREF=claude-3-sonnet-20240229

# Security
JWT_EXPIRY=24h
DISABLE_TELEMETRY=false

# Performance
EMBEDDING_MODEL_PREF=text-embedding-3-small
```

## Data Persistence

### Docker Volumes

Data is automatically persisted in Docker volumes:

- `paralegal_data`: Application data and database
- Location: `./data` (when using production compose)

### Backup

```bash
# Backup data
docker run --rm -v paralegal_data:/data -v $(pwd):/backup alpine tar czf /backup/paralegal-backup.tar.gz -C /data .

# Restore data
docker run --rm -v paralegal_data:/data -v $(pwd):/backup alpine tar xzf /backup/paralegal-backup.tar.gz -C /data
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f paralegal-ai

# Production logs
docker-compose -f docker-compose.production.yml logs -f
```

### Health Checks

The application includes built-in health checks:

- **Main App**: `http://localhost:3001/api/ping`
- **Collector**: `http://localhost:8888` (if exposed)

### Monitoring Commands

```bash
# Container status
docker ps

# Resource usage
docker stats

# Health check status
docker inspect paralegal-ai --format='{{.State.Health.Status}}'
```

## Security Considerations

### Production Security

1. **Use HTTPS**: Configure SSL certificates in nginx
2. **Environment Variables**: Never commit API keys to version control
3. **Regular Updates**: Keep base images updated
4. **Resource Limits**: Set appropriate memory and CPU limits
5. **Network Security**: Use Docker networks for service isolation

### Security Headers

The nginx configuration includes:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs

# Check environment variables
docker-compose config
```

**Database issues:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

**Memory issues:**
```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
```

**Port conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3001

# Change ports in docker-compose.yml
```

### Debug Mode

Run in debug mode for troubleshooting:

```bash
# Override command for debugging
docker-compose run --rm paralegal-ai sh

# Check environment
docker-compose exec paralegal-ai env
```

## Scaling

### Horizontal Scaling

For high-traffic deployments:

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  paralegal-ai:
    deploy:
      replicas: 3
    ports:
      - "3001-3003:3001"
```

### Load Balancing

Use nginx or a load balancer to distribute traffic across multiple instances.

## Updates

### Rolling Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or with production config
docker-compose -f docker-compose.production.yml up -d --build
```

### Zero-Downtime Updates

For zero-downtime updates, use a load balancer and update instances one by one.

## Performance Tuning

### Resource Optimization

```yaml
# In docker-compose.yml
services:
  paralegal-ai:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

### Database Optimization

- Use PostgreSQL instead of SQLite for better performance
- Configure connection pooling
- Set appropriate cache sizes

## Backup and Recovery

### Automated Backups

Create a backup script:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker run --rm -v paralegal_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/paralegal-backup-$DATE.tar.gz -C /data .
```

### Recovery

```bash
# Restore from backup
docker run --rm -v paralegal_data:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/paralegal-backup-YYYYMMDD_HHMMSS.tar.gz -C /data
```

## Support

For issues and questions:
1. Check the logs first
2. Review this documentation
3. Check GitHub issues
4. Create a new issue with logs and configuration details

