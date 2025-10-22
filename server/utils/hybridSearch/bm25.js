/**
 * BM25 (Best Matching 25) Implementation for Legal Document Retrieval
 * Provides keyword-based ranking to complement vector similarity search
 */

class BM25 {
  /**
   * @param {Array<Object>} documents - Array of documents with text field
   * @param {Object} options - BM25 parameters
   */
  constructor(documents = [], options = {}) {
    this.k1 = options.k1 || 1.5; // Term frequency saturation parameter
    this.b = options.b || 0.75;  // Length normalization parameter
    this.documents = documents;
    this.documentCount = documents.length;
    this.avgDocLength = 0;
    this.documentLengths = [];
    this.idf = new Map(); // Inverse document frequency
    this.termFrequencies = []; // Term frequencies per document
    
    if (documents.length > 0) {
      this.buildIndex();
    }
  }

  /**
   * Tokenize and normalize text for BM25 scoring
   */
  tokenize(text) {
    if (!text) return [];
    
    return text
      .toLowerCase()
      // Preserve legal citations (e.g., "123 U.S. 456")
      .replace(/(\d+)\s+([A-Z][a-z]+\.?)\s+(\d+)/g, '$1_$2_$3')
      // Preserve section references (e.g., "Section 42(a)")
      .replace(/section\s+(\d+[a-z]?)\s*\(([a-z0-9]+)\)/gi, 'section_$1_$2')
      // Remove special characters but keep underscores
      .replace(/[^\w\s_]/g, ' ')
      .split(/\s+/)
      .filter(term => {
        // Filter out very short terms unless they're legal abbreviations
        if (term.length <= 2 && !this.isLegalAbbreviation(term)) return false;
        // Filter out common stop words (but keep legal terms)
        return !this.isStopWord(term);
      });
  }

  /**
   * Check if term is a legal abbreviation that should be preserved
   */
  isLegalAbbreviation(term) {
    const legalAbbreviations = new Set([
      'v', 'vs', 'sc', 'hc', 'us', 'uk', 'eu', 'ca', 'ny', 'dc',
      'j', 'cj', 'jj', 'llp', 'llc', 'inc', 'ltd', 'plc'
    ]);
    return legalAbbreviations.has(term.toLowerCase());
  }

  /**
   * Stop words to filter (excluding legal terms)
   */
  isStopWord(term) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    return stopWords.has(term.toLowerCase());
  }

  /**
   * Build BM25 index from documents
   */
  buildIndex() {
    let totalLength = 0;
    const termDocumentFrequency = new Map(); // How many docs contain each term

    // First pass: calculate term frequencies and document lengths
    for (let i = 0; i < this.documents.length; i++) {
      const doc = this.documents[i];
      const text = this.getDocumentText(doc);
      const tokens = this.tokenize(text);
      
      this.documentLengths[i] = tokens.length;
      totalLength += tokens.length;

      // Count term frequencies in this document
      const termFreq = new Map();
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }
      this.termFrequencies[i] = termFreq;

      // Track which documents contain each term
      for (const term of termFreq.keys()) {
        termDocumentFrequency.set(
          term,
          (termDocumentFrequency.get(term) || 0) + 1
        );
      }
    }

    this.avgDocLength = totalLength / this.documentCount;

    // Calculate IDF for each term
    for (const [term, docFreq] of termDocumentFrequency) {
      // IDF = log((N - df + 0.5) / (df + 0.5) + 1)
      const idf = Math.log(
        (this.documentCount - docFreq + 0.5) / (docFreq + 0.5) + 1
      );
      this.idf.set(term, idf);
    }

    console.log(`[BM25] Indexed ${this.documentCount} documents, ${this.idf.size} unique terms`);
  }

  /**
   * Extract text from document object
   */
  getDocumentText(doc) {
    // Try multiple fields where text might be stored
    return doc.text || doc.pageContent || doc.content || doc.title || '';
  }

  /**
   * Calculate BM25 score for a query against all documents
   * @param {string} query - Search query
   * @returns {Array<{index: number, score: number}>} Sorted by score descending
   */
  search(query, topK = 10) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    for (let i = 0; i < this.documentCount; i++) {
      const score = this.scoreDocument(i, queryTokens);
      scores.push({ index: i, score, document: this.documents[i] });
    }

    // Sort by score descending and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Calculate BM25 score for a single document
   */
  scoreDocument(docIndex, queryTokens) {
    let score = 0;
    const docLength = this.documentLengths[docIndex];
    const termFreq = this.termFrequencies[docIndex];

    for (const term of queryTokens) {
      const tf = termFreq.get(term) || 0;
      if (tf === 0) continue;

      const idf = this.idf.get(term) || 0;
      
      // BM25 formula:
      // score = IDF * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)))
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Get BM25 scores for specific documents (used in hybrid search)
   */
  scoreDocuments(query, documents) {
    const queryTokens = this.tokenize(query);
    const results = [];

    for (const doc of documents) {
      // Find document in index
      const docIndex = this.documents.findIndex(d => 
        this.getDocId(d) === this.getDocId(doc)
      );

      if (docIndex !== -1) {
        const score = this.scoreDocument(docIndex, queryTokens);
        results.push({ ...doc, bm25Score: score });
      } else {
        // Document not in index, calculate on-the-fly
        const score = this.scoreDocumentOnTheFly(doc, queryTokens);
        results.push({ ...doc, bm25Score: score });
      }
    }

    return results;
  }

  /**
   * Score a document that's not in the index
   */
  scoreDocumentOnTheFly(doc, queryTokens) {
    const text = this.getDocumentText(doc);
    const tokens = this.tokenize(text);
    const docLength = tokens.length;

    // Build term frequency map
    const termFreq = new Map();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTokens) {
      const tf = termFreq.get(term) || 0;
      if (tf === 0) continue;

      // Use existing IDF if available, otherwise calculate approximate
      let idf = this.idf.get(term);
      if (idf === undefined) {
        // Approximate IDF for unseen term
        idf = Math.log(this.documentCount + 1);
      }

      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Get document ID for matching
   */
  getDocId(doc) {
    return doc.id || doc.docId || doc._id || JSON.stringify(doc);
  }

  /**
   * Normalize BM25 scores to 0-1 range
   */
  normalizeScores(results) {
    if (results.length === 0) return results;

    const maxScore = Math.max(...results.map(r => r.bm25Score || 0));
    if (maxScore === 0) return results;

    return results.map(r => ({
      ...r,
      bm25Score: (r.bm25Score || 0) / maxScore
    }));
  }

  /**
   * Update index with new documents (incremental indexing)
   */
  addDocuments(newDocuments) {
    if (!newDocuments || newDocuments.length === 0) return;

    this.documents.push(...newDocuments);
    this.documentCount = this.documents.length;
    
    // Rebuild index (for simplicity - could be optimized for incremental updates)
    this.buildIndex();
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      documentCount: this.documentCount,
      uniqueTerms: this.idf.size,
      avgDocLength: this.avgDocLength,
      parameters: {
        k1: this.k1,
        b: this.b
      }
    };
  }
}

module.exports = { BM25 };
