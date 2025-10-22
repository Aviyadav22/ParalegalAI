# Parallelization Plan for 50K PDF Upload

## Current Architecture Analysis

### 🔴 **Bottlenecks Identified:**

#### 1. **Sequential Processing** (MAJOR BOTTLENECK)
**Location:** `/server/models/documents.js` - `addDocuments()` method (line 94)
```javascript
for (const path of additions) {  // ❌ SEQUENTIAL
  const data = await fileData(path);
  await VectorDb.addDocumentToNamespace(...);
  await prisma.workspace_documents.create(...);
}
```
**Impact:** Processing 50K files one-by-one = **EXTREMELY SLOW**

#### 2. **Synchronous PDF Parsing** (BOTTLENECK)
**Location:** `/collector/processSingleFile/convert/asPDF/index.js` (line 25)
```javascript
let docs = await pdfLoader.load();  // ❌ BLOCKS
for (const doc of docs) {           // ❌ SEQUENTIAL PAGE PARSING
  pageContent.push(doc.pageContent);
}
```
**Impact:** Each PDF parsed page-by-page sequentially

#### 3. **Embedding API Rate Limits** (BOTTLENECK)
**Location:** `/server/utils/vectorDbProviders/qdrant/index.js` (line 237)
```javascript
const vectorValues = await EmbedderEngine.embedChunks(textChunks);  // ❌ RATE LIMITED
```
**Impact:** Gemini API has rate limits (requests/minute)

#### 4. **Single Collector Instance** (BOTTLENECK)
**Location:** `/collector/index.js` (line 200)
```javascript
app.listen(8888, ...)  // ❌ SINGLE INSTANCE
```
**Impact:** Only 1 collector processing requests

#### 5. **Database Write Bottleneck** (MINOR)
**Location:** Multiple locations
- PostgreSQL: Sequential inserts
- Qdrant: Batch upserts (good, but could be better)

---

## 🚀 **Optimization Strategy for 50K PDFs**

### **Phase 1: Parallel Document Processing** (10x speedup)

#### A. **Batch Processing with Worker Pool**
```javascript
// NEW: /server/utils/workers/documentWorker.js
const { Worker } = require('worker_threads');
const os = require('os');

class DocumentWorkerPool {
  constructor(concurrency = os.cpus().length) {
    this.concurrency = concurrency;
    this.workers = [];
    this.queue = [];
  }

  async processDocuments(documents, workspace) {
    // Split into batches
    const batches = chunk(documents, this.concurrency);
    
    // Process batches in parallel
    return Promise.all(
      batches.map(batch => this.processBatch(batch, workspace))
    );
  }
}
```

**Changes:**
- Replace `for` loop with `Promise.all()` + worker threads
- Process 8-16 documents simultaneously (based on CPU cores)
- **Expected speedup: 8-16x**

#### B. **Parallel Embedding with Batch API**
```javascript
// Batch embed multiple documents at once
const embedBatch = async (textChunks, batchSize = 100) => {
  const batches = chunk(textChunks, batchSize);
  return Promise.all(
    batches.map(batch => EmbedderEngine.embedChunks(batch))
  );
};
```

**Changes:**
- Batch embed 100 chunks at a time
- Use Gemini batch API (if available)
- Implement retry logic for rate limits
- **Expected speedup: 5-10x**

---

### **Phase 2: Multi-Collector Architecture** (5x speedup)

#### A. **Horizontal Scaling**
```bash
# Run multiple collector instances
PORT=8888 node collector/index.js &
PORT=8889 node collector/index.js &
PORT=8890 node collector/index.js &
PORT=8891 node collector/index.js &
```

#### B. **Load Balancer**
```javascript
// NEW: /server/utils/collectorPool.js
class CollectorPool {
  constructor() {
    this.collectors = [
      'http://localhost:8888',
      'http://localhost:8889',
      'http://localhost:8890',
      'http://localhost:8891',
    ];
    this.currentIndex = 0;
  }

  getNextCollector() {
    const collector = this.collectors[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.collectors.length;
    return collector;
  }
}
```

**Expected speedup: 4x (4 collectors)**

---

### **Phase 3: Optimized PDF Processing** (3x speedup)

#### A. **Parallel Page Parsing**
```javascript
// NEW: Parse all pages in parallel
const docs = await pdfLoader.load();
const pageContents = await Promise.all(
  docs.map(async (doc) => {
    return doc.pageContent;
  })
);
```

#### B. **Streaming PDF Processing**
```javascript
// Process PDF as stream instead of loading entire file
const pdfStream = fs.createReadStream(fullFilePath);
const parser = new StreamingPDFParser();
```

**Expected speedup: 2-3x**

---

### **Phase 4: Database Optimizations** (2x speedup)

#### A. **Bulk Insert Optimization**
```javascript
// Instead of individual inserts
await prisma.workspace_documents.createMany({
  data: newDocs,  // Array of 100+ documents
  skipDuplicates: true,
});
```

#### B. **Qdrant Batch Optimization**
```javascript
// Increase batch size
for (const chunk of toChunks(vectors, 2000)) {  // Was 500
  chunks.push(chunk);
}
```

#### C. **Connection Pooling**
```javascript
// Increase PostgreSQL pool size
DATABASE_URL="postgresql://user:pass@localhost:5432/db?pool_timeout=0&connection_limit=50"
```

**Expected speedup: 2x**

---

### **Phase 5: Caching & Pre-processing** (Varies)

#### A. **Pre-compute Embeddings**
```javascript
// Cache embeddings for reuse
const cacheKey = `embed_${hash(text)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

#### B. **Skip Already Processed**
```javascript
// Check if document already exists
const existing = await prisma.workspace_documents.findUnique({
  where: { docId }
});
if (existing) return { skipped: true };
```

---

## 📊 **Expected Performance**

### Current Performance (Sequential):
- **1 PDF:** ~5-10 seconds (parsing + embedding + storage)
- **50K PDFs:** ~250,000 - 500,000 seconds = **69-139 hours** ⏰

### Optimized Performance (Parallel):
| Optimization | Speedup | Time for 50K |
|--------------|---------|--------------|
| Baseline | 1x | 69-139 hours |
| + Parallel Processing (16 workers) | 16x | 4.3-8.7 hours |
| + Multi-Collector (4 instances) | 4x | 1.1-2.2 hours |
| + Batch Embeddings | 2x | 0.5-1.1 hours |
| + DB Optimizations | 2x | **15-33 minutes** ⚡ |

**Final: 50K PDFs in ~30 minutes to 1 hour**

---

## 🛠️ **Implementation Priority**

### **Quick Wins (Implement First):**
1. ✅ **Parallel Document Processing** - Replace `for` loop with `Promise.all()`
2. ✅ **Batch Embeddings** - Process 100 chunks at once
3. ✅ **Bulk Database Inserts** - Use `createMany()`

### **Medium Effort:**
4. ⚙️ **Multi-Collector Setup** - Run 4 collector instances
5. ⚙️ **Parallel PDF Parsing** - Parse pages concurrently
6. ⚙️ **Connection Pool Tuning** - Increase limits

### **Advanced (Optional):**
7. 🔧 **Worker Threads** - CPU-intensive tasks
8. 🔧 **Redis Caching** - Cache embeddings
9. 🔧 **Streaming Processing** - Memory optimization

---

## 🚨 **Constraints & Considerations**

### **API Rate Limits:**
- **Gemini Embeddings:** 1,500 requests/minute (free tier)
- **Solution:** Implement exponential backoff + retry logic
- **Alternative:** Use local embedding model (faster, no limits)

### **Memory Usage:**
- **Current:** ~200MB per PDF in memory
- **50K PDFs:** Would need 10TB RAM (impossible)
- **Solution:** Process in batches of 100-500 at a time

### **Qdrant Performance:**
- **Current:** ~12K vectors, fast
- **50K PDFs:** ~6M vectors (50K × 120 chunks avg)
- **Solution:** Qdrant can handle 10M+ vectors efficiently

### **Disk Space:**
- **PDFs:** 50K × 2MB avg = 100GB
- **Vectors:** 6M × 3KB = 18GB
- **Total:** ~120GB needed

---

## 📝 **Implementation Checklist**

### Phase 1 (Day 1):
- [ ] Replace sequential `for` loop with `Promise.all()`
- [ ] Implement batch processing (100 docs at a time)
- [ ] Add progress tracking & logging
- [ ] Test with 100 PDFs

### Phase 2 (Day 2):
- [ ] Implement worker pool for parallel processing
- [ ] Add retry logic for API rate limits
- [ ] Optimize batch embedding
- [ ] Test with 1,000 PDFs

### Phase 3 (Day 3):
- [ ] Set up multi-collector instances
- [ ] Implement load balancer
- [ ] Optimize database bulk inserts
- [ ] Test with 10,000 PDFs

### Phase 4 (Day 4):
- [ ] Full system test with 50K PDFs
- [ ] Monitor performance metrics
- [ ] Tune parameters
- [ ] Document final configuration

---

## 🎯 **Recommended Approach**

**For 50K PDFs, I recommend:**

1. **Start with Phase 1** (parallel processing) - Easy, 10x speedup
2. **Add Phase 2** (multi-collector) if needed - 4x additional speedup
3. **Monitor and tune** - Adjust batch sizes based on performance

**Total implementation time: 2-3 days**
**Expected result: 50K PDFs processed in 30-60 minutes**

---

## 📞 **Next Steps**

Would you like me to:
1. ✅ Implement Phase 1 (parallel processing) now?
2. ⚙️ Create a batch upload script for 50K PDFs?
3. 📊 Set up monitoring and progress tracking?
4. 🔧 All of the above?
