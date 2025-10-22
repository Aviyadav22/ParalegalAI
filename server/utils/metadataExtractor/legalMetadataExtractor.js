/**
 * Legal Metadata Extractor
 * Uses LLM to extract structured metadata from legal documents
 */

const { GeminiLLM } = require("../AiProviders/gemini");

class LegalMetadataExtractor {
  /**
   * Extract structured metadata from legal document text
   * @param {string} documentText - Full text of the legal document
   * @param {string} fileName - Original filename
   * @returns {Promise<Object>} Extracted metadata
   */
  static async extractMetadata(documentText, fileName = "") {
    try {
      // Use direct pattern extraction instead of AI
      return this.extractBasicMetadata(fileName, documentText);
    } catch (error) {
      console.error(`[MetadataExtractor] Error:`, error.message);
      
      // Return minimal metadata on error
      return {
        case_title: fileName,
        judgment_date: null,
        page_count: this.estimatePageCount(documentText),
        word_count: documentText.split(/\s+/).length,
      };
    }
  }

  /**
   * Fallback: Extract basic metadata from filename and text patterns
   */
  static extractBasicMetadata(fileName, documentText) {
    const textSample = documentText.substring(0, 5000); // First 5000 chars
    
    const metadata = {
      case_number: null,
      case_title: fileName.replace(/\.pdf$/i, '').replace(/-[a-f0-9]{8,}\.json$/, ''),
      case_type: null,
      court_name: null,
      court_level: null,
      jurisdiction: null,
      petitioner: null,
      respondent: null,
      judges: [],
      author_judge: null,
      filing_date: null,
      judgment_date: null,
      acts_cited: [],
      sections_cited: [],
      articles_cited: [],
      decision_type: null,
      outcome: null,
      keywords: [],
      page_count: this.estimatePageCount(documentText),
      word_count: documentText.split(/\s+/).length,
      summary: null,
    };

    // Extract case title and parties from filename
    const vsMatch = fileName.match(/(.+?)\s+VS\s+(.+?)(?:W\.P\.|C\.A\.|SLP|Crl\.A\.|C\.C\.|\.pdf)/i);
    if (vsMatch) {
      metadata.petitioner = vsMatch[1].trim().replace(/-/g, ' ');
      metadata.respondent = vsMatch[2].trim().replace(/-/g, ' ');
      metadata.case_title = `${metadata.petitioner} vs ${metadata.respondent}`;
    }

    // Extract case number from filename
    const caseNumMatch = fileName.match(/(W\.P\.\(C\)|C\.A\.|SLP\(C\)|Crl\.A\.|C\.C\.)\s*No\.\s*(\d+[-\/]\d+)/i);
    if (caseNumMatch) {
      metadata.case_number = caseNumMatch[0];
    }

    // Extract case type from case number
    if (metadata.case_number) {
      if (metadata.case_number.includes('W.P.')) metadata.case_type = 'Writ Petition';
      else if (metadata.case_number.includes('C.A.')) metadata.case_type = 'Civil Appeal';
      else if (metadata.case_number.includes('SLP')) metadata.case_type = 'Special Leave Petition';
      else if (metadata.case_number.includes('Crl.A.')) metadata.case_type = 'Criminal Appeal';
    }

    // Extract date from filename
    const dateMatch = fileName.match(/\((\d{2})-(\d{2})-(\d{4})\)/);
    if (dateMatch) {
      metadata.judgment_date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Extract court from text
    const courtMatch = textSample.match(/(?:IN THE |BEFORE THE )?(SUPREME COURT OF INDIA|HIGH COURT OF [A-Z\s]+)/i);
    if (courtMatch) {
      metadata.court_name = courtMatch[1];
      if (courtMatch[1].includes('SUPREME COURT')) {
        metadata.court_level = 'Supreme Court';
        metadata.jurisdiction = 'India';
      } else if (courtMatch[1].includes('HIGH COURT')) {
        metadata.court_level = 'High Court';
        const stateMatch = courtMatch[1].match(/HIGH COURT OF ([A-Z\s]+)/i);
        if (stateMatch) metadata.jurisdiction = stateMatch[1].trim();
      }
    }

    // Extract judges from text
    const judgePattern = /(?:Hon'ble|Honourable)\s+(?:Mr\.|Ms\.|Justice)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const judgeSet = new Set();
    const judgeMatches = textSample.matchAll(judgePattern);
    for (const match of judgeMatches) {
      const judgeName = match[1].trim();
      if (judgeName.length > 5 && judgeName.length < 50) {
        judgeSet.add(judgeName);
      }
    }
    metadata.judges = Array.from(judgeSet).slice(0, 5);

    // Extract sections cited
    const sectionMatches = textSample.matchAll(/Section\s+(\d+[A-Z]?)/gi);
    const sections = new Set();
    for (const match of sectionMatches) {
      sections.add(`Section ${match[1]}`);
    }
    metadata.sections_cited = Array.from(sections).slice(0, 10);

    // Extract articles cited
    const articleMatches = textSample.matchAll(/Article\s+(\d+[A-Z]?)/gi);
    const articles = new Set();
    for (const match of articleMatches) {
      articles.add(`Article ${match[1]}`);
    }
    metadata.articles_cited = Array.from(articles).slice(0, 10);

    // Extract acts cited
    const actMatches = textSample.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Act,?\s+(\d{4})/g);
    const acts = new Set();
    for (const match of actMatches) {
      acts.add(`${match[1]} Act, ${match[2]}`);
    }
    metadata.acts_cited = Array.from(acts).slice(0, 10);

    // Generate keywords from case title
    if (metadata.case_title) {
      const words = metadata.case_title.split(/[\s\-_]+/)
        .filter(w => w.length > 3 && !['json', 'pdf'].includes(w.toLowerCase()))
        .slice(0, 10);
      metadata.keywords = words;
    }

    return metadata;
  }

  /**
   * Estimate page count from text length
   */
  static estimatePageCount(text) {
    const wordsPerPage = 350;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerPage);
  }

  /**
   * Generate brief summary from text
   */
  static generateSummary(text) {
    // Take first 500 characters as summary
    return text.substring(0, 500).trim() + '...';
  }

  /**
   * Batch extract metadata for multiple documents
   */
  static async batchExtract(documents, onProgress = null) {
    const results = [];
    const total = documents.length;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      try {
        console.log(`[MetadataExtractor] Processing ${i + 1}/${total}: ${doc.fileName}`);
        
        const metadata = await this.extractMetadata(doc.text, doc.fileName);
        results.push({
          docId: doc.docId,
          metadata,
          success: true,
        });

        if (onProgress) {
          onProgress(i + 1, total);
        }

        // Rate limiting: wait 1 second between requests
        if (i < documents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[MetadataExtractor] Failed for ${doc.fileName}:`, error.message);
        results.push({
          docId: doc.docId,
          metadata: this.extractBasicMetadata(doc.fileName, doc.text),
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = { LegalMetadataExtractor };
