/**
 * Hybrid Search Manager
 * Coordinates parallel searches across PostgreSQL metadata, Qdrant vectors, and BM25 keyword search
 */

const { LegalJudgmentMetadata } = require("../../models/legalJudgmentMetadata");
const { HybridReranker } = require("./reranker");
const { BM25 } = require("./bm25");

class HybridSearchManager {
  /**
   * Perform hybrid search combining BM25, metadata filtering, and vector similarity
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Reranked search results
   */
  static async search({
    query,
    workspace,
    vectorDbInstance,
    llmConnector,
    similarityThreshold = 0.25,
    topN = 10,
    filters = {},
    rerankOptions = {},
    enableBM25 = true,
  }) {
    try {
      console.log(`[HybridSearch] Query: "${query}"`);
      console.log(`[HybridSearch] Filters:`, filters);
      console.log(`[HybridSearch] BM25 enabled: ${enableBM25}`);

      // Step 1: Parse query for metadata filters if not explicitly provided
      const enhancedFilters = { ...filters };
      if (Object.keys(filters).length === 0) {
        const extractedFilters = this.extractFiltersFromQuery(query);
        Object.assign(enhancedFilters, extractedFilters);
      }

      // Step 2: Execute parallel searches (Vector + Metadata + BM25)
      const searchPromises = [
        // Vector search in Qdrant
        this.performVectorSearch({
          query,
          workspace,
          vectorDbInstance,
          llmConnector,
          similarityThreshold,
          topN: topN * 2, // Get more results for better reranking
        }),

        // Metadata search in PostgreSQL (only if filters exist)
        Object.keys(enhancedFilters).length > 0
          ? this.performMetadataSearch({
              filters: enhancedFilters,
              workspaceId: workspace.id,
              limit: topN * 2,
            })
          : Promise.resolve([]),
      ];

      // Add BM25 search if enabled
      if (enableBM25) {
        searchPromises.push(
          this.performBM25Search({
            query,
            workspace,
            vectorDbInstance,
            topN: topN * 2,
          })
        );
      }

      const searchResults = await Promise.all(searchPromises);
      const [vectorResults, metadataResults, bm25Results = []] = searchResults;

      console.log(`[HybridSearch] Vector: ${vectorResults.length}, Metadata: ${metadataResults.length}, BM25: ${bm25Results.length}`);

      // Step 3: Rerank and merge results with hosted reranker + BM25
      const rerankedResults = await HybridReranker.rerank(
        vectorResults,
        metadataResults,
        query,
        {
          // Enhanced prioritization: semantic + reranker + BM25 + metadata
          semanticWeight: 0.4,      // 40% weight to Qdrant cosine similarity
          rerankerWeight: 0.3,      // 30% weight to hosted reranker model
          bm25Weight: 0.2,          // 20% weight to BM25 keyword matching
          metadataWeight: 0.1,      // 10% weight to PostgreSQL metadata
          maxResults: topN,
          useHostedReranker: true,  // Enable hosted reranker (Gemini/Cohere/OpenAI)
          bm25Results,              // Pass BM25 results for scoring
          ...rerankOptions,
        }
      );

      // Step 4: Enrich results with metadata
      const enrichedResults = await this.enrichResultsWithMetadata(
        rerankedResults,
        workspace.id
      );

      // Step 5: Add source tagging and citation grounding
      const groundedResults = this.addSourceTagging(enrichedResults, query);

      // Step 6: Deduplicate results
      const dedupedResults = this.deduplicateResults(groundedResults);

      // Step 7: Post-processing validation
      const validatedResults = this.validateResults(dedupedResults, query);

      // Optional: Explain top results for debugging
      if (process.env.DEBUG_HYBRID_SEARCH === "true") {
        HybridReranker.explainScores(validatedResults, 5);
      }

      return validatedResults;
    } catch (error) {
      console.error(`[HybridSearch] Error:`, error.message);
      // Fallback to vector-only search
      return this.performVectorSearch({
        query,
        workspace,
        vectorDbInstance,
        llmConnector,
        similarityThreshold,
        topN,
      });
    }
  }

  /**
   * Perform vector similarity search in Qdrant
   */
  static async performVectorSearch({
    query,
    workspace,
    vectorDbInstance,
    llmConnector,
    similarityThreshold,
    topN,
  }) {
    try {
      if (!vectorDbInstance || !vectorDbInstance.performSimilaritySearch) {
        console.warn(`[HybridSearch] VectorDB instance not available`);
        return [];
      }

      const results = await vectorDbInstance.performSimilaritySearch({
        namespace: workspace.slug,
        input: query,
        LLMConnector: llmConnector,
        similarityThreshold,
        topN,
        filterIdentifiers: [],
        rerank: false,
      });

      // Extract sources from the results - this is the correct format
      return results?.sources || [];
    } catch (error) {
      console.error(`[HybridSearch] Vector search error:`, error.message);
      return [];
    }
  }

  /**
   * Perform metadata search in PostgreSQL
   */
  static async performMetadataSearch({ filters, workspaceId, limit }) {
    try {
      const searchParams = {
        workspace_id: workspaceId,
        limit,
      };

      // Map filters to search params
      if (filters.court) searchParams.court = filters.court;
      if (filters.year) searchParams.year = filters.year;
      if (filters.case_type) searchParams.case_type = filters.case_type;
      if (filters.jurisdiction) searchParams.jurisdiction = filters.jurisdiction;
      if (filters.judge) searchParams.judge = filters.judge;
      if (filters.citation) searchParams.citation = filters.citation;
      if (filters.keywords) searchParams.keywords = filters.keywords;
      if (filters.bench_type) searchParams.bench_type = filters.bench_type;

      // Full-text search if query-like filter
      if (filters.fulltext) searchParams.fulltext = filters.fulltext;

      const results = await LegalJudgmentMetadata.search(searchParams);
      return results;
    } catch (error) {
      console.error(`[HybridSearch] Metadata search error:`, error.message);
      return [];
    }
  }

  /**
   * Extract metadata filters from natural language query
   */
  static extractFiltersFromQuery(query) {
    const filters = {};
    const lowerQuery = query.toLowerCase();

    // Year extraction
    const yearMatch = query.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1]);
    }

    // Court extraction
    const courtPatterns = [
      { pattern: /supreme court/i, value: "Supreme Court of India" },
      { pattern: /high court of ([a-z\s]+)/i, value: null }, // Extract specific HC
      { pattern: /delhi high court/i, value: "High Court of Delhi" },
      { pattern: /bombay high court/i, value: "High Court of Bombay" },
      { pattern: /calcutta high court/i, value: "High Court of Calcutta" },
      { pattern: /madras high court/i, value: "High Court of Madras" },
    ];

    for (const { pattern, value } of courtPatterns) {
      const match = query.match(pattern);
      if (match) {
        filters.court = value || match[0];
        break;
      }
    }

    // Case type extraction
    const caseTypePatterns = [
      { pattern: /criminal appeal/i, value: "Criminal Appeal" },
      { pattern: /civil appeal/i, value: "Civil Appeal" },
      { pattern: /writ petition/i, value: "Writ Petition" },
      { pattern: /special leave petition|slp/i, value: "Special Leave Petition" },
      { pattern: /\bpil\b|public interest litigation/i, value: "PIL" },
      { pattern: /bail/i, value: "Bail Application" },
    ];

    for (const { pattern, value } of caseTypePatterns) {
      if (pattern.test(query)) {
        filters.case_type = value;
        break;
      }
    }

    // Jurisdiction extraction
    if (/criminal/i.test(query)) {
      filters.jurisdiction = "Criminal";
    } else if (/civil/i.test(query)) {
      filters.jurisdiction = "Civil";
    }

    // Bench type extraction
    if (/constitution bench/i.test(query)) {
      filters.bench_type = "Constitution Bench";
    } else if (/division bench/i.test(query)) {
      filters.bench_type = "Division Bench";
    }

    // Extract keywords for full-text search (remove year and court mentions)
    let cleanedQuery = query;
    if (filters.year) cleanedQuery = cleanedQuery.replace(String(filters.year), '');
    if (filters.court) cleanedQuery = cleanedQuery.replace(new RegExp(filters.court, 'gi'), '');
    if (filters.case_type) cleanedQuery = cleanedQuery.replace(new RegExp(filters.case_type, 'gi'), '');
    
    cleanedQuery = cleanedQuery.trim();
    if (cleanedQuery.length > 5) {
      filters.fulltext = cleanedQuery;
    }

    return filters;
  }

  /**
   * Enrich results with legal metadata from PostgreSQL
   */
  static async enrichResultsWithMetadata(results, workspaceId) {
    try {
      const docIds = results.map(r => r.docId).filter(Boolean);
      if (docIds.length === 0) return results;

      // Batch fetch metadata for all documents
      const metadataMap = new Map();
      for (const docId of docIds) {
        try {
          const metadata = await LegalJudgmentMetadata.get(docId);
          if (metadata) {
            metadataMap.set(docId, metadata);
          }
        } catch (error) {
          // Continue on error
        }
      }

      // Enrich results
      return results.map(result => {
        const legalMetadata = metadataMap.get(result.docId);
        if (legalMetadata) {
          return {
            ...result,
            legalMetadata,
            // Enhance display metadata
            metadata: {
              ...result.metadata,
              court: legalMetadata.court,
              year: legalMetadata.year,
              citation: legalMetadata.citation,
              case_type: legalMetadata.case_type,
            },
          };
        }
        return result;
      });
    } catch (error) {
      console.error(`[HybridSearch] Enrichment error:`, error.message);
      return results;
    }
  }

  /**
   * Get search statistics
   */
  static async getSearchStats(workspaceId) {
    try {
      const stats = await LegalJudgmentMetadata.getStats(workspaceId);
      return stats;
    } catch (error) {
      console.error(`[HybridSearch] Stats error:`, error.message);
      return null;
    }
  }

  /**
   * Get unique values for faceted search
   */
  static async getFacets(workspaceId, field) {
    try {
      const values = await LegalJudgmentMetadata.getUniqueValues(workspaceId, field);
      return values;
    } catch (error) {
      console.error(`[HybridSearch] Facets error:`, error.message);
      return [];
    }
  }

  /**
   * Perform BM25 keyword-based search
   */
  static async performBM25Search({ query, workspace, vectorDbInstance, topN }) {
    try {
      // Get all documents from the workspace for BM25 indexing
      // In production, this should be cached or pre-indexed
      const allDocs = await this.getAllWorkspaceDocuments(workspace, vectorDbInstance);
      
      if (allDocs.length === 0) {
        console.log(`[HybridSearch] No documents for BM25 indexing`);
        return [];
      }

      // Create BM25 index
      const bm25 = new BM25(allDocs, {
        k1: 1.5,  // Term frequency saturation
        b: 0.75   // Length normalization
      });

      // Perform search
      const results = bm25.search(query, topN);
      
      console.log(`[HybridSearch] BM25 found ${results.length} results`);
      
      // Normalize scores to 0-1 range
      return bm25.normalizeScores(results).map(r => ({
        ...r.document,
        bm25Score: r.score,
        source: 'bm25'
      }));
    } catch (error) {
      console.error(`[HybridSearch] BM25 search error:`, error.message);
      return [];
    }
  }

  /**
   * Get all documents from workspace for BM25 indexing
   * This is a simplified version - in production, implement caching
   */
  static async getAllWorkspaceDocuments(workspace, vectorDbInstance) {
    try {
      // This would ideally come from a cache or pre-built index
      // For now, we'll get recent documents from vector search
      const { Document } = require("../../models/documents");
      const docs = await Document.where(
        { workspaceId: workspace.id },
        1000, // Limit for performance
        { id: "desc" }
      );
      
      return docs.map(doc => ({
        id: doc.id,
        docId: doc.docId,
        text: doc.pageContent || doc.metadata?.text || '',
        title: doc.metadata?.title || 'Untitled',
        ...doc.metadata
      }));
    } catch (error) {
      console.error(`[HybridSearch] Error fetching documents:`, error.message);
      return [];
    }
  }

  /**
   * Add source tagging and citation grounding to results
   */
  static addSourceTagging(results, query) {
    return results.map((result, index) => {
      // Add source tags for citation tracking
      const sourceTag = `[Source ${index + 1}]`;
      const citationId = `cite_${result.docId || result.id}_${Date.now()}`;
      
      // Add grounding metadata
      return {
        ...result,
        sourceTag,
        citationId,
        citationMetadata: {
          title: result.title || result.metadata?.title || 'Untitled',
          court: result.metadata?.court || result.legalMetadata?.court,
          year: result.metadata?.year || result.legalMetadata?.year,
          citation: result.metadata?.citation || result.legalMetadata?.citation,
          url: result.metadata?.url || result.metadata?.source,
          retrievedAt: new Date().toISOString(),
          query: query,
          relevanceScore: result.combinedScore || result.score || 0
        },
        // Add grounding prompt instruction
        groundingInstruction: this.generateGroundingInstruction(result)
      };
    });
  }

  /**
   * Generate grounding instruction for LLM
   */
  static generateGroundingInstruction(result) {
    const citation = result.citationMetadata?.citation || 'Unknown';
    const court = result.citationMetadata?.court || 'Unknown Court';
    const year = result.citationMetadata?.year || 'Unknown Year';
    
    return `When citing this source, use: ${citation} (${court}, ${year}). ` +
           `Always verify the exact quote from the source text before citing.`;
  }

  /**
   * Deduplicate results based on content similarity and document ID
   */
  static deduplicateResults(results) {
    const seen = new Map();
    const deduped = [];

    for (const result of results) {
      const docId = result.docId || result.id;
      const textHash = this.hashText(result.text || '');
      const key = `${docId}_${textHash}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push(result);
      } else {
        console.log(`[HybridSearch] Deduplicated: ${result.title || 'Untitled'}`);
      }
    }

    console.log(`[HybridSearch] Deduplication: ${results.length} → ${deduped.length} results`);
    return deduped;
  }

  /**
   * Simple text hashing for deduplication
   */
  static hashText(text) {
    if (!text) return '0';
    
    // Simple hash function
    let hash = 0;
    const normalized = text.substring(0, 200).toLowerCase().trim();
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Validate results for quality and relevance
   */
  static validateResults(results, query) {
    const validated = results.filter(result => {
      // Validation checks
      const hasText = (result.text || '').length > 10;
      const hasScore = (result.combinedScore || result.score || 0) > 0;
      const hasMetadata = result.title || result.metadata?.title;
      
      // Check for minimum quality threshold
      const qualityScore = this.calculateQualityScore(result);
      const meetsThreshold = qualityScore >= 0.3;

      if (!hasText || !hasScore || !hasMetadata || !meetsThreshold) {
        console.log(`[HybridSearch] Filtered low-quality result: ${result.title || 'Untitled'} (quality: ${qualityScore.toFixed(2)})`);
        return false;
      }

      return true;
    });

    // Add validation metadata
    return validated.map(result => ({
      ...result,
      validated: true,
      validationScore: this.calculateQualityScore(result),
      validatedAt: new Date().toISOString()
    }));
  }

  /**
   * Calculate quality score for a result
   */
  static calculateQualityScore(result) {
    let score = 0;

    // Text length (normalized)
    const textLength = (result.text || '').length;
    score += Math.min(textLength / 1000, 0.3); // Max 0.3 for text length

    // Has metadata
    if (result.metadata || result.legalMetadata) score += 0.2;

    // Has citation info
    if (result.citationMetadata?.citation) score += 0.2;

    // Relevance score
    const relevance = result.combinedScore || result.score || 0;
    score += relevance * 0.3; // Max 0.3 for relevance

    return Math.min(score, 1.0);
  }
}

module.exports = { HybridSearchManager };

