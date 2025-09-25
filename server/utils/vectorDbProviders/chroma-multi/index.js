const { ChromaClient } = require("chromadb");
const { TextSplitter } = require("../../TextSplitter");
const { SystemSettings } = require("../../../models/systemSettings");
const { storeVectorResult, cachedVectorInformation } = require("../../files");
const { v4: uuidv4 } = require("uuid");
const { toChunks, getEmbeddingEngineSelection } = require("../../helpers");
const { parseAuthHeader } = require("../../http");
const { sourceIdentifier } = require("../../chats");

class MultiChromaManager {
  constructor() {
    this.clients = [];
    this.currentIndex = 0;
    this.strategy = process.env.CHROMA_STRATEGY || 'round-robin';
    this.endpoints = process.env.CHROMA_ENDPOINTS?.split(',') || [];
    this.loadBalancer = process.env.CHROMA_LOAD_BALANCER;
    this.healthyClients = new Set();
    this.initialized = false;
    this.initializationPromise = this.initializeClients();
  }

  async initializeClients() {
    console.log(`🚀 Initializing ${this.endpoints.length} ChromaDB instances...`);
    
    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        const client = new ChromaClient({
          path: this.endpoints[i].trim(),
          ...(!!process.env.CHROMA_API_HEADER && !!process.env.CHROMA_API_KEY
            ? {
                fetchOptions: {
                  headers: parseAuthHeader(
                    process.env.CHROMA_API_HEADER || "X-Api-Key",
                    process.env.CHROMA_API_KEY
                  ),
                },
              }
            : {}),
        });

        // Test connection
        const isAlive = await client.heartbeat();
        if (isAlive) {
          this.clients.push({
            client,
            endpoint: this.endpoints[i].trim(),
            index: i,
            healthy: true
          });
          this.healthyClients.add(i);
          console.log(`✅ ChromaDB Node ${i + 1} connected: ${this.endpoints[i]}`);
        } else {
          console.log(`❌ ChromaDB Node ${i + 1} failed heartbeat: ${this.endpoints[i]}`);
        }
      } catch (error) {
        console.error(`❌ Failed to connect to ChromaDB Node ${i + 1}:`, error.message);
      }
    }

    if (this.clients.length === 0) {
      throw new Error("No healthy ChromaDB instances found!");
    }

    this.initialized = true;
    console.log(`🎯 Multi-ChromaDB initialized with ${this.clients.length} healthy nodes`);
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializationPromise;
    }
  }

  getNextClient() {
    if (!this.initialized || this.clients.length === 0) {
      throw new Error("No ChromaDB clients available");
    }

    switch (this.strategy) {
      case 'round-robin':
        const client = this.clients[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.clients.length;
        return client;
      
      case 'random':
        return this.clients[Math.floor(Math.random() * this.clients.length)];
      
      case 'least-connections':
        // For now, fallback to round-robin
        return this.getNextClient();
      
      default:
        return this.clients[0];
    }
  }

  async executeOnAllClients(operation) {
    const results = await Promise.allSettled(
      this.clients.map(async (clientWrapper) => {
        try {
          return await operation(clientWrapper.client);
        } catch (error) {
          console.error(`Error on ChromaDB Node ${clientWrapper.index}:`, error.message);
          return null;
        }
      })
    );

    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
  }

  async executeOnSingleClient(operation) {
    const clientWrapper = this.getNextClient();
    try {
      return await operation(clientWrapper.client);
    } catch (error) {
      console.error(`Error on ChromaDB Node ${clientWrapper.index}:`, error.message);
      // Try next client
      const nextClient = this.getNextClient();
      return await operation(nextClient.client);
    }
  }
}

const multiChromaManager = new MultiChromaManager();

const COLLECTION_REGEX = new RegExp(
  /^(?!\d+\.\d+\.\d+\.\d+$)(?!.*\.\.)(?=^[a-zA-Z0-9][a-zA-Z0-9_-]{1,61}[a-zA-Z0-9]$).{3,63}$/
);

const MultiChroma = {
  name: "MultiChroma",
  
  normalize: function (inputString) {
    if (COLLECTION_REGEX.test(inputString)) return inputString;
    let normalized = inputString.replace(/[^a-zA-Z0-9_-]/g, "-");
    normalized = normalized.replace(/\.\.+/g, ".");
    
    if (normalized[0] && !/^[a-zA-Z0-9]$/.test(normalized[0])) {
      normalized = "anythingllm-" + normalized.slice(1);
    }
    
    if (normalized[normalized.length - 1] && !/^[a-zA-Z0-9]$/.test(normalized[normalized.length - 1])) {
      normalized = normalized.slice(0, -1);
    }
    
    if (normalized.length < 3) {
      normalized = `anythingllm-${normalized}`;
    } else if (normalized.length > 63) {
      normalized = this.normalize(normalized.slice(0, 63));
    }
    
    if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
      normalized = "-" + normalized.slice(1);
    }
    
    return normalized;
  },

  connect: async function () {
    if (process.env.VECTOR_DB !== "chroma-multi")
      throw new Error("MultiChroma::Invalid ENV settings");
    
    return { client: multiChromaManager };
  },

  heartbeat: async function () {
    const { client } = await this.connect();
    
    // Ensure clients are initialized
    await client.ensureInitialized();
    
    const results = await client.executeOnAllClients(async (chromaClient) => {
      return await chromaClient.heartbeat();
    });
    
    return { 
      heartbeat: results.length > 0,
      healthyNodes: results.length,
      totalNodes: multiChromaManager.clients.length
    };
  },

  totalVectors: async function () {
    const { client } = await this.connect();
    const results = await client.executeOnAllClients(async (chromaClient) => {
      const collections = await chromaClient.listCollections();
      let totalVectors = 0;
      
      for (const collectionObj of collections) {
        const collection = await chromaClient
          .getCollection({ name: collectionObj.name })
          .catch(() => null);
        if (!collection) continue;
        totalVectors += await collection.count();
      }
      
      return totalVectors;
    });
    
    return results.reduce((sum, count) => sum + count, 0);
  },

  distanceToSimilarity: function (distance = null) {
    if (distance === null || typeof distance !== "number") return 0.0;
    if (distance >= 1.0) return 1;
    if (distance < 0) return 1 - Math.abs(distance);
    return 1 - distance;
  },

  namespaceCount: async function (_namespace = null) {
    const { client } = await this.connect();
    const results = await client.executeOnAllClients(async (chromaClient) => {
      const collection = await chromaClient
        .getCollection({ name: this.normalize(_namespace) })
        .catch(() => null);
      return collection ? await collection.count() : 0;
    });
    
    return results.reduce((sum, count) => sum + count, 0);
  },

  // 🔍 DISTRIBUTED SIMILARITY SEARCH
  similarityResponse: async function ({
    namespace,
    queryVector,
    similarityThreshold = 0.25,
    topN = 4,
    filterIdentifiers = [],
  }) {
    const { client } = await this.connect();
    
    // Search across all nodes in parallel
    const searchResults = await client.executeOnAllClients(async (chromaClient) => {
      try {
        const collection = await chromaClient.getCollection({
          name: this.normalize(namespace),
        });
        
        const response = await collection.query({
          queryEmbeddings: queryVector,
          nResults: topN * 2, // Get more results from each node
        });
        
        const nodeResults = {
          contextTexts: [],
          sourceDocuments: [],
          scores: [],
        };
        
        if (response.ids && response.ids[0]) {
          response.ids[0].forEach((_, i) => {
            const similarity = this.distanceToSimilarity(response.distances[0][i]);
            if (similarity < similarityThreshold) return;
            
            if (filterIdentifiers.includes(sourceIdentifier(response.metadatas[0][i]))) {
              console.log("MultiChroma: A source was filtered from context as it's parent document is pinned.");
              return;
            }
            
            nodeResults.contextTexts.push(response.documents[0][i]);
            nodeResults.sourceDocuments.push(response.metadatas[0][i]);
            nodeResults.scores.push(similarity);
          });
        }
        
        return nodeResults;
      } catch (error) {
        console.error("Error in distributed search:", error.message);
        return { contextTexts: [], sourceDocuments: [], scores: [] };
      }
    });
    
    // Combine and sort results from all nodes
    const combinedResults = {
      contextTexts: [],
      sourceDocuments: [],
      scores: [],
    };
    
    // Merge all results
    searchResults.forEach(nodeResult => {
      combinedResults.contextTexts.push(...nodeResult.contextTexts);
      combinedResults.sourceDocuments.push(...nodeResult.sourceDocuments);
      combinedResults.scores.push(...nodeResult.scores);
    });
    
    // Sort by similarity score (descending)
    const sortedIndices = combinedResults.scores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);
    
    // Take top N results
    const topResults = {
      contextTexts: [],
      sourceDocuments: [],
      scores: [],
    };
    
    for (let i = 0; i < Math.min(topN, sortedIndices.length); i++) {
      const idx = sortedIndices[i];
      topResults.contextTexts.push(combinedResults.contextTexts[idx]);
      topResults.sourceDocuments.push(combinedResults.sourceDocuments[idx]);
      topResults.scores.push(combinedResults.scores[idx]);
    }
    
    console.log(`🔍 Multi-ChromaDB search: Found ${topResults.contextTexts.length} results from ${searchResults.length} nodes`);
    
    return topResults;
  },

  // 📝 DISTRIBUTED DOCUMENT ADDITION
  addDocumentToNamespace: async function (namespace, document, metadata = {}) {
    const { client } = await this.connect();
    
    // Ensure clients are initialized
    await client.ensureInitialized();
    
    try {
      const { pageContent, docId, ...docMetadata } = document;
      
      // Use TextSplitter like LanceDB does
      const { TextSplitter } = require("../../TextSplitter");
      const { SystemSettings } = require("../../../models/systemSettings");
      const EmbedderEngine = getEmbeddingEngineSelection();
      
      const textSplitter = new TextSplitter({
        chunkSize: TextSplitter.determineMaxChunkSize(
          await SystemSettings.getValueOrFallback({
            label: "text_splitter_chunk_size",
          }),
          EmbedderEngine?.embeddingMaxChunkLength
        ),
        chunkOverlap: await SystemSettings.getValueOrFallback(
          { label: "text_splitter_chunk_overlap" },
          20
        ),
        chunkHeaderMeta: TextSplitter.buildHeaderMeta(docMetadata),
        chunkPrefix: EmbedderEngine?.embeddingPrefix,
      });
      
      const textChunks = await textSplitter.splitText(pageContent);
      console.log("Snippets created from document:", textChunks.length);
      
      if (textChunks.length === 0) {
        throw new Error("No text chunks created from document");
      }
      
      // Embed all chunks
      const vectorValues = await EmbedderEngine.embedChunks(textChunks);
      
      if (!vectorValues || vectorValues.length === 0) {
        throw new Error("Could not embed document chunks!");
      }
      
      // Prepare vectors for distribution across ChromaDB instances
      const documentVectors = [];
      const vectorBatches = [];
      
      // Group vectors by target node (round-robin distribution)
      for (let i = 0; i < vectorValues.length; i++) {
        const vectorId = uuidv4();
        const targetNodeIndex = i % client.clients.length;
        const targetClient = client.clients[targetNodeIndex];
        
        if (!vectorBatches[targetNodeIndex]) {
          vectorBatches[targetNodeIndex] = {
            client: targetClient,
            ids: [],
            embeddings: [],
            metadatas: [],
            documents: []
          };
        }
        
        const vectorMetadata = {
          ...docMetadata,
          docId,
          vectorId,
          chunkIndex: i,
          totalChunks: textChunks.length,
          text: textChunks[i]
        };
        
        vectorBatches[targetNodeIndex].ids.push(vectorId);
        vectorBatches[targetNodeIndex].embeddings.push(vectorValues[i]);
        vectorBatches[targetNodeIndex].metadatas.push(vectorMetadata);
        vectorBatches[targetNodeIndex].documents.push(textChunks[i]);
        
        documentVectors.push({ docId, vectorId });
      }
      
      // Store vectors in parallel across all nodes
      const storagePromises = vectorBatches.map(async (batch, nodeIndex) => {
        try {
          const collection = await batch.client.client.getOrCreateCollection({
            name: this.normalize(namespace),
            metadata: { "hnsw:space": "cosine" },
          });
          
          await collection.add({
            ids: batch.ids,
            embeddings: batch.embeddings,
            metadatas: batch.metadatas,
            documents: batch.documents,
          });
          
          console.log(`📝 ${batch.ids.length} vectors added to ChromaDB Node ${nodeIndex + 1}`);
          return { success: true, nodeIndex, count: batch.ids.length };
        } catch (error) {
          console.error(`Error adding vectors to Node ${nodeIndex + 1}:`, error.message);
          return { success: false, nodeIndex, error: error.message };
        }
      });
      
      const results = await Promise.allSettled(storagePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
      
      if (successful.length === 0) {
        throw new Error("Failed to store vectors in any ChromaDB node");
      }
      
      if (failed.length > 0) {
        console.warn(`⚠️ Failed to store vectors in ${failed.length} nodes, but succeeded in ${successful.length} nodes`);
      }
      
      // Store document-vector relationships in database
      const { DocumentVectors } = require("../../../models/vectors");
      await DocumentVectors.bulkInsert(documentVectors);
      
      console.log(`✅ Document processed: ${textChunks.length} chunks distributed across ${successful.length} ChromaDB nodes`);
      return { vectorized: true, error: null };
      
    } catch (error) {
      console.error("addDocumentToNamespace error:", error.message);
      return { vectorized: false, error: error.message };
    }
  },

  // 🗑️ DISTRIBUTED DOCUMENT DELETION
  deleteDocumentFromNamespace: async function (namespace, docId) {
    const { client } = await this.connect();
    
    // Ensure clients are initialized
    await client.ensureInitialized();
    
    const results = await client.executeOnAllClients(async (chromaClient) => {
      try {
        const collection = await chromaClient.getCollection({
          name: this.normalize(namespace),
        });
        
        await collection.delete({
          where: { docId: docId },
        });
        
        return { success: true };
      } catch (error) {
        console.error("Error deleting document:", error.message);
        return { success: false, error: error.message };
      }
    });
    
    const successfulDeletions = results.filter(r => r.success).length;
    console.log(`🗑️ Document deleted from ${successfulDeletions}/${results.length} nodes`);
    
    return { success: successfulDeletions > 0 };
  },

  // 📊 NAMESPACE MANAGEMENT
  hasNamespace: async function (namespace = null) {
    if (!namespace) return false;
    const { client } = await this.connect();
    
    const results = await client.executeOnAllClients(async (chromaClient) => {
      try {
        const collection = await chromaClient
          .getCollection({ name: this.normalize(namespace) })
          .catch(() => null);
        return !!collection;
      } catch (error) {
        return false;
      }
    });
    
    return results.some(exists => exists);
  },

  namespace: async function (client, namespace = null) {
    if (!namespace) throw new Error("No namespace value provided.");
    
    const results = await client.executeOnAllClients(async (chromaClient) => {
      try {
        const collection = await chromaClient
          .getCollection({ name: this.normalize(namespace) })
          .catch(() => null);
        
        if (!collection) return null;
        
        return {
          ...collection,
          vectorCount: await collection.count(),
        };
      } catch (error) {
        return null;
      }
    });
    
    // Return the first valid namespace found
    return results.find(result => result !== null) || null;
  },

  // 🧹 CLEANUP
  deleteNamespace: async function (namespace = null) {
    if (!namespace) throw new Error("No namespace value provided.");
    const { client } = await this.connect();
    
    // Ensure clients are initialized
    await client.ensureInitialized();
    
    const results = await client.executeOnAllClients(async (chromaClient) => {
      try {
        await chromaClient.deleteCollection({
          name: this.normalize(namespace),
        });
        return { success: true };
      } catch (error) {
        console.error("Error deleting namespace:", error.message);
        return { success: false, error: error.message };
      }
    });
    
    const successfulDeletions = results.filter(r => r.success).length;
    console.log(`🧹 Namespace deleted from ${successfulDeletions}/${results.length} nodes`);
    
    return { success: successfulDeletions > 0 };
  },

  // 🔍 DISTRIBUTED SIMILARITY SEARCH - QUERY ALL INSTANCES
  performSimilaritySearch: async function ({
    namespace = null,
    input = "",
    LLMConnector = null,
    similarityThreshold = 0.25,
    topN = 4,
    filterIdentifiers = [],
  }) {
    if (!namespace || !input || !LLMConnector) {
      throw new Error("Invalid request to performSimilaritySearch.");
    }

    const { client } = await this.connect();
    
    // Ensure clients are initialized
    await client.ensureInitialized();
    
    try {
      // Get query vector from LLMConnector
      const queryVector = await LLMConnector.embedTextInput(input);
      
      // Search across all ChromaDB instances in parallel
      const searchResults = await client.executeOnAllClients(async (chromaClient) => {
        try {
          const collection = await chromaClient.getCollection({
            name: this.normalize(namespace),
          });
          
          const response = await collection.query({
            queryEmbeddings: [queryVector],
            nResults: topN * 2, // Get more results from each node
          });
          
          const nodeResults = {
            contextTexts: [],
            sourceDocuments: [],
            scores: [],
          };
          
          if (response.documents && response.documents[0]) {
            const documents = response.documents[0];
            const metadatas = response.metadatas?.[0] || [];
            const distances = response.distances?.[0] || [];
            
            for (let i = 0; i < documents.length; i++) {
              const similarity = this.distanceToSimilarity(distances[i]);
              if (similarity >= similarityThreshold) {
                nodeResults.contextTexts.push(documents[i]);
                nodeResults.sourceDocuments.push(metadatas[i] || {});
                nodeResults.scores.push(similarity);
              }
            }
          }
          
          return nodeResults;
        } catch (error) {
          console.error("Error searching ChromaDB node:", error.message);
          return { contextTexts: [], sourceDocuments: [], scores: [] };
        }
      });
      
      // Combine results from all nodes
      const combinedResults = {
        contextTexts: [],
        sourceDocuments: [],
        scores: [],
      };
      
      searchResults.forEach(nodeResult => {
        combinedResults.contextTexts.push(...nodeResult.contextTexts);
        combinedResults.sourceDocuments.push(...nodeResult.sourceDocuments);
        combinedResults.scores.push(...nodeResult.scores);
      });
      
      // Sort by similarity score (descending) and take top N
      const sortedIndices = combinedResults.scores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(item => item.index);
      
      const topResults = {
        contextTexts: [],
        sourceDocuments: [],
        scores: [],
      };
      
      for (const idx of sortedIndices) {
        topResults.contextTexts.push(combinedResults.contextTexts[idx]);
        topResults.sourceDocuments.push(combinedResults.sourceDocuments[idx]);
        topResults.scores.push(combinedResults.scores[idx]);
      }
      
      console.log(`🔍 Multi-ChromaDB search: Found ${topResults.contextTexts.length} results from ${searchResults.length} nodes`);
      
      const sources = topResults.sourceDocuments.map((doc, i) => {
        return { metadata: doc, text: topResults.contextTexts[i] };
      });
      
      return {
        contextTexts: topResults.contextTexts,
        sources: this.curateSources(sources),
        message: false,
      };
    } catch (error) {
      console.error("Error in performSimilaritySearch:", error.message);
      return { error: error.message, success: false };
    }
  },

  curateSources: function (sources = []) {
    const documents = [];
    for (const source of sources) {
      const { metadata = {} } = source;
      if (Object.keys(metadata).length > 0) {
        documents.push({
          ...metadata,
          ...(source.hasOwnProperty("pageContent")
            ? { text: source.pageContent }
            : {}),
        });
      }
    }
    return documents;
  },

  // 🔍 NAMESPACE MANAGEMENT
  hasNamespace: async function (namespace) {
    const { client } = await this.connect();
    await client.ensureInitialized();
    
    try {
      // Check if namespace exists in any of the ChromaDB instances
      const results = await client.executeOnAllClients(async (chromaClient) => {
        try {
          const collection = await chromaClient.getCollection({
            name: this.normalize(namespace),
          });
          return collection ? true : false;
        } catch (error) {
          return false;
        }
      });
      
      return results.some(result => result === true);
    } catch (error) {
      console.error("Error checking namespace existence:", error.message);
      return false;
    }
  },

  namespaceExists: async function (namespace) {
    return await this.hasNamespace(namespace);
  },

  // 📊 NAMESPACE STATS
  "namespace-stats": async function (reqBody = {}) {
    const { namespace = null } = reqBody;
    if (!namespace) throw new Error("namespace required");
    
    const { client } = await this.connect();
    await client.ensureInitialized();
    
    try {
      const results = await client.executeOnAllClients(async (chromaClient) => {
        try {
          const collection = await chromaClient.getCollection({
            name: this.normalize(namespace),
          });
          const count = await collection.count();
          return count;
        } catch (error) {
          return 0;
        }
      });
      
      const totalVectors = results.reduce((sum, count) => sum + count, 0);
      
      return {
        vectorCount: totalVectors,
        nodeCount: results.length,
        healthyNodes: results.filter(count => count >= 0).length,
        message: totalVectors > 0 ? null : "No vectors found in namespace"
      };
    } catch (error) {
      console.error("Error getting namespace stats:", error.message);
      throw new Error("Failed to get namespace stats");
    }
  },

  // 🗑️ DELETE NAMESPACE
  "delete-namespace": async function (reqBody = {}) {
    const { namespace = null } = reqBody;
    if (!namespace) throw new Error("namespace required");
    
    const { client } = await this.connect();
    await client.ensureInitialized();
    
    try {
      const results = await client.executeOnAllClients(async (chromaClient) => {
        try {
          await chromaClient.deleteCollection({
            name: this.normalize(namespace),
          });
          return { success: true };
        } catch (error) {
          console.error("Error deleting namespace:", error.message);
          return { success: false, error: error.message };
        }
      });
      
      const successfulDeletions = results.filter(r => r.success).length;
      console.log(`🧹 Namespace deleted from ${successfulDeletions}/${results.length} nodes`);
      
      return {
        message: `Namespace ${namespace} deleted from ${successfulDeletions} nodes`,
        success: successfulDeletions > 0
      };
    } catch (error) {
      console.error("Error in delete-namespace:", error.message);
      throw new Error("Failed to delete namespace");
    }
  },

  // 🔄 RESET
  reset: async function () {
    const { client } = await this.connect();
    await client.ensureInitialized();
    
    try {
      const results = await client.executeOnAllClients(async (chromaClient) => {
        try {
          // Get all collections and delete them
          const collections = await chromaClient.listCollections();
          for (const collection of collections) {
            await chromaClient.deleteCollection({ name: collection.name });
          }
          return { success: true };
        } catch (error) {
          console.error("Error resetting node:", error.message);
          return { success: false, error: error.message };
        }
      });
      
      const successfulResets = results.filter(r => r.success).length;
      console.log(`🔄 Reset completed on ${successfulResets}/${results.length} nodes`);
      
      return { reset: true, nodesReset: successfulResets };
    } catch (error) {
      console.error("Error in reset:", error.message);
      throw new Error("Failed to reset ChromaDB instances");
    }
  },
};

module.exports = { MultiChroma };

