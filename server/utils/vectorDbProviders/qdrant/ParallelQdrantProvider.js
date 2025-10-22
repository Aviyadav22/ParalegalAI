/**
 * Parallel Qdrant Provider
 * Optimized version with parallel embedding and batching
 */

const { QdrantClient } = require("@qdrant/js-client-rest");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { v4: uuidv4 } = require("uuid");
const { storeVectorResult, cachedVectorInformation } = require("../../files/documentProcessor");
const { toChunks } = require("../../helpers");
const { TextSplitter } = require("../../TextSplitter");
const { SystemSettings } = require("../../../models/systemSettings");
const { ParallelGeminiEmbedder } = require("../../EmbeddingEngines/gemini/ParallelGeminiEmbedder");

// Import base Qdrant provider
const BaseQdrant = require("./index");

const ParallelQdrant = {
  ...BaseQdrant,

  /**
   * Add document with parallel embedding
   * Overrides base addDocumentToNamespace
   */
  addDocumentToNamespace: async function (
    namespace,
    documentData = {},
    fullFilePath = null,
    skipCache = false
  ) {
    const { DocumentVectors } = require("../../../models/vectors");
    
    try {
      let vectorDimension = null;
      const { pageContent, docId, ...metadata } = documentData;
      if (!pageContent || pageContent.length == 0) return { vectorized: false, error: "No content" };

      console.log(`[ParallelQdrant] Adding document to namespace: ${namespace}`);
      
      // Check cache first
      if (!skipCache) {
        const cacheResult = await cachedVectorInformation(fullFilePath);
        if (cacheResult.exists) {
          return this.processCachedVectors(namespace, docId, cacheResult);
        }
      }

      // Use parallel embedder
      const embedder = new ParallelGeminiEmbedder();
      
      // Text splitting
      const textSplitter = new TextSplitter({
        chunkSize: TextSplitter.determineMaxChunkSize(
          await SystemSettings.getValueOrFallback({
            label: "text_splitter_chunk_size",
          }),
          embedder.maxBatchSize
        ),
        chunkOverlap: await SystemSettings.getValueOrFallback(
          { label: "text_splitter_chunk_overlap" },
          20
        ),
        chunkHeaderMeta: TextSplitter.buildHeaderMeta(metadata),
      });
      
      const textChunks = await textSplitter.splitText(pageContent);
      console.log(`[ParallelQdrant] Created ${textChunks.length} chunks`);

      // PARALLEL EMBEDDING
      const startTime = Date.now();
      const vectorValues = await embedder.embedChunks(textChunks);
      const embeddingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`[ParallelQdrant] Embedded ${vectorValues.length} chunks in ${embeddingTime}s`);
      embedder.printStats();

      if (!vectorValues || vectorValues.length === 0) {
        throw new Error("Could not embed document chunks!");
      }

      // Prepare vectors for Qdrant
      const documentVectors = [];
      const submission = {
        ids: [],
        vectors: [],
        payloads: [],
      };

      for (const [i, vector] of vectorValues.entries()) {
        if (!vectorDimension) vectorDimension = vector.length;
        
        const vectorRecord = {
          id: uuidv4(),
          vector: vector,
          payload: { ...metadata, text: textChunks[i] },
        };

        submission.ids.push(vectorRecord.id);
        submission.vectors.push(vectorRecord.vector);
        submission.payloads.push(vectorRecord.payload);
        documentVectors.push({ docId, vectorId: vectorRecord.id });
      }

      // Insert into Qdrant
      const { client } = await this.connect();
      const collection = await this.getOrCreateCollection(
        client,
        namespace,
        vectorDimension
      );
      
      if (!collection) {
        throw new Error("Failed to create Qdrant collection!");
      }

      console.log(`[ParallelQdrant] Inserting ${submission.ids.length} vectors into Qdrant...`);
      
      const additionResult = await client.upsert(namespace, {
        wait: true,
        batch: submission,
      });

      if (additionResult?.status !== "completed") {
        throw new Error("Error embedding into Qdrant: " + JSON.stringify(additionResult));
      }

      // Cache vectors
      const chunks = [];
      for (const chunk of toChunks(submission.ids.map((id, i) => ({
        id,
        vector: submission.vectors[i],
        payload: submission.payloads[i],
      })), 500)) {
        chunks.push(chunk);
      }
      await storeVectorResult(chunks, fullFilePath);

      // Bulk insert to PostgreSQL
      await DocumentVectors.bulkInsert(documentVectors);

      console.log(`[ParallelQdrant] ✅ Successfully added document to namespace`);
      
      return { vectorized: true, error: null };

    } catch (e) {
      console.error("[ParallelQdrant] Error:", e.message);
      return { vectorized: false, error: e.message };
    }
  },

  /**
   * Process cached vectors (from base implementation)
   */
  processCachedVectors: async function(namespace, docId, cacheResult) {
    const { DocumentVectors } = require("../../../models/vectors");
    const { client } = await this.connect();
    const { chunks } = cacheResult;
    
    const vectorDimension = chunks[0][0]?.vector?.length ?? chunks[0][0]?.values?.length ?? null;
    const collection = await this.getOrCreateCollection(client, namespace, vectorDimension);
    
    if (!collection) {
      throw new Error("Failed to create Qdrant collection!");
    }

    const documentVectors = [];
    
    for (const chunk of chunks) {
      const submission = { ids: [], vectors: [], payloads: [] };
      
      chunk.forEach((chunk) => {
        const id = uuidv4();
        if (chunk?.payload?.hasOwnProperty("id")) {
          const { id: _id, ...payload } = chunk.payload;
          documentVectors.push({ docId, vectorId: id });
          submission.ids.push(id);
          submission.vectors.push(chunk.vector);
          submission.payloads.push(payload);
        }
      });

      const additionResult = await client.upsert(namespace, {
        wait: true,
        batch: submission,
      });
      
      if (additionResult?.status !== "completed") {
        throw new Error("Error embedding cached vectors into Qdrant");
      }
    }

    await DocumentVectors.bulkInsert(documentVectors);
    return { vectorized: true, error: null };
  },
};

module.exports = ParallelQdrant;
