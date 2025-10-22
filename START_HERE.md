# 🚀 ParalegalAI - START HERE

## One-Stop Documentation for Complete Setup

Run COMMANDS
# Start PostgreSQL (if not auto-started)
sudo systemctl start postgresql

# Start Qdrant
/usr/local/bin/qdrant --config-path /home/azureuser/qdrant_config/config.yaml &

# Start Collector
cd /home/azureuser/paralegalaiNew/collector && node index.js &

# Start Server
cd /home/azureuser/paralegalaiNew/server && node index.js &
---

## 📖 What You Need

### 1. API Keys (Required)
- **Gemini API Key**: Get from https://makersuite.google.com/app/apikey
- **Azure Storage**: Get from https://portal.azure.com → Storage Accounts → Access Keys

### 2. Copy These Values

```bash
# Azure Storage Connection String (from Azure Portal)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net

# Gemini API Key (from Google AI Studio)
GEMINI_API_KEY=AIzaSy...your-key-here

# Generate Security Keys (run these commands):
JWT_SECRET=$(openssl rand -base64 24)
SIG_KEY=$(openssl rand -base64 48)
SIG_SALT=$(openssl rand -base64 48)
```

---

## 🐳 Docker Mode (Easiest - Recommended)

### 3 Commands to Run Everything:

```bash
# 1. Navigate to project
cd /home/azureuser/paralegalaiNew

# 2. Setup environment
cp .env.example .env
nano .env  # Paste your keys from above

# 3. Start everything
./quick-start.sh
```

**That's it!** Access at http://localhost:3000

---

## 🔧 Bare Metal Mode (Manual Control)

### Quick Commands:

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Start Qdrant
sudo systemctl start qdrant

# Start Collector
cd /home/azureuser/paralegalaiNew/collector
nohup node index.js > /home/azureuser/collector.log 2>&1 &

# Start Server
cd /home/azureuser/paralegalaiNew/server
nohup node index.js > /home/azureuser/server.log 2>&1 &

# Serve Frontend
cd /home/azureuser/paralegalaiNew/frontend
npx serve -s dist -l 3000 &
```

**Full instructions**: See `DEPLOYMENT_GUIDE.md`

---

## 📋 Configuration Cheat Sheet

### Environment Variables (.env file)

```bash
# ============ REQUIRED ============
AZURE_STORAGE_CONNECTION_STRING=<from Azure Portal>
GEMINI_API_KEY=<from Google AI Studio>
JWT_SECRET=<random 12+ chars>
SIG_KEY=<random 32+ chars>
SIG_SALT=<random 32+ chars>

# ============ OPTIONAL ============
AZURE_STORAGE_CONTAINER_NAME=original-case-files
GEMINI_LLM_MODEL_PREF=gemini-2.5-pro
EMBEDDING_MODEL_PREF=embedding-001
SERVER_PORT=3001
```

---

## 🏗️ Architecture (What Goes Where)

```
PostgreSQL (Port 5432)
├─ Users, workspaces, documents
├─ Original file metadata
└─ All app data

Azure Blob Storage (Cloud)
├─ Original PDF files
└─ File metadata backup

Qdrant (Port 6333)
└─ Vector embeddings

Local Disk
└─ Temporary cache only
```

---

## ✅ Verification Checklist

After starting, verify:

```bash
# Check services are running
curl http://localhost:3001/api/ping        # Server
curl http://localhost:8888/accepts         # Collector  
curl http://localhost:6333/collections     # Qdrant
curl http://localhost:3000                 # Frontend

# Check database
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT version();"

# Check logs
tail -f /home/azureuser/server.log
tail -f /home/azureuser/collector.log
```

---

## 🎯 First-Time Usage

1. Open http://localhost:3000
2. Create admin account
3. Create workspace
4. Upload PDF
5. Chat with your documents!

---

## 🔍 Troubleshooting

### "View PDF" button not showing?
- Check collector logs: `tail -n 100 /home/azureuser/collector.log`
- Verify Azure connection string in `.env`
- Ensure DATABASE_URL is set in both `server/.env` and `collector/.env`

### Database connection failed?
```bash
sudo systemctl status postgresql
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai
```

### Qdrant not accessible?
```bash
sudo systemctl status qdrant
curl http://localhost:6333/collections
```

### Azure Blob errors?
- Verify connection string format
- Check Azure Portal → Storage Account → Access Keys
- Ensure containers exist (auto-created on first upload)

---

## 📚 Full Documentation

- **DEPLOYMENT_GUIDE.md** - Complete deployment instructions (Docker + Bare Metal)
- **SCALABILITY_ANALYSIS_REPORT.md** - Architecture analysis & scaling guide
- **docker-compose.yml** - Docker orchestration file
- **quick-start.sh** - Automated setup script

---

## 🛡️ Security Notes

- **Never commit `.env`** to git (already in .gitignore)
- **Change default passwords** in production
- **Use HTTPS** in production (nginx + Let's Encrypt)
- **Restrict firewall** to only expose ports 3000, 3001
- **Enable Azure private containers** in production

---

## 📊 Scalability

**Current Setup Handles:**
- ✅ 50,000 PDFs
- ✅ 100+ concurrent users
- ✅ ~1TB file storage (Azure)
- ✅ ~40GB vector storage (Qdrant)
- ✅ ~15GB metadata (PostgreSQL)

**For More:** See `SCALABILITY_ANALYSIS_REPORT.md`

---

## 🆘 Quick Help

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -ti:3001 \| xargs kill -9` |
| Docker not starting | `docker-compose down -v && docker-compose up -d` |
| Database locked | `sudo systemctl restart postgresql` |
| Out of memory | Upgrade RAM to 32GB (see scaling guide) |

---

**Version:** 1.0  
**Last Updated:** 2025-10-07  
**Support:** Check logs in `/home/azureuser/*.log`
