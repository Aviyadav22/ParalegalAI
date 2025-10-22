/**
 * Document Hook: Extract Legal Metadata
 * Automatically extracts and saves legal metadata when a PDF is uploaded
 */

const { LegalJudgmentMetadata } = require("../../models/legalJudgmentMetadata");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

/**
 * Extract and save legal metadata from uploaded PDF
 * @param {Object} document - The document object from workspace_documents
 * @param {string} originalFilePath - Path to the original PDF file
 */
async function extractLegalMetadata(document, originalFilePath) {
  try {
    // Check if metadata already exists
    const existing = await LegalJudgmentMetadata.get(document.docId);
    if (existing) {
      console.log(`[LegalMetadataHook] Metadata already exists for ${document.docId}`);
      return { success: true, existing: true };
    }

    // Check if file exists and is a PDF
    if (!originalFilePath || !fs.existsSync(originalFilePath)) {
      console.log(`[LegalMetadataHook] Original file not found: ${originalFilePath}`);
      return { success: false, reason: "File not found" };
    }

    if (!originalFilePath.toLowerCase().endsWith('.pdf')) {
      console.log(`[LegalMetadataHook] Not a PDF file: ${originalFilePath}`);
      return { success: false, reason: "Not a PDF" };
    }

    console.log(`[LegalMetadataHook] Extracting metadata from: ${path.basename(originalFilePath)}`);

    // Read PDF and extract metadata
    const dataBuffer = fs.readFileSync(originalFilePath);
    const pdfData = await pdf(dataBuffer);

    const fileName = path.basename(originalFilePath);
    const metadata = mapPdfMetadata(
      pdfData.info || {},
      pdfData.metadata || pdfData.info || {},
      fileName,
      pdfData.text || '',
      pdfData.numpages || 0
    );

    // Save to database
    await LegalJudgmentMetadata.create({
      doc_id: document.docId,
      workspace_id: document.workspaceId,
      ...metadata,
    });

    console.log(`[LegalMetadataHook] ✅ Metadata saved for ${document.docId}`);
    console.log(`   Court: ${metadata.court_name || 'N/A'}`);
    console.log(`   Date: ${metadata.judgment_date || 'N/A'}`);
    console.log(`   Type: ${metadata.case_type || 'N/A'}`);

    return { success: true, metadata };

  } catch (error) {
    console.error(`[LegalMetadataHook] Error:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Map PDF metadata to legal judgment schema
 */
function mapPdfMetadata(pdfInfo, pdfMetadata, fileName, textContent, pageCount) {
  const metadata = {
    case_number: null,
    case_title: null,
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
    page_count: pageCount,
    word_count: textContent ? textContent.split(/\s+/).length : null,
    summary: null,
  };

  // Extract from embedded PDF metadata
  if (pdfMetadata) {
    metadata.case_title = pdfMetadata.Title || pdfMetadata.title;
    metadata.summary = pdfMetadata.Subject || pdfMetadata.subject;
    metadata.case_number = pdfMetadata.CaseNumber || pdfMetadata.case_number || pdfMetadata['Case Number'];
    metadata.court_name = pdfMetadata.Court || pdfMetadata.court || pdfMetadata['Court Name'];
    metadata.court_level = pdfMetadata.CourtLevel || pdfMetadata.court_level || pdfMetadata['Court Level'];
    metadata.jurisdiction = pdfMetadata.Jurisdiction || pdfMetadata.jurisdiction;
    metadata.petitioner = pdfMetadata.Petitioner || pdfMetadata.petitioner;
    metadata.respondent = pdfMetadata.Respondent || pdfMetadata.respondent;
    metadata.case_type = pdfMetadata.CaseType || pdfMetadata.case_type || pdfMetadata['Case Type'];
    metadata.decision_type = pdfMetadata.DecisionType || pdfMetadata.decision_type;
    metadata.outcome = pdfMetadata.Outcome || pdfMetadata.outcome;
    
    // Dates
    const judgmentDate = pdfMetadata.JudgmentDate || pdfMetadata.judgment_date || pdfMetadata['Judgment Date'];
    if (judgmentDate) metadata.judgment_date = parseDate(judgmentDate);
    
    const filingDate = pdfMetadata.FilingDate || pdfMetadata.filing_date || pdfMetadata['Filing Date'];
    if (filingDate) metadata.filing_date = parseDate(filingDate);

    // Arrays
    const judges = pdfMetadata.Judges || pdfMetadata.judges || pdfMetadata.Judge;
    if (judges) {
      metadata.judges = typeof judges === 'string' ? judges.split(',').map(j => j.trim()) : judges;
    }

    const keywords = pdfMetadata.Keywords || pdfMetadata.keywords;
    if (keywords) {
      metadata.keywords = typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords;
    }

    const acts = pdfMetadata.ActsCited || pdfMetadata.acts_cited || pdfMetadata['Acts Cited'];
    if (acts) {
      metadata.acts_cited = typeof acts === 'string' ? acts.split(',').map(a => a.trim()) : acts;
    }

    const sections = pdfMetadata.SectionsCited || pdfMetadata.sections_cited || pdfMetadata['Sections Cited'];
    if (sections) {
      metadata.sections_cited = typeof sections === 'string' ? sections.split(',').map(s => s.trim()) : sections;
    }
  }

  // Fallback: Extract from filename
  if (!metadata.case_title) {
    const vsMatch = fileName.match(/(.+?)\s+VS\s+(.+?)(?:W\.P\.|C\.A\.|SLP|Crl\.A\.|\.pdf)/i);
    if (vsMatch) {
      metadata.petitioner = vsMatch[1].trim().replace(/-/g, ' ');
      metadata.respondent = vsMatch[2].trim().replace(/-/g, ' ');
      metadata.case_title = `${metadata.petitioner} vs ${metadata.respondent}`;
    } else {
      metadata.case_title = fileName.replace(/\.pdf$/i, '');
    }
  }

  if (!metadata.judgment_date) {
    const dateMatch = fileName.match(/\((\d{2})-(\d{2})-(\d{4})\)/);
    if (dateMatch) {
      metadata.judgment_date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }
  }

  if (!metadata.case_number) {
    const caseNumMatch = fileName.match(/(W\.P\.\(C\)|C\.A\.|SLP\(C\)|Crl\.A\.|C\.C\.)\s*No\.\s*(\d+[-\/]\d+)/i);
    if (caseNumMatch) {
      metadata.case_number = caseNumMatch[0];
    }
  }

  if (!metadata.case_type && metadata.case_number) {
    if (metadata.case_number.includes('W.P.')) metadata.case_type = 'Writ Petition';
    else if (metadata.case_number.includes('C.A.')) metadata.case_type = 'Civil Appeal';
    else if (metadata.case_number.includes('SLP')) metadata.case_type = 'Special Leave Petition';
    else if (metadata.case_number.includes('Crl.A.')) metadata.case_type = 'Criminal Appeal';
  }

  // Extract from text content if available
  if (textContent && textContent.length > 0) {
    const textSample = textContent.substring(0, 5000);

    // Extract court from text
    if (!metadata.court_name) {
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
    }

    // Extract sections if not in metadata
    if (metadata.sections_cited.length === 0) {
      const sectionMatches = textSample.matchAll(/Section\s+(\d+[A-Z]?)/gi);
      const sections = new Set();
      for (const match of sectionMatches) {
        sections.add(`Section ${match[1]}`);
        if (sections.size >= 10) break;
      }
      metadata.sections_cited = Array.from(sections);
    }

    // Extract articles if not in metadata
    if (metadata.articles_cited.length === 0) {
      const articleMatches = textSample.matchAll(/Article\s+(\d+[A-Z]?)/gi);
      const articles = new Set();
      for (const match of articleMatches) {
        articles.add(`Article ${match[1]}`);
        if (articles.size >= 10) break;
      }
      metadata.articles_cited = Array.from(articles);
    }
  }

  return metadata;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (match[1].length === 4) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return null;
}

module.exports = { extractLegalMetadata };
