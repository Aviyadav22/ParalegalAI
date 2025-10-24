# ParalegalAI Server Migration Plan

## Overview
This document outlines the complete process for migrating ParalegalAI from the current server to a new VM or local environment.

---

## 📋 Pre-Migration Checklist

### What's Already in GitHub ✅
- ✅ All source code (frontend, server, collector, collector_parallel)
- ✅ Configuration templates (.env.example, .env.parallel.template)
- ✅ Docker configurations
- ✅ Database schemas and migrations
- ✅ Documentation

### What's NOT in GitHub (Needs Manual Migration) ⚠️
- ❌ Environment files (.env with secrets)
- ❌ PostgreSQL database data
- ❌ Qdrant vector embeddings
- ❌ Local storage files (if any)
- ❌ SSL certificates (if configured)
- ❌ System service configurations

---

## 🗂️ Data Inventory

### 1. Environment Files
```
/home/azureuser/paralegalaiNew/.env
/home/azureuser/paralegalaiNew/collector/.env
/home/azureuser/paralegalaiNew/collector_parallel/.env
/home/azureuser/paralegalaiNew/frontend/.env
/home/azureuser/paralegalaiNew/server/.env.save
/home/azureuser/paralegalaiNew/server/.env.parallel
```

### 2. Database (PostgreSQL)
- **Database Name**: `paralegalai`
- **Contains**: Users, workspaces, documents metadata, chat history, legal metadata
- **Backup Size**: Run `pg_dump` to determine

### 3. Vector Database (Qdrant)
- **Location**: `qdrant_storage/` or Docker volume
- **Contains**: Document embeddings for semantic search
- **Size**: ~4KB (current - may grow significantly with data)

### 4. File Storage (Azure Blob)
- **Type**: Cloud-based (already centralized)
- **Containers**: 
  - `original-case-files`
  - `original-case-files-metadata`
- ✅ **No migration needed** - accessible from any server with credentials

---

## 🚀 Migration Plan

### Phase 1: Backup Current Server

#### Step 1.1: Backup Environment Files
```bash
# Create backup directory
mkdir -p ~/migration-backup/env-files

# Backup all .env files
cp /home/azureuser/paralegalaiNew/.env ~/migration-backup/env-files/root.env
cp /home/azureuser/paralegalaiNew/collector/.env ~/migration-backup/env-files/collector.env
cp /home/azureuser/paralegalaiNew/collector_parallel/.env ~/migration-backup/env-files/collector_parallel.env
cp /home/azureuser/paralegalaiNew/frontend/.env ~/migration-backup/env-files/frontend.env
cp /home/azureuser/paralegalaiNew/server/.env.save ~/migration-backup/env-files/server.env.save
cp /home/azureuser/paralegalaiNew/server/.env.parallel ~/migration-backup/env-files/server.env.parallel

# Create a secure archive
tar -czf ~/migration-backup-$(date +%Y%m%d).tar.gz -C ~/ migration-backup/
```

#### Step 1.2: Backup PostgreSQL Database
```bash
# If using Docker
docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai > ~/migration-backup/paralegalai-db-$(date +%Y%m%d).sql

# If using system PostgreSQL
pg_dump -U paralegalai_user -h localhost -d paralegalai > ~/migration-backup/paralegalai-db-$(date +%Y%m%d).sql
```

#### Step 1.3: Backup Qdrant Vector Database
```bash
# Option 1: If using Docker volume
docker run --rm -v paralegalai_qdrant_data:/source -v ~/migration-backup:/backup alpine tar -czf /backup/qdrant-backup-$(date +%Y%m%d).tar.gz -C /source .

# Option 2: If using local directory
tar -czf ~/migration-backup/qdrant-backup-$(date +%Y%m%d).tar.gz -C /home/azureuser/paralegalaiNew/qdrant_storage .

# Option 3: Use Qdrant's snapshot API
curl -X POST "http://localhost:6333/collections/{collection_name}/snapshots"
```

#### Step 1.4: Document Current Configuration
```bash
# Save Docker info
docker ps -a > ~/migration-backup/docker-containers.txt
docker images > ~/migration-backup/docker-images.txt
docker volume ls > ~/migration-backup/docker-volumes.txt

# Save system info
uname -a > ~/migration-backup/system-info.txt
node --version >> ~/migration-backup/system-info.txt
npm --version >> ~/migration-backup/system-info.txt
docker --version >> ~/migration-backup/system-info.txt
```

#### Step 1.5: Download Backup to Local Machine
```bash
# From your local machine, run:
scp -r azureuser@<current-server-ip>:~/migration-backup-$(date +%Y%m%d).tar.gz ./
```

---

### Phase 2: Prepare New Server

#### Step 2.1: System Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- **CPU**: 4+ cores recommended
- **RAM**: 8GB+ (16GB recommended)
- **Disk**: 50GB+ SSD
- **Network**: Stable internet connection for Azure Blob access

#### Step 2.2: Install Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for non-Docker setup)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install -y git

# Verify installations
docker --version
docker-compose --version
node --version
git --version
```

---

### Phase 3: Deploy to New Server

#### Step 3.1: Clone Repository
```bash
# Create project directory
mkdir -p ~/production
cd ~/production

# Clone from GitHub
git clone https://github.com/Aviyadav22/ParalegalAI.git paralegalai
cd paralegalai
```

#### Step 3.2: Restore Environment Files
```bash
# Upload backup to new server
# From local machine:
scp migration-backup-YYYYMMDD.tar.gz user@new-server-ip:~/

# On new server:
cd ~
tar -xzf migration-backup-YYYYMMDD.tar.gz
cd ~/production/paralegalai

# Restore .env files
cp ~/migration-backup/env-files/root.env .env
cp ~/migration-backup/env-files/collector.env collector/.env
cp ~/migration-backup/env-files/collector_parallel.env collector_parallel/.env
cp ~/migration-backup/env-files/frontend.env frontend/.env
cp ~/migration-backup/env-files/server.env.save server/.env.save
cp ~/migration-backup/env-files/server.env.parallel server/.env.parallel

# Set proper permissions
chmod 600 .env collector/.env collector_parallel/.env frontend/.env server/.env.*
```

#### Step 3.3: Update Environment Variables (if needed)
```bash
# Edit .env file with new server IPs/domains
nano .env

# Update these if changed:
# - VITE_API_BASE (if domain/IP changed)
# - Database URLs (if not using Docker)
# - Any server-specific paths
```

#### Step 3.4: Start Infrastructure Services
```bash
cd ~/production/paralegalai

# Start PostgreSQL and Qdrant first
docker-compose up -d postgres qdrant

# Wait for services to be healthy
docker-compose ps
```

#### Step 3.5: Restore PostgreSQL Database
```bash
# Copy database backup to new server (if not already done)
# From local machine:
scp ~/migration-backup/paralegalai-db-YYYYMMDD.sql user@new-server-ip:~/

# On new server:
# Wait for PostgreSQL to be ready
docker-compose exec postgres pg_isready -U paralegalai_user

# Restore database
docker-compose exec -T postgres psql -U paralegalai_user -d paralegalai < ~/paralegalai-db-YYYYMMDD.sql

# Verify restoration
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "\dt"
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM documents;"
```

#### Step 3.6: Restore Qdrant Vector Database
```bash
# Option 1: Restore from tar backup
docker run --rm -v paralegalai_qdrant_data:/target -v ~/migration-backup:/backup alpine sh -c "cd /target && tar -xzf /backup/qdrant-backup-YYYYMMDD.tar.gz"

# Restart Qdrant to load data
docker-compose restart qdrant

# Verify collections
curl http://localhost:6333/collections
```

#### Step 3.7: Build and Start All Services
```bash
cd ~/production/paralegalai

# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f --tail=100
```

---

### Phase 4: Verification & Testing

#### Step 4.1: Health Checks
```bash
# Check all containers are running
docker-compose ps

# Check PostgreSQL
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "SELECT version();"

# Check Qdrant
curl http://localhost:6333/health
curl http://localhost:6333/collections

# Check Server API
curl http://localhost:3001/api/ping

# Check Frontend
curl http://localhost:3000
```

#### Step 4.2: Functional Testing
1. **Login Test**: Access frontend and login with existing credentials
2. **Workspace Test**: Verify existing workspaces are visible
3. **Document Test**: Check if documents are accessible
4. **Search Test**: Test semantic search functionality
5. **Chat Test**: Send a query and verify RAG responses
6. **Upload Test**: Upload a new document and verify processing

#### Step 4.3: Data Integrity Checks
```bash
# Check document count
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM documents;"

# Check user count
docker-compose exec postgres psql -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM users;"

# Check vector embeddings
curl http://localhost:6333/collections/paralegalai/points/count
```

---

### Phase 5: DNS & Production Cutover

#### Step 5.1: Update DNS (if applicable)
```bash
# Update A records to point to new server IP
# Example:
# paralegalai.yourdomain.com → new-server-ip
# api.paralegalai.yourdomain.com → new-server-ip
```

#### Step 5.2: Configure SSL (if needed)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update docker-compose with SSL mounts
```

#### Step 5.3: Setup Reverse Proxy (Optional - Nginx)
```bash
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/paralegalai

# Add configuration:
# server {
#     listen 80;
#     server_name yourdomain.com;
#     
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
#     
#     location /api {
#         proxy_pass http://localhost:3001;
#     }
# }

# Enable site
sudo ln -s /etc/nginx/sites-available/paralegalai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5.4: Setup Monitoring & Auto-restart
```bash
# Create systemd service
sudo nano /etc/systemd/system/paralegalai.service

# Add:
# [Unit]
# Description=ParalegalAI Application
# After=docker.service
# Requires=docker.service
# 
# [Service]
# Type=oneshot
# RemainAfterExit=yes
# WorkingDirectory=/home/azureuser/production/paralegalai
# ExecStart=/usr/local/bin/docker-compose up -d
# ExecStop=/usr/local/bin/docker-compose down
# 
# [Install]
# WantedBy=multi-user.target

# Enable service
sudo systemctl enable paralegalai
sudo systemctl start paralegalai
```

---

## 🔄 Rollback Plan

### If Migration Fails:

#### Option 1: Quick Rollback
```bash
# On new server - stop everything
docker-compose down

# Update DNS back to old server
# Resume operations on old server
```

#### Option 2: Data Recovery
```bash
# If data was corrupted on new server
docker-compose down -v  # Remove volumes
# Re-run Phase 3 steps
```

---

## 📊 Alternative: Local Development Setup

### For Local Development (Mac/Windows/Linux):

```bash
# Clone repository
git clone https://github.com/Aviyadav22/ParalegalAI.git
cd ParalegalAI

# Create .env file
cp .env.example .env
nano .env  # Fill in your Azure credentials and API keys

# Start with Docker
docker-compose up -d

# OR start without Docker:

# Terminal 1 - PostgreSQL (use Docker)
docker run -d \
  --name paralegalai-postgres \
  -e POSTGRES_USER=paralegalai_user \
  -e POSTGRES_PASSWORD=paralegalai_pass \
  -e POSTGRES_DB=paralegalai \
  -p 5432:5432 \
  postgres:16-alpine

# Terminal 2 - Qdrant (use Docker)
docker run -d \
  --name paralegalai-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  qdrant/qdrant:latest

# Terminal 3 - Collector
cd collector
npm install
npm start

# Terminal 4 - Server
cd server
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev

# Terminal 5 - Frontend
cd frontend
npm install
npm run dev
```

---

## 🔐 Security Checklist

- [ ] All .env files have secure permissions (chmod 600)
- [ ] Azure Storage keys are current and valid
- [ ] JWT secrets are strong and unique
- [ ] Database passwords are strong
- [ ] Firewall rules are configured (only necessary ports open)
- [ ] SSL certificates are valid
- [ ] Backup files are stored securely and encrypted
- [ ] Old server backups are secured before decommissioning

---

## 📝 Post-Migration Tasks

### Week 1:
- [ ] Monitor application logs daily
- [ ] Check disk space and resource usage
- [ ] Verify backup systems are working
- [ ] Test all critical features
- [ ] Document any configuration changes

### Week 2:
- [ ] Schedule regular database backups
- [ ] Setup automated monitoring/alerts
- [ ] Document the new server's IP/credentials
- [ ] Update team documentation

### Month 1:
- [ ] Review performance metrics
- [ ] Optimize resource allocation if needed
- [ ] Consider setting up CI/CD pipeline
- [ ] Plan for disaster recovery testing

---

## 🆘 Troubleshooting

### Common Issues:

#### Issue: Database connection fails
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
docker-compose exec postgres psql -U paralegalai_user -d paralegalai

# Verify DATABASE_URL in .env
```

#### Issue: Qdrant not connecting
```bash
# Check Qdrant health
curl http://localhost:6333/health

# Restart Qdrant
docker-compose restart qdrant

# Check logs
docker-compose logs qdrant
```

#### Issue: Azure Blob Storage access denied
```bash
# Verify connection string
# Test connection
az storage container list --connection-string "$AZURE_STORAGE_CONNECTION_STRING"

# Regenerate access keys in Azure Portal if needed
```

#### Issue: Port conflicts
```bash
# Check what's using ports
sudo lsof -i :3000  # Frontend
sudo lsof -i :3001  # Backend
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6333  # Qdrant

# Stop conflicting services or change ports in docker-compose.yml
```

---

## 📞 Support Contacts

- GitHub Repository: https://github.com/Aviyadav22/ParalegalAI
- Azure Support: For storage/infrastructure issues
- Database Issues: Check PostgreSQL logs
- Vector DB Issues: Check Qdrant documentation

---

## 🎯 Quick Migration Script

For convenience, here's an all-in-one migration script:

```bash
#!/bin/bash
# save as: migrate.sh
# Usage: ./migrate.sh backup  (on old server)
#        ./migrate.sh restore (on new server)

set -e

BACKUP_DIR=~/migration-backup
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR=~/production/paralegalai

backup() {
    echo "🔄 Starting backup process..."
    mkdir -p $BACKUP_DIR/env-files
    
    # Backup env files
    echo "📁 Backing up environment files..."
    cp /home/azureuser/paralegalaiNew/.env $BACKUP_DIR/env-files/root.env
    cp /home/azureuser/paralegalaiNew/collector/.env $BACKUP_DIR/env-files/collector.env
    cp /home/azureuser/paralegalaiNew/frontend/.env $BACKUP_DIR/env-files/frontend.env
    
    # Backup PostgreSQL
    echo "🗄️  Backing up PostgreSQL database..."
    docker exec paralegalai-postgres pg_dump -U paralegalai_user paralegalai > $BACKUP_DIR/paralegalai-db-$DATE.sql
    
    # Backup Qdrant
    echo "🔍 Backing up Qdrant vectors..."
    docker run --rm -v paralegalai_qdrant_data:/source -v $BACKUP_DIR:/backup alpine tar -czf /backup/qdrant-backup-$DATE.tar.gz -C /source .
    
    # Create final archive
    echo "📦 Creating final backup archive..."
    cd ~
    tar -czf migration-backup-$DATE.tar.gz migration-backup/
    
    echo "✅ Backup complete: ~/migration-backup-$DATE.tar.gz"
    echo "📤 Download this file to your local machine before proceeding"
}

restore() {
    echo "🔄 Starting restore process..."
    
    # Extract backup
    echo "📦 Extracting backup..."
    cd ~
    tar -xzf migration-backup-*.tar.gz
    
    # Clone repository
    echo "📥 Cloning repository..."
    mkdir -p ~/production
    cd ~/production
    git clone https://github.com/Aviyadav22/ParalegalAI.git paralegalai
    cd paralegalai
    
    # Restore env files
    echo "📁 Restoring environment files..."
    cp ~/migration-backup/env-files/root.env .env
    cp ~/migration-backup/env-files/collector.env collector/.env
    cp ~/migration-backup/env-files/frontend.env frontend/.env
    chmod 600 .env collector/.env frontend/.env
    
    # Start infrastructure
    echo "🚀 Starting PostgreSQL and Qdrant..."
    docker-compose up -d postgres qdrant
    sleep 10
    
    # Restore PostgreSQL
    echo "🗄️  Restoring PostgreSQL database..."
    docker-compose exec -T postgres psql -U paralegalai_user -d paralegalai < ~/migration-backup/paralegalai-db-*.sql
    
    # Restore Qdrant
    echo "🔍 Restoring Qdrant vectors..."
    docker run --rm -v paralegalai_qdrant_data:/target -v ~/migration-backup:/backup alpine sh -c "cd /target && tar -xzf /backup/qdrant-backup-*.tar.gz"
    docker-compose restart qdrant
    
    # Start all services
    echo "🚀 Starting all services..."
    docker-compose build
    docker-compose up -d
    
    echo "✅ Restoration complete!"
    echo "🔍 Check status with: docker-compose ps"
    echo "📋 View logs with: docker-compose logs -f"
}

case "$1" in
    backup)
        backup
        ;;
    restore)
        restore
        ;;
    *)
        echo "Usage: $0 {backup|restore}"
        exit 1
        ;;
esac
```

Make it executable:
```bash
chmod +x migrate.sh
```

---

**End of Migration Plan**

For questions or issues during migration, refer to the Troubleshooting section or check the GitHub repository.

