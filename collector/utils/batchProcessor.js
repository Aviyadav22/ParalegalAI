const { v4: uuidv4 } = require("uuid");
const { writeToServerDocuments } = require("./files");
const { tokenizeString } = require("./tokenizer");

/**
 * Batch Processor for Multi-Instance ChromaDB
 * Handles batch uploads with round-robin distribution
 */
class BatchProcessor {
  constructor() {
    this.batchSize = parseInt(process.env.CHROMA_BATCH_SIZE) || 10;
    this.maxConcurrentBatches = parseInt(process.env.CHROMA_MAX_CONCURRENT_BATCHES) || 3;
    this.currentNodeIndex = 0;
    this.totalNodes = parseInt(process.env.CHROMA_NODE_COUNT) || 3;
    this.batchQueue = [];
    this.processingBatches = new Set();
  }

  /**
   * Get the next ChromaDB node for round-robin distribution
   */
  getNextNode() {
    const nodeId = this.currentNodeIndex;
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.totalNodes;
    return nodeId;
  }

  /**
   * Process a batch of documents
   */
  async processBatch(documents, options = {}) {
    const batchId = uuidv4();
    const targetNode = this.getNextNode();
    
    console.log(`🔄 Processing batch ${batchId} with ${documents.length} documents for Node ${targetNode + 1}`);
    
    const results = [];
    const errors = [];
    
    for (const doc of documents) {
      try {
        const processedDoc = await this.processDocument(doc, targetNode, options);
        results.push(processedDoc);
      } catch (error) {
        console.error(`❌ Error processing document in batch ${batchId}:`, error.message);
        errors.push({ document: doc, error: error.message });
      }
    }
    
    console.log(`✅ Batch ${batchId} completed: ${results.length} successful, ${errors.length} failed`);
    
    return {
      batchId,
      targetNode,
      results,
      errors,
      totalProcessed: results.length,
      totalFailed: errors.length
    };
  }

  /**
   * Process a single document with node assignment
   */
  async processDocument(doc, nodeId, options = {}) {
    const documentData = {
      id: doc.id || uuidv4(),
      url: doc.url || "",
      title: doc.title || "Untitled Document",
      docAuthor: doc.docAuthor || "Unknown",
      description: doc.description || "",
      docSource: doc.docSource || "Batch Upload",
      chunkSource: doc.chunkSource || doc.url || "",
      published: doc.published || new Date().toLocaleString(),
      wordCount: doc.pageContent ? doc.pageContent.split(" ").length : 0,
      pageContent: doc.pageContent || "",
      token_count_estimate: doc.pageContent ? tokenizeString(doc.pageContent) : 0,
      // Multi-instance specific metadata
      chromaNodeId: nodeId,
      batchProcessed: true,
      processedAt: new Date().toISOString(),
      ...options.metadata
    };

    const filename = this.generateFilename(doc, nodeId);
    
    const processedDoc = writeToServerDocuments({
      data: documentData,
      filename,
      options: {
        parseOnly: options.parseOnly || false
      }
    });

    console.log(`📝 Document processed for Node ${nodeId + 1}: ${filename}`);
    
    return {
      ...processedDoc,
      nodeId,
      originalDoc: doc
    };
  }

  /**
   * Generate filename with node information
   */
  generateFilename(doc, nodeId) {
    const baseName = doc.title ? 
      doc.title.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() :
      "document";
    
    const timestamp = new Date().toISOString().slice(0, 10);
    return `batch-node${nodeId + 1}-${baseName}-${timestamp}-${uuidv4().slice(0, 8)}`;
  }

  /**
   * Process multiple batches concurrently
   */
  async processMultipleBatches(documentBatches, options = {}) {
    const batchPromises = [];
    
    for (let i = 0; i < documentBatches.length; i += this.maxConcurrentBatches) {
      const batchGroup = documentBatches.slice(i, i + this.maxConcurrentBatches);
      
      const groupPromises = batchGroup.map(batch => 
        this.processBatch(batch, options)
      );
      
      batchPromises.push(...groupPromises);
    }
    
    const results = await Promise.allSettled(batchPromises);
    
    const successful = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failed = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    
    return {
      successful,
      failed,
      totalBatches: results.length,
      successfulBatches: successful.length,
      failedBatches: failed.length
    };
  }

  /**
   * Split documents into batches
   */
  splitIntoBatches(documents, batchSize = null) {
    const size = batchSize || this.batchSize;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += size) {
      batches.push(documents.slice(i, i + size));
    }
    
    return batches;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      batchSize: this.batchSize,
      maxConcurrentBatches: this.maxConcurrentBatches,
      totalNodes: this.totalNodes,
      currentNodeIndex: this.currentNodeIndex,
      queueLength: this.batchQueue.length,
      processingBatches: this.processingBatches.size
    };
  }
}

module.exports = { BatchProcessor };
