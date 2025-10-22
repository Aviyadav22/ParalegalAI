/**
 * Populate Legal Metadata Script
 * Extracts and stores metadata for all existing documents
 */

const { PrismaClient } = require("@prisma/client");
const { LegalMetadataExtractor } = require("../utils/metadataExtractor/legalMetadataExtractor");
const { LegalJudgmentMetadata } = require("../models/legalJudgmentMetadata");
const { DocumentVectors } = require("../models/vectors");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function populateMetadata() {
  try {
    console.log("🚀 Starting metadata population...\n");

    // Get all documents from workspace
    const documents = await prisma.workspace_documents.findMany({
      include: {
        workspace: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📄 Found ${documents.length} documents to process\n`);

    if (documents.length === 0) {
      console.log("No documents found. Exiting.");
      return;
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const doc of documents) {
      processed++;
      console.log(`\n[${processed}/${documents.length}] Processing: ${doc.docpath}`);

      try {
        // Check if metadata already exists
        const existing = await LegalJudgmentMetadata.get(doc.docId);
        if (existing) {
          console.log(`  ⏭️  Metadata already exists, skipping...`);
          succeeded++;
          continue;
        }

        // Get document vectors to extract text
        const vectors = await prisma.document_vectors.findMany({
          where: {
            docId: doc.docId,
          },
          take: 50, // Get first 50 chunks for metadata extraction
          orderBy: {
            id: 'asc',
          },
        });

        if (!vectors || vectors.length === 0) {
          console.log(`  ⚠️  No vectors found for document`);
          failed++;
          continue;
        }

        // Combine text from vectors
        const documentText = vectors.map(v => v.text).join('\n\n');
        const fileName = path.basename(doc.docpath);

        console.log(`  🔍 Extracting metadata...`);
        
        // Extract metadata using LLM
        const metadata = await LegalMetadataExtractor.extractMetadata(
          documentText,
          fileName
        );

        // Save to database
        await LegalJudgmentMetadata.create({
          doc_id: doc.docId,
          workspace_id: doc.workspaceId,
          ...metadata,
        });

        console.log(`  ✅ Metadata saved successfully`);
        console.log(`     Court: ${metadata.court_name || 'N/A'}`);
        console.log(`     Date: ${metadata.judgment_date || 'N/A'}`);
        console.log(`     Type: ${metadata.case_type || 'N/A'}`);
        
        succeeded++;

        // Rate limiting: wait 2 seconds between documents
        if (processed < documents.length) {
          console.log(`  ⏳ Waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        failed++;
        
        // Continue with next document
        continue;
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total: ${documents.length}`);
    console.log(`   ✅ Succeeded: ${succeeded}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n✨ Metadata population complete!`);

  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateMetadata();
