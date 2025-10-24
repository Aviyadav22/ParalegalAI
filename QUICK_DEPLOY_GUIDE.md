# Quick Deploy Guide - ParalegalAI

## 🚀 TL;DR - New Server Deployment

### Prerequisites
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Re-login to apply docker group
```

### Fresh Installation (No Data Migration)
```bash
# 1. Clone repository
git clone https://github.com/Aviyadav22/ParalegalAI.git
cd ParalegalAI

# 2. Create .env file
cp .env.example .env
nano .env

# REQUIRED: Fill in these values:
# - AZURE_STORAGE_CONNECTION_STRING
# - AZURE_STORAGE_CONTAINER_NAME
# - GEMINI_API_KEY
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - SIG_KEY (generate with: openssl rand -base64 32)
# - SIG_SALT (generate with: openssl rand -base64 32)

# 3. Start everything
docker-compose up -d

# 4. Check status
docker-compose ps
docker-compose logs -f

# 5. Access application
# Frontend: http://localhost:3000
# API: http://localhost:3001
```

### Migration from Existing Server
```bash
# ON OLD SERVER: Create backup
docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai > db-backup.sql
docker run --rm -v paralegalai_qdrant_data:/source -v ~/:/backup alpine tar -czf /backup/qdrant-backup.tar.gz -C /source .
tar -czf env-backup.tar.gz .env collector/.env frontend/.env

# Download to local machine
scp user@old-server:~/{db-backup.sql,qdrant-backup.tar.gz,env-backup.tar.gz} ./

# ON NEW SERVER: 
git clone https://github.com/Aviyadav22/ParalegalAI.git
cd ParalegalAI

# Upload and extract env files
scp env-backup.tar.gz user@new-server:~/ParalegalAI/
tar -xzf env-backup.tar.gz

# Start PostgreSQL & Qdrant
docker-compose up -d postgres qdrant
sleep 10

# Restore database
scp db-backup.sql user@new-server:~/
docker-compose exec -T postgres psql -U paralegalai_user -d paralegalai < ~/db-backup.sql

# Restore Qdrant
scp qdrant-backup.tar.gz user@new-server:~/
docker run --rm -v paralegalai_qdrant_data:/target -v ~/:/backup alpine sh -c "cd /target && tar -xzf /backup/qdrant-backup.tar.gz"
docker-compose restart qdrant

# Start all services
docker-compose build
docker-compose up -d

# Verify
docker-compose ps
curl http://localhost:3001/api/ping
curl http://localhost:6333/health
```

---

## 🔧 Environment Configuration

### Minimal .env Configuration
```env
# Azure Storage (REQUIRED)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER_NAME=original-case-files

# Gemini API (REQUIRED)
GEMINI_API_KEY=AIzaSy...

# Security (REQUIRED - Generate new for production!)
JWT_SECRET=<run: openssl rand -base64 32>
SIG_KEY=<run: openssl rand -base64 32>
SIG_SALT=<run: openssl rand -base64 32>

# Optional but recommended
ENABLE_HYBRID_SEARCH=true
RERANKER_ENABLED=true
RERANKER_PROVIDER=gemini
```

### Generate Secure Keys
```bash
# Generate all required secrets at once
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SIG_KEY=$(openssl rand -base64 32)"
echo "SIG_SALT=$(openssl rand -base64 32)"
```

---

## 🐳 Docker Commands Cheatsheet

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
docker-compose logs -f server  # specific service

# Restart a service
docker-compose restart server

# Rebuild after code changes
docker-compose build
docker-compose up -d --force-recreate

# Check status
docker-compose ps
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U paralegalai_user -d paralegalai

# Run SQL query
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM documents;"

# Backup database
docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai > backup.sql

# Restore database
docker-compose exec -T postgres psql -U paralegalai_user -d paralegalai < backup.sql

# Reset database (WARNING: Deletes all data!)
docker-compose down -v postgres
docker-compose up -d postgres
```

### Vector Database (Qdrant)
```bash
# Check health
curl http://localhost:6333/health

# List collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/paralegalai

# Backup Qdrant
docker run --rm -v paralegalai_qdrant_data:/source -v $(pwd):/backup alpine tar -czf /backup/qdrant-backup.tar.gz -C /source .

# Restore Qdrant
docker run --rm -v paralegalai_qdrant_data:/target -v $(pwd):/backup alpine sh -c "cd /target && tar -xzf /backup/qdrant-backup.tar.gz"
```

---

## 🌐 Production Deployment

### With Custom Domain + SSL

1. **Update .env for production**
```bash
VITE_API_BASE=https://api.yourdomain.com/api
```

2. **Install Nginx**
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

3. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/paralegalai
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Enable and get SSL**
```bash
sudo ln -s /etc/nginx/sites-available/paralegalai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

5. **Auto-renewal**
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs <service-name>

# Check if port is in use
sudo lsof -i :3000  # Frontend
sudo lsof -i :3001  # Backend
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6333  # Qdrant

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection from server container
docker-compose exec server psql postgresql://paralegalai_user:paralegalai_pass@postgres:5432/paralegalai

# Reset database password
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "ALTER USER paralegalai_user PASSWORD 'new_password';"
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes
docker-compose down -v
docker volume prune

# Remove old images
docker images
docker rmi <image-id>
```

### Azure Storage Issues
```bash
# Test connection string
docker-compose exec server node -e "
const { BlobServiceClient } = require('@azure/storage-blob');
const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
client.listContainers().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Failed:', e.message));
"
```

---

## 📊 Monitoring

### Check Application Health
```bash
# Quick health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 ParalegalAI Health Check"
echo "=========================="

echo -n "PostgreSQL: "
docker-compose exec postgres pg_isready -U paralegalai_user && echo "✅" || echo "❌"

echo -n "Qdrant: "
curl -s http://localhost:6333/health > /dev/null && echo "✅" || echo "❌"

echo -n "Server API: "
curl -s http://localhost:3001/api/ping > /dev/null && echo "✅" || echo "❌"

echo -n "Frontend: "
curl -s http://localhost:3000 > /dev/null && echo "✅" || echo "❌"

echo ""
echo "Container Status:"
docker-compose ps
EOF

chmod +x health-check.sh
./health-check.sh
```

### Resource Usage
```bash
# Check Docker resource usage
docker stats

# Check disk usage by container
docker system df -v

# Check logs size
du -sh $(docker inspect --format='{{.LogPath}}' paralegalai-server)
```

---

## 🔄 Updates & Maintenance

### Update to Latest Code
```bash
cd ~/ParalegalAI

# Backup before update
docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai > backup-before-update.sql

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Backup Strategy
```bash
# Daily backup script
cat > /usr/local/bin/paralegalai-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups/paralegalai
DATE=$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Backup Qdrant
docker run --rm -v paralegalai_qdrant_data:/source -v $BACKUP_DIR:/backup alpine tar -czf /backup/qdrant-$DATE.tar.gz -C /source .

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/paralegalai-backup.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/paralegalai-backup.sh >> /var/log/paralegalai-backup.log 2>&1") | crontab -
```

---

## 📱 Quick Reference

| Component | Port | Health Check |
|-----------|------|--------------|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001/api/ping |
| PostgreSQL | 5432 | `docker-compose exec postgres pg_isready` |
| Qdrant | 6333 | http://localhost:6333/health |
| Collector | 8888 | http://localhost:8888/health |

### Default Credentials
- **PostgreSQL**: `paralegalai_user` / `paralegalai_pass`
- **First User**: Created during onboarding

### Important Directories
- **Project Root**: `~/ParalegalAI` or `/home/azureuser/paralegalaiNew`
- **Docker Volumes**: `/var/lib/docker/volumes/`
- **Logs**: `docker-compose logs`

---

## 🆘 Emergency Commands

### Complete Reset (Nuclear Option)
```bash
cd ~/ParalegalAI
docker-compose down -v
docker system prune -a --volumes -f
git pull origin main
cp .env.backup .env
docker-compose up -d --build
```

### Restore from Backup
```bash
# Stop services
docker-compose down -v

# Restore database
docker-compose up -d postgres
sleep 5
docker-compose exec -T postgres psql -U paralegalai_user -d paralegalai < backup.sql

# Restore Qdrant
docker-compose up -d qdrant
docker run --rm -v paralegalai_qdrant_data:/target -v $(pwd):/backup alpine sh -c "cd /target && tar -xzf /backup/qdrant-backup.tar.gz"

# Start all
docker-compose up -d
```

---

**For detailed migration instructions, see [SERVER_MIGRATION_PLAN.md](./SERVER_MIGRATION_PLAN.md)**

**Repository**: https://github.com/Aviyadav22/ParalegalAI

