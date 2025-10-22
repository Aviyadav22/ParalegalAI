# ParalegalAI Deployment Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      ParalegalAI Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React + Vite)  ──→  Port 3000                  │
│       │                                                     │
│       ↓                                                     │
│  Backend Server (Node.js)  ──→  Port 3001                 │
│       │                                                     │
│       ├──→ PostgreSQL (Metadata)  ──→  Port 5432          │
│       ├──→ Qdrant (Vectors)  ──→  Port 6333               │
│       ├──→ Azure Blob (Files)  ──→  Cloud                 │
│       └──→ Collector (Docs)  ──→  Port 8888               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Storage:**
- **PostgreSQL**: All metadata (users, workspaces, documents, original_files)
- **Qdrant**: Vector embeddings for semantic search
- **Azure Blob**: Original PDF/document files
- **Local Disk**: Temporary processing cache only

---

## 🚀 Quick Start (Docker Mode)

### Prerequisites
- Docker & Docker Compose installed
- Azure Storage Account (for file storage)
- Gemini API Key (for LLM/embeddings)

### Step 1: Clone & Configure

```bash
cd /path/to/paralegalaiNew

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Step 2: Fill Required Credentials in `.env`

```bash
# Azure Blob Storage (Get from Azure Portal)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net

# Gemini API (Get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy...your-key-here

# Generate random secrets (use: openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 24)
SIG_KEY=$(openssl rand -base64 48)
SIG_SALT=$(openssl rand -base64 48)
```

### Step 3: Start Everything

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### Step 5: First-Time Setup

1. Open http://localhost:3000
2. Create admin account
3. Create workspace
4. Upload your first PDF

---

## 🔧 Bare Metal Deployment

### Prerequisites

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql-16 nodejs npm git curl

# Install Qdrant
curl -sSL https://github.com/qdrant/qdrant/releases/download/v1.7.4/qdrant-x86_64-unknown-linux-gnu.tar.gz | tar xz
sudo mv qdrant /usr/local/bin/
```

### Step 1: Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<SQL
CREATE USER paralegalai_user WITH PASSWORD 'paralegalai_pass';
CREATE DATABASE paralegalai OWNER paralegalai_user;
GRANT ALL PRIVILEGES ON DATABASE paralegalai TO paralegalai_user;
\q
SQL

# Test connection
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT version();"
```

### Step 2: Setup Qdrant

```bash
# Create Qdrant service
sudo tee /etc/systemd/system/qdrant.service > /dev/null <<EOF
[Unit]
Description=Qdrant Vector Database
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/qdrant
Restart=on-failure
Environment="QDRANT__SERVICE__HTTP_PORT=6333"

[Install]
WantedBy=multi-user.target
EOF

# Start Qdrant
sudo systemctl daemon-reload
sudo systemctl start qdrant
sudo systemctl enable qdrant

# Verify
curl http://localhost:6333/collections
```

### Step 3: Configure Application

```bash
cd /home/azureuser/paralegalaiNew

# Server environment
cat > server/.env <<'EOF'
SERVER_PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://paralegalai_user:paralegalai_pass@localhost:5432/paralegalai
POSTGRES_CONNECTION_STRING=postgresql://paralegalai_user:paralegalai_pass@localhost:5432/paralegalai

# Azure Storage
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING_HERE
AZURE_STORAGE_CONTAINER_NAME=original-case-files
AZURE_STORAGE_METADATA_CONTAINER_NAME=original-case-files-metadata

# Vector DB
VECTOR_DB=qdrant
QDRANT_ENDPOINT=http://localhost:6333

# LLM & Embeddings
LLM_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
GEMINI_LLM_MODEL_PREF=gemini-2.5-pro
EMBEDDING_ENGINE=gemini
GEMINI_EMBEDDING_API_KEY=YOUR_GEMINI_KEY_HERE
EMBEDDING_MODEL_PREF=embedding-001

# Security
JWT_SECRET=$(openssl rand -base64 24)
SIG_KEY=$(openssl rand -base64 48)
SIG_SALT=$(openssl rand -base64 48)

# Collector
COLLECTOR_HOST=127.0.0.1
COLLECTOR_PORT=8888
COLLECTOR_PROTOCOL=http

# Optional
RERANKER_PROVIDER=gemini
WHISPER_PROVIDER=local
TTS_PROVIDER=native
STORAGE_DIR=/home/azureuser/paralegalaiNew/server/storage
EOF

# Collector environment
cat > collector/.env <<'EOF'
NODE_ENV=production
STORAGE_DIR=/home/azureuser/paralegalaiNew/server/storage

# Database (for original file metadata)
DATABASE_URL=postgresql://paralegalai_user:paralegalai_pass@localhost:5432/paralegalai

# Azure Storage
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING_HERE
AZURE_STORAGE_CONTAINER_NAME=original-case-files
AZURE_STORAGE_METADATA_CONTAINER_NAME=original-case-files-metadata
EOF
```

### Step 4: Install Dependencies

```bash
# Server
cd server
npm install
npx prisma generate
npx prisma migrate deploy

# Collector
cd ../collector
npm install

# Frontend
cd ../frontend
npm install
npm run build
```

### Step 5: Start Services

```bash
# Start Collector
cd /home/azureuser/paralegalaiNew/collector
nohup node index.js > /home/azureuser/collector.log 2>&1 &

# Start Server
cd /home/azureuser/paralegalaiNew/server
nohup node index.js > /home/azureuser/server.log 2>&1 &

# Serve Frontend (with nginx or serve)
cd /home/azureuser/paralegalaiNew/frontend
npx serve -s dist -l 3000 &
```

### Step 6: Verify Services

```bash
# Check all services
curl http://localhost:3001/api/ping        # Server
curl http://localhost:8888/accepts         # Collector
curl http://localhost:6333/collections     # Qdrant
curl http://localhost:3000                 # Frontend
```

---

## 📋 Configuration Reference

### Required API Keys

| Service | Get From | Purpose |
|---------|----------|---------|
| **Gemini API** | https://makersuite.google.com/app/apikey | LLM & Embeddings |
| **Azure Storage** | https://portal.azure.com | File Storage |

### Azure Storage Setup

1. Go to Azure Portal → Storage Accounts
2. Create new storage account (or use existing)
3. Go to "Access keys" → Copy connection string
4. Containers will be auto-created on first upload

### Environment Variables

```bash
# REQUIRED
AZURE_STORAGE_CONNECTION_STRING=...    # Azure Blob Storage
GEMINI_API_KEY=...                     # Gemini LLM/Embeddings
JWT_SECRET=...                         # Auth tokens (min 12 chars)
SIG_KEY=...                            # Signatures (min 32 chars)
SIG_SALT=...                           # Salt (min 32 chars)

# OPTIONAL (defaults shown)
AZURE_STORAGE_CONTAINER_NAME=original-case-files
GEMINI_LLM_MODEL_PREF=gemini-2.5-pro
EMBEDDING_MODEL_PREF=embedding-001
SERVER_PORT=3001
```

---

## 🔍 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai
```

### Qdrant Not Accessible
```bash
# Check Qdrant is running
sudo systemctl status qdrant

# Check port
curl http://localhost:6333/collections
```

### Azure Blob Storage Errors
```bash
# Verify connection string format
echo $AZURE_STORAGE_CONNECTION_STRING | grep "AccountName"

# Test from server
cd server
node -e "require('dotenv').config(); console.log(process.env.AZURE_STORAGE_CONNECTION_STRING ? 'OK' : 'MISSING');"
```

### View PDF Button Not Showing
```bash
# Check original file was stored
cd server
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM original_files;"

# Check logs for errors
tail -n 100 /home/azureuser/collector.log | grep -i "error\|azure\|prisma"
```

---

## 📊 Performance Tuning (Production)

### PostgreSQL Optimization

Edit `/etc/postgresql/16/main/postgresql.conf`:

```ini
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 10GB
work_mem = 16MB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

Restart: `sudo systemctl restart postgresql`

### Add Connection Pooling (PgBouncer)

```bash
sudo apt install pgbouncer
sudo nano /etc/pgbouncer/pgbouncer.ini

# Configure:
[databases]
paralegalai = host=localhost port=5432 dbname=paralegalai

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Update DATABASE_URL to use port 6432
```

---

## 🛡️ Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Generate strong JWT_SECRET, SIG_KEY, SIG_SALT
- [ ] Enable firewall (only expose 3000, 3001)
- [ ] Use HTTPS in production (nginx + Let's Encrypt)
- [ ] Restrict Azure Storage access (private containers)
- [ ] Enable PostgreSQL SSL connections
- [ ] Regular backups (PostgreSQL + Azure Blob)
- [ ] Monitor logs for suspicious activity

---

## 📦 Docker Commands Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Restart specific service
docker-compose restart server

# Rebuild after code changes
docker-compose up -d --build

# Clean everything (including volumes)
docker-compose down -v

# Check resource usage
docker stats
```

---

## 🔄 Backup & Restore

### PostgreSQL Backup
```bash
# Backup
PGPASSWORD=paralegalai_pass pg_dump -h localhost -U paralegalai_user paralegalai > backup_$(date +%Y%m%d).sql

# Restore
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user paralegalai < backup_20250107.sql
```

### Azure Blob Backup
Azure Blob Storage has built-in redundancy (LRS/GRS). Enable soft delete in Azure Portal for additional protection.

---

## 📞 Support

- **Documentation**: `/home/azureuser/SCALABILITY_ANALYSIS_REPORT.md`
- **Architecture**: See diagram at top of this file
- **Logs**: Check `/home/azureuser/*.log` files

---

**Version:** 1.0  
**Last Updated:** 2025-10-07
