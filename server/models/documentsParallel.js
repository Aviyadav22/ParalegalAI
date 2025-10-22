/**
 * Documents Model - Parallel Processing Version
 * Optimized for high-throughput batch processing
 */

const { v4: uuidv4 } = require("uuid");
const { getVectorDbClass } = require("../utils/helpers");
const prisma = require("../utils/prisma");
const { Telemetry } = require("./telemetry");
const { EventLogs } = require("./eventLogs");
const { safeJsonParse } = require("../utils/http");
const { getModelTag } = require("../endpoints/utils");
const { ParallelDocumentProcessor } = require("../utils/ParallelDocumentProcessor");

// Import base Document model
const BaseDocument = require("./documents");

const DocumentParallel = {
  ...BaseDocument,

  /**
   * Add documents in parallel with batching
   * Optimized version of addDocuments()
   */
  addDocumentsParallel: async function (workspace, additions = [], userId = null) {
    if (additions.length === 0) return { failedToEmbed: [], embedded: [], errors: new Set() };

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[DocumentParallel] Starting parallel processing of ${additions.length} documents`);
    console.log(`${'='.repeat(70)}\n`);

    // Initialize parallel processor
    const processor = new ParallelDocumentProcessor({
      concurrency: 8,        // 2x CPU cores (4 vCPU)
      batchSize: 100,        // Process 100 docs per batch
      dbBatchSize: 50,       // Insert 50 docs at once
      retryAttempts: 3,
      retryDelay: 1000,
    });

    // Process documents in parallel
    const results = await processor.processDocuments(workspace, additions, userId);

    // Log telemetry
    await Telemetry.sendTelemetry("documents_embedded_in_workspace", {
      LLMSelection: process.env.LLM_PROVIDER || "openai",
      Embedder: process.env.EMBEDDING_ENGINE || "inherit",
      VectorDbSelection: process.env.VECTOR_DB || "qdrant",
      TTSSelection: process.env.TTS_PROVIDER || "native",
      EmbeddedCount: results.embedded.length,
      FailedCount: results.failedToEmbed.length,
      ProcessingMode: "parallel",
    });

    // Log event
    await EventLogs.logEvent(
      "documents_embedded",
      {
        workspaceName: workspace?.name || "Unknown Workspace",
        numberOfDocuments: results.embedded.length,
        failedDocuments: results.failedToEmbed.length,
        processingMode: "parallel",
      },
      userId
    );

    return {
      failedToEmbed: results.failedToEmbed,
      embedded: results.embedded,
      errors: results.errors,
    };
  },

  /**
   * Wrapper to choose between parallel and sequential processing
   */
  addDocuments: async function (workspace, additions = [], userId = null) {
    // Use parallel processing for large batches
    const useParallel = additions.length >= 10;
    
    if (useParallel) {
      console.log(`[Documents] Using PARALLEL processing for ${additions.length} documents`);
      return this.addDocumentsParallel(workspace, additions, userId);
    } else {
      console.log(`[Documents] Using SEQUENTIAL processing for ${additions.length} documents`);
      return BaseDocument.addDocuments(workspace, additions, userId);
    }
  },
};

module.exports = DocumentParallel;
