/**
 * Extract Metadata from PDF Files
 * Reads embedded metadata directly from PDF files
 */

const { PrismaClient } = require("@prisma/client");
const { LegalJudgmentMetadata } = require("../models/legalJudgmentMetadata");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const prisma = new PrismaClient();

// Map PDF metadata fields to our schema
function mapPdfMetadata(pdfInfo, pdfMetadata, fileName) {
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
    page_count: pdfInfo.numpages || null,
    word_count: null,
    summary: null,
  };

  // Extract from PDF metadata fields
  if (pdfMetadata) {
    // Standard PDF fields
    metadata.case_title = pdfMetadata.Title || pdfMetadata.title;
    metadata.summary = pdfMetadata.Subject || pdfMetadata.subject;
    
    // Custom fields (check various naming conventions)
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
    if (judgmentDate) {
      metadata.judgment_date = parseDate(judgmentDate);
    }
    
    const filingDate = pdfMetadata.FilingDate || pdfMetadata.filing_date || pdfMetadata['Filing Date'];
    if (filingDate) {
      metadata.filing_date = parseDate(filingDate);
    }

    // Arrays (might be comma-separated strings)
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

    const articles = pdfMetadata.ArticlesCited || pdfMetadata.articles_cited || pdfMetadata['Articles Cited'];
    if (articles) {
      metadata.articles_cited = typeof articles === 'string' ? articles.split(',').map(a => a.trim()) : articles;
    }
  }

  // Fallback to filename extraction if metadata is missing
  if (!metadata.case_title) {
    const vsMatch = fileName.match(/(.+?)\s+VS\s+(.+?)(?:W\.P\.|C\.A\.|SLP|Crl\.A\.|\.pdf)/i);
    if (vsMatch) {
      metadata.petitioner = vsMatch[1].trim().replace(/-/g, ' ');
      metadata.respondent = vsMatch[2].trim().replace(/-/g, ' ');
      metadata.case_title = `${metadata.petitioner} vs ${metadata.respondent}`;
    } else {
      metadata.case_title = fileName.replace(/\.pdf$/i, '').replace(/-[a-f0-9]{8,}\.json$/, '');
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

  return metadata;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        // DD-MM-YYYY or DD/MM/YYYY
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }

  return null;
}

async function extractPdfMetadata() {
  try {
    console.log("🚀 Starting PDF metadata extraction...\n");

    // Get all documents
    const documents = await prisma.workspace_documents.findMany({
      include: {
        workspace: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📄 Found ${documents.length} documents\n`);

    const storageDir = path.join(__dirname, '../../collector/hotdir');
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of documents) {
      processed++;
      const fileName = path.basename(doc.docpath);
      console.log(`\n[${processed}/${documents.length}] ${fileName}`);

      try {
        // Check if metadata already exists
        const existing = await LegalJudgmentMetadata.get(doc.docId);
        if (existing) {
          console.log(`  ⏭️  Already exists, skipping...`);
          skipped++;
          continue;
        }

        // Find the original PDF file
        const pdfFileName = fileName.replace(/-[a-f0-9-]+\.json$/, '');
        const pdfPath = path.join(storageDir, pdfFileName);

        if (!fs.existsSync(pdfPath)) {
          console.log(`  ⚠️  PDF not found: ${pdfPath}`);
          failed++;
          continue;
        }

        // Read PDF
        console.log(`  📖 Reading PDF...`);
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdf(dataBuffer);

        console.log(`  🔍 Extracting metadata...`);
        console.log(`     Pages: ${pdfData.numpages}`);
        console.log(`     PDF Metadata fields: ${Object.keys(pdfData.metadata || pdfData.info || {}).length}`);

        // Extract metadata
        const metadata = mapPdfMetadata(
          pdfData.info || {},
          pdfData.metadata || pdfData.info || {},
          fileName
        );

        // Calculate word count from text
        if (pdfData.text) {
          metadata.word_count = pdfData.text.split(/\s+/).length;
        }

        // Save to database
        await LegalJudgmentMetadata.create({
          doc_id: doc.docId,
          workspace_id: doc.workspaceId,
          ...metadata,
        });

        console.log(`  ✅ Saved successfully`);
        console.log(`     Title: ${metadata.case_title || 'N/A'}`);
        console.log(`     Court: ${metadata.court_name || 'N/A'}`);
        console.log(`     Date: ${metadata.judgment_date || 'N/A'}`);
        console.log(`     Type: ${metadata.case_type || 'N/A'}`);
        
        succeeded++;

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total: ${documents.length}`);
    console.log(`   ✅ Succeeded: ${succeeded}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n✨ PDF metadata extraction complete!`);

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
extractPdfMetadata();
