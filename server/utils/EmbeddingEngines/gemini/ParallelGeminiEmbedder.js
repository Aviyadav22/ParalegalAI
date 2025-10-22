/**
 * Parallel Gemini Embedder with API Key Rotation
 * Optimized for high-throughput batch embedding
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getApiKeyRotator } = require("../../ApiKeyRotator");

// Simple concurrency limiter
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

class ParallelGeminiEmbedder {
  constructor() {
    this.model = "text-embedding-004";
    this.maxBatchSize = 100; // Gemini supports up to 100 texts per request
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.concurrentRequests = 10; // Process 10 batches concurrently
    this.limiter = new ConcurrencyLimiter(this.concurrentRequests);
    
    // API key rotation
    this.keyRotator = getApiKeyRotator();
    
    // Statistics
    this.stats = {
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      totalRequests: 0,
      rateLimitHits: 0,
    };

    console.log(`[ParallelGeminiEmbedder] Initialized with ${this.keyRotator.apiKeys.length} API key(s)`);
    console.log(`[ParallelGeminiEmbedder] Max batch size: ${this.maxBatchSize}, Concurrent requests: ${this.concurrentRequests}`);
  }

  /**
   * Embed multiple chunks in parallel with batching
   */
  async embedChunks(textChunks) {
    if (!textChunks || textChunks.length === 0) {
      return [];
    }

    this.stats.totalChunks += textChunks.length;
    console.log(`[ParallelGeminiEmbedder] Embedding ${textChunks.length} chunks...`);

    // Split into batches
    const batches = this.chunkArray(textChunks, this.maxBatchSize);
    console.log(`[ParallelGeminiEmbedder] Split into ${batches.length} batches`);

    try {
      // Process all batches in parallel with concurrency limit
      const batchResults = await Promise.all(
        batches.map((batch, index) => 
          this.limiter.run(() => this.embedBatch(batch, index))
        )
      );

      // Flatten results
      const allEmbeddings = batchResults.flat();
      
      this.stats.successfulChunks += allEmbeddings.length;
      this.stats.failedChunks += textChunks.length - allEmbeddings.length;

      console.log(`[ParallelGeminiEmbedder] Successfully embedded ${allEmbeddings.length}/${textChunks.length} chunks`);
      
      return allEmbeddings;

    } catch (error) {
      console.error(`[ParallelGeminiEmbedder] Fatal error:`, error.message);
      throw error;
    }
  }

  /**
   * Embed a single batch with retry logic
   */
  async embedBatch(textBatch, batchIndex, attempt = 1) {
    const apiKey = this.keyRotator.getNextKey();
    
    try {
      this.stats.totalRequests++;
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });

      // Batch embed request
      const result = await model.batchEmbedContents({
        requests: textBatch.map(text => ({
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
        })),
      });

      // Extract embeddings
      const embeddings = result.embeddings.map(e => e.values);
      
      // Mark key as successful
      this.keyRotator.markSuccess(apiKey);
      
      return embeddings;

    } catch (error) {
      console.error(`[ParallelGeminiEmbedder] Batch ${batchIndex} error (attempt ${attempt}):`, error.message);

      // Handle rate limiting
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
        this.stats.rateLimitHits++;
        this.keyRotator.markRateLimited(apiKey, 60000); // 1 minute cooldown
        console.warn(`[ParallelGeminiEmbedder] Rate limit hit. Available keys: ${this.keyRotator.getAvailableKeyCount()}`);
      } else {
        this.keyRotator.markFailed(apiKey);
      }

      // Retry logic
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[ParallelGeminiEmbedder] Retrying batch ${batchIndex} in ${delay}ms...`);
        await this.sleep(delay);
        return this.embedBatch(textBatch, batchIndex, attempt + 1);
      }

      // If all retries failed, try individual embedding as last resort
      console.warn(`[ParallelGeminiEmbedder] Batch ${batchIndex} failed after ${this.maxRetries} attempts. Trying individual embeddings...`);
      return this.embedIndividually(textBatch);
    }
  }

  /**
   * Fallback: Embed texts individually
   */
  async embedIndividually(textBatch) {
    const embeddings = [];
    
    for (const text of textBatch) {
      try {
        const apiKey = this.keyRotator.getNextKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: this.model });

        const result = await model.embedContent({
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
        });

        embeddings.push(result.embedding.values);
        this.keyRotator.markSuccess(apiKey);
        
        // Small delay to avoid rate limits
        await this.sleep(100);

      } catch (error) {
        console.error(`[ParallelGeminiEmbedder] Individual embedding failed:`, error.message);
        // Return null for failed embeddings
        embeddings.push(null);
      }
    }

    return embeddings.filter(e => e !== null);
  }

  /**
   * Embed a single text (for compatibility)
   */
  async embedTextInput(textInput) {
    const apiKey = this.keyRotator.getNextKey();
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });

      const result = await model.embedContent({
        content: { parts: [{ text: textInput }] },
        taskType: "RETRIEVAL_QUERY",
      });

      this.keyRotator.markSuccess(apiKey);
      return result.embedding.values;

    } catch (error) {
      console.error(`[ParallelGeminiEmbedder] Single embed error:`, error.message);
      
      if (error.message && error.message.includes('429')) {
        this.keyRotator.markRateLimited(apiKey);
      }
      
      throw error;
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
   * Utility: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      keyStats: this.keyRotator.getStats(),
    };
  }

  /**
   * Print statistics
   */
  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('[ParallelGeminiEmbedder] STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Chunks:        ${this.stats.totalChunks}`);
    console.log(`✅ Successful:       ${this.stats.successfulChunks}`);
    console.log(`❌ Failed:           ${this.stats.failedChunks}`);
    console.log(`📊 Total Requests:   ${this.stats.totalRequests}`);
    console.log(`⚠️  Rate Limit Hits:  ${this.stats.rateLimitHits}`);
    console.log(`🔑 Available Keys:   ${this.keyRotator.getAvailableKeyCount()}/${this.keyRotator.apiKeys.length}`);
    console.log('='.repeat(60) + '\n');
  }
}

module.exports = { ParallelGeminiEmbedder };
