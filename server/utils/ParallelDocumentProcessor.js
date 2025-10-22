/**
 * Parallel Document Processor
 * Processes multiple documents concurrently with intelligent batching
 * Optimized for 4 vCPU + 32GB RAM
 */

const { getVectorDbClass } = require("./helpers");
const { fileData } = require("./files");
const prisma = require("./prisma");
const { v4: uuidv4 } = require("uuid");

// p-limit might not be installed, use simple concurrency control
class ConcurrencyLimiter {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    while (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

class ParallelDocumentProcessor {
  constructor(options = {}) {
    // Optimized for 4 vCPU system
    this.concurrency = options.concurrency || 8; // 2x CPU cores
    this.batchSize = options.batchSize || 100; // Process 100 docs per batch
    this.dbBatchSize = options.dbBatchSize || 50; // Insert 50 docs at once
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Rate limiting for API calls
    this.limiter = new ConcurrencyLimiter(this.concurrency);
    
    // Statistics
    this.stats = {
      total: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
    };

    console.log(`[ParallelProcessor] Initialized with concurrency: ${this.concurrency}`);
  }

  /**
   * Process documents in parallel with batching
   */
  async processDocuments(workspace, documentPaths, userId = null) {
    this.stats.total = documentPaths.length;
    this.stats.startTime = Date.now();
    this.stats.processed = 0;
    this.stats.failed = 0;
    this.stats.skipped = 0;

    console.log(`[ParallelProcessor] Processing ${documentPaths.length} documents...`);
    console.log(`[ParallelProcessor] Concurrency: ${this.concurrency}, Batch size: ${this.batchSize}`);

    const VectorDb = getVectorDbClass();
    const results = {
      embedded: [],
      failedToEmbed: [],
      errors: new Set(),
    };

    // Split into batches to avoid memory overflow
    const batches = this.chunkArray(documentPaths, this.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n[ParallelProcessor] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} documents)`);

      try {
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(path => 
            this.limiter.run(() => this.processSingleDocument(workspace, path, VectorDb))
          )
        );

        // Separate successful and failed results
        const successfulDocs = [];
        const failedDocs = [];

        batchResults.forEach((result, index) => {
          if (result.success) {
            successfulDocs.push(result);
            results.embedded.push(batch[index]);
            this.stats.processed++;
          } else {
            failedDocs.push(result);
            results.failedToEmbed.push(result.filename);
            results.errors.add(result.error);
            this.stats.failed++;
          }
        });

        // Bulk insert successful documents to database
        if (successfulDocs.length > 0) {
          await this.bulkInsertDocuments(successfulDocs);
        }

        // Progress update
        const progress = ((batchIndex + 1) / batches.length * 100).toFixed(1);
        const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
        const rate = (this.stats.processed / elapsed).toFixed(1);
        
        console.log(`[ParallelProcessor] Progress: ${progress}% | Processed: ${this.stats.processed} | Failed: ${this.stats.failed} | Rate: ${rate} docs/sec`);

      } catch (batchError) {
        console.error(`[ParallelProcessor] Batch ${batchIndex + 1} error:`, batchError.message);
        results.errors.add(batchError.message);
      }

      // Small delay between batches to avoid overwhelming the system
      if (batchIndex < batches.length - 1) {
        await this.sleep(100);
      }
    }

    this.stats.endTime = Date.now();
    this.printFinalStats();

    return results;
  }

  /**
   * Process a single document with retry logic
   */
  async processSingleDocument(workspace, path, VectorDb, attempt = 1) {
    try {
      // Load document data
      const data = await fileData(path);
      if (!data) {
        return {
          success: false,
          filename: path,
          error: 'Failed to load document data',
        };
      }

      const docId = uuidv4();
      const { pageContent, ...metadata } = data;

      // Vectorize document
      const { vectorized, error } = await VectorDb.addDocumentToNamespace(
        workspace.slug,
        { ...data, docId },
        path
      );

      if (!vectorized) {
        // Retry logic for transient failures
        if (attempt < this.retryAttempts) {
          console.log(`[ParallelProcessor] Retry ${attempt}/${this.retryAttempts} for ${path}`);
          await this.sleep(this.retryDelay * attempt);
          return this.processSingleDocument(workspace, path, VectorDb, attempt + 1);
        }

        return {
          success: false,
          filename: metadata?.title || path.split("/")[1],
          error: error || 'Vectorization failed',
        };
      }

      // Return document data for bulk insert
      return {
        success: true,
        docId,
        filename: path.split("/")[1],
        docpath: path,
        workspaceId: workspace.id,
        metadata: JSON.stringify(metadata),
      };

    } catch (error) {
      console.error(`[ParallelProcessor] Error processing ${path}:`, error.message);
      
      // Retry on error
      if (attempt < this.retryAttempts) {
        await this.sleep(this.retryDelay * attempt);
        return this.processSingleDocument(workspace, path, VectorDb, attempt + 1);
      }

      return {
        success: false,
        filename: path,
        error: error.message,
      };
    }
  }

  /**
   * Bulk insert documents to database
   */
  async bulkInsertDocuments(documents) {
    try {
      // Split into smaller chunks for database
      const chunks = this.chunkArray(documents, this.dbBatchSize);
      
      for (const chunk of chunks) {
        const docsToInsert = chunk.map(doc => ({
          docId: doc.docId,
          filename: doc.filename,
          docpath: doc.docpath,
          workspaceId: doc.workspaceId,
          metadata: doc.metadata,
        }));

        await prisma.workspace_documents.createMany({
          data: docsToInsert,
          skipDuplicates: true,
        });
      }

      console.log(`[ParallelProcessor] Bulk inserted ${documents.length} documents to database`);
    } catch (error) {
      console.error(`[ParallelProcessor] Bulk insert error:`, error.message);
      
      // Fallback to individual inserts
      console.log(`[ParallelProcessor] Falling back to individual inserts...`);
      for (const doc of documents) {
        try {
          await prisma.workspace_documents.create({
            data: {
              docId: doc.docId,
              filename: doc.filename,
              docpath: doc.docpath,
              workspaceId: doc.workspaceId,
              metadata: doc.metadata,
            },
          });
        } catch (individualError) {
          console.error(`[ParallelProcessor] Failed to insert ${doc.filename}:`, individualError.message);
        }
      }
    }
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print final statistics
   */
  printFinalStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const rate = (this.stats.processed / duration).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('[ParallelProcessor] FINAL STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Documents:     ${this.stats.total}`);
    console.log(`✅ Processed:        ${this.stats.processed}`);
    console.log(`❌ Failed:           ${this.stats.failed}`);
    console.log(`⏭️  Skipped:          ${this.stats.skipped}`);
    console.log(`⏱️  Duration:         ${duration.toFixed(1)}s`);
    console.log(`📊 Rate:             ${rate} docs/sec`);
    console.log(`💾 Success Rate:     ${((this.stats.processed / this.stats.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = { ParallelDocumentProcessor };
