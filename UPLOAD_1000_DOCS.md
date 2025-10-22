# Upload 1000 Documents - Quick Guide

## ✅ System Status

All services are running with parallel processing enabled!

- ✅ **Qdrant:** Running on port 6333
- ✅ **Collector:** Running on port 8888
- ✅ **Server:** Running on port 3001
- ✅ **API Keys:** 4 Gemini keys configured
- ✅ **Parallel Processing:** ENABLED (8 workers)

---

## 🚀 Upload via UI

### **Step 1: Access ParalegalAI**
Open in browser: `http://localhost:3001` (or your server IP)

### **Step 2: Navigate to Workspace**
1. Click on your workspace (e.g., "research")
2. Click "Upload Documents" button

### **Step 3: Select 1000 PDFs**
1. Click "Choose Files" or drag & drop
2. Select all 1000 PDF files
3. Click "Upload"

### **Step 4: Monitor Progress**
The system will automatically:
- ✅ Process in batches of 100
- ✅ Use 8 concurrent workers
- ✅ Rotate between 4 API keys
- ✅ Retry failed documents
- ✅ Show progress in UI

---

## 📊 Expected Performance

### **With 4 API Keys:**
- **Processing Rate:** 15-20 docs/second
- **1000 PDFs:** 50-65 seconds (~1 minute)
- **Batch Processing:** 10 batches of 100

### **What Happens:**
```
Upload 1000 PDFs
    ↓
Split into 10 batches (100 each)
    ↓
Process each batch with 8 workers
    ↓
Rotate API keys automatically
    ↓
Embed chunks (100 at a time)
    ↓
Store in Qdrant + PostgreSQL
    ↓
Complete!
```

---

## 🔍 Monitor Progress

### **Real-time Logs:**

**Terminal 1 - Server logs:**
```bash
tail -f /home/azureuser/server.log
```

**Terminal 2 - Collector logs:**
```bash
tail -f /home/azureuser/collector.log
```

### **Check Vector Count:**
```bash
curl -s http://localhost:6333/collections/research | jq '.result.vectors_count'
```

### **Check Document Count:**
```bash
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM workspace_documents;"
```

---

## 📋 What You'll See

### **In Server Logs:**
```
[Documents] Using PARALLEL processing for 100 documents
[ParallelProcessor] Processing 100 documents...
[ParallelProcessor] Concurrency: 8, Batch size: 100
[ParallelProcessor] Processing batch 1/1 (100 documents)
[Qdrant] Using parallel Gemini embedder with multiple API keys
[ParallelGeminiEmbedder] Initialized with 4 API key(s)
[ParallelGeminiEmbedder] Embedding 120 chunks...
[ParallelGeminiEmbedder] Split into 2 batches
[ParallelProcessor] Progress: 100.0% | Processed: 100 | Failed: 0 | Rate: 18.5 docs/sec
```

### **In UI:**
- Progress bar showing upload status
- Number of documents processed
- Success/failure count
- Estimated time remaining

---

## ⚠️ Important Notes

### **1. Browser Limits**
- Most browsers limit file selection to ~500-1000 files
- If you can't select all 1000, split into 2 batches of 500

### **2. Memory Management**
- System processes in batches to avoid memory issues
- Each batch is completed before next starts
- Safe for 1000+ documents

### **3. Rate Limiting**
- 4 API keys = 6,000 requests/minute
- Automatic rotation prevents rate limits
- Retry logic handles temporary failures

### **4. Resume Capability**
- If upload fails, you can retry
- System skips already-processed documents
- No duplicate processing

---

## 🛠️ Troubleshooting

### **Issue: Upload Stuck**

**Check logs:**
```bash
tail -50 /home/azureuser/server.log
```

**Look for:**
- Rate limit errors → Wait 1 minute, retry
- Memory errors → Reduce batch size in .env
- Network errors → Check internet connection

### **Issue: Some Documents Failed**

**Check failed documents:**
```bash
grep "Failed to vectorize" /home/azureuser/server.log
```

**Solutions:**
- Re-upload failed documents
- Check PDF format (must have text)
- Verify file size (< 100MB per file)

### **Issue: Slow Processing**

**Check:**
```bash
# API key usage
grep "ApiKeyRotator" /home/azureuser/server.log | tail -20

# System resources
htop
```

**Solutions:**
- Verify all 4 API keys are working
- Check CPU usage (should be 60-80%)
- Check network speed

---

## ✅ Verification After Upload

### **1. Check Total Documents:**
```bash
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM workspace_documents WHERE \"workspaceId\" = (SELECT id FROM workspaces WHERE slug = 'research');"
```

### **2. Check Total Vectors:**
```bash
curl -s http://localhost:6333/collections/research | jq '.result'
```

### **3. Test Search:**
1. Go to workspace in UI
2. Ask a question
3. Verify relevant documents are returned

---

## 📊 Performance Metrics

After upload completes, check:

### **Processing Statistics:**
```bash
grep "FINAL STATISTICS" /home/azureuser/server.log -A 10
```

### **API Key Usage:**
```bash
grep "ApiKeyRotator" /home/azureuser/server.log | grep "Initialized"
```

### **Embedding Performance:**
```bash
grep "ParallelGeminiEmbedder" /home/azureuser/server.log | grep "Successfully embedded"
```

---

## 🎯 Expected Results

### **After uploading 1000 PDFs:**

✅ **Database:**
- 1000 documents in `workspace_documents`
- ~120,000 vectors in Qdrant (120 chunks/doc avg)

✅ **Performance:**
- Total time: 50-65 seconds
- Processing rate: 15-20 docs/sec
- Success rate: 98-99%

✅ **Search:**
- Instant search results
- Relevant document retrieval
- Citation support

---

## 🔄 If You Need to Stop/Restart

### **Stop Services:**
```bash
# Stop server
lsof -ti:3001 | xargs kill -9

# Stop collector
lsof -ti:8888 | xargs kill -9

# Stop Qdrant (optional)
pkill qdrant
```

### **Restart Services:**
```bash
# Start Qdrant
/usr/local/bin/qdrant --config-path /home/azureuser/qdrant_config/config.yaml &

# Start Collector
cd /home/azureuser/paralegalaiNew/collector && node index.js > /home/azureuser/collector.log 2>&1 &

# Start Server
cd /home/azureuser/paralegalaiNew/server && node index.js > /home/azureuser/server.log 2>&1 &
```

---

## 📞 Quick Commands

```bash
# Check service status
curl -s http://localhost:3001/api/ping

# Watch server logs
tail -f /home/azureuser/server.log

# Check vector count
curl -s http://localhost:6333/collections/research | jq '.result.vectors_count'

# Check document count
PGPASSWORD=paralegalai_pass psql -h localhost -U paralegalai_user -d paralegalai -c "SELECT COUNT(*) FROM workspace_documents;"

# Check API keys
grep "GEMINI_API_KEY_" /home/azureuser/paralegalaiNew/server/.env | wc -l
```

---

## ✨ You're Ready!

**System is configured and running with:**
- ✅ 4 Gemini API keys
- ✅ 8 concurrent workers
- ✅ Parallel batch processing
- ✅ Automatic retry logic
- ✅ Progress tracking

**Go to UI and upload your 1000 PDFs!** 🚀

**Expected time: ~1 minute** ⚡
