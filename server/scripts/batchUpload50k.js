/**
 * Batch Upload Script for 50K PDFs
 * Optimized for parallel processing with progress tracking
 */

const { PrismaClient } = require("@prisma/client");
const { initializeApiKeyRotator } = require("../utils/ApiKeyRotator");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  pdfDirectory: process.argv[2] || "/path/to/your/50k/pdfs",
  workspaceSlug: process.argv[3] || "research",
  batchSize: 100,
  progressFile: "/home/azureuser/upload_progress.json",
};

/**
 * Main batch upload function
 */
async function batchUpload() {
  console.log('\n' + '='.repeat(70));
  console.log('BATCH UPLOAD - 50K PDFs');
  console.log('='.repeat(70));
  console.log(`PDF Directory: ${CONFIG.pdfDirectory}`);
  console.log(`Workspace: ${CONFIG.workspaceSlug}`);
  console.log(`Batch Size: ${CONFIG.batchSize}`);
  console.log('='.repeat(70) + '\n');

  // Initialize API key rotator
  const keyRotator = initializeApiKeyRotator();
  console.log(`✅ Initialized with ${keyRotator.apiKeys.length} API key(s)\n`);

  // Get workspace
  const workspace = await prisma.workspaces.findUnique({
    where: { slug: CONFIG.workspaceSlug }
  });

  if (!workspace) {
    console.error(`❌ Workspace '${CONFIG.workspaceSlug}' not found!`);
    process.exit(1);
  }

  console.log(`✅ Found workspace: ${workspace.name} (ID: ${workspace.id})\n`);

  // Get all PDF files
  const pdfFiles = getAllPdfFiles(CONFIG.pdfDirectory);
  console.log(`📁 Found ${pdfFiles.length} PDF files\n`);

  if (pdfFiles.length === 0) {
    console.log('No PDF files found. Exiting.');
    process.exit(0);
  }

  // Load progress
  const progress = loadProgress();
  const processedFiles = new Set(progress.processed || []);
  const remainingFiles = pdfFiles.filter(f => !processedFiles.has(f));

  console.log(`📊 Progress: ${processedFiles.size}/${pdfFiles.length} files already processed`);
  console.log(`📋 Remaining: ${remainingFiles.length} files\n`);

  if (remainingFiles.length === 0) {
    console.log('✅ All files already processed!');
    process.exit(0);
  }

  // Process in batches
  const batches = chunkArray(remainingFiles, CONFIG.batchSize);
  console.log(`📦 Split into ${batches.length} batches of ${CONFIG.batchSize}\n`);

  const startTime = Date.now();
  let totalProcessed = processedFiles.size;
  let totalFailed = progress.failed?.length || 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`BATCH ${i + 1}/${batches.length} - Processing ${batch.length} files`);
    console.log('='.repeat(70));

    try {
      // Upload batch to collector
      const batchResults = await uploadBatch(batch, workspace);

      // Update progress
      batchResults.successful.forEach(file => {
        processedFiles.add(file);
        totalProcessed++;
      });

      batchResults.failed.forEach(file => {
        if (!progress.failed) progress.failed = [];
        progress.failed.push(file);
        totalFailed++;
      });

      // Save progress
      progress.processed = Array.from(processedFiles);
      saveProgress(progress);

      // Print statistics
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (totalProcessed / elapsed).toFixed(2);
      const remaining = pdfFiles.length - totalProcessed;
      const eta = (remaining / rate / 60).toFixed(1);

      console.log(`\n📊 PROGRESS:`);
      console.log(`   Processed: ${totalProcessed}/${pdfFiles.length} (${(totalProcessed/pdfFiles.length*100).toFixed(1)}%)`);
      console.log(`   Failed: ${totalFailed}`);
      console.log(`   Rate: ${rate} files/sec`);
      console.log(`   Elapsed: ${(elapsed/60).toFixed(1)} minutes`);
      console.log(`   ETA: ${eta} minutes`);

      // Small delay between batches
      if (i < batches.length - 1) {
        console.log(`\n⏳ Waiting 5 seconds before next batch...`);
        await sleep(5000);
      }

    } catch (batchError) {
      console.error(`\n❌ Batch ${i + 1} failed:`, batchError.message);
      console.log(`Continuing with next batch...\n`);
    }
  }

  // Final statistics
  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n' + '='.repeat(70));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(70));
  console.log(`✅ Successfully processed: ${totalProcessed}/${pdfFiles.length}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⏱️  Total time: ${(totalTime/60).toFixed(1)} minutes`);
  console.log(`📊 Average rate: ${(totalProcessed/totalTime).toFixed(2)} files/sec`);
  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
}

/**
 * Upload a batch of files
 */
async function uploadBatch(files, workspace) {
  const axios = require('axios');
  const FormData = require('form-data');
  
  const results = {
    successful: [],
    failed: [],
  };

  // Copy files to collector hotdir
  const collectorHotdir = '/home/azureuser/paralegalaiNew/collector_parallel/hotdir';
  
  for (const file of files) {
    try {
      const fileName = path.basename(file);
      const destPath = path.join(collectorHotdir, fileName);
      
      // Copy file
      fs.copyFileSync(file, destPath);
      
      // Process via collector
      const response = await axios.post('http://localhost:8888/process', {
        filename: fileName,
        options: {},
        metadata: {
          title: fileName,
          docSource: 'batch upload',
        },
      });

      if (response.data.success) {
        // Add to workspace
        const documents = response.data.documents;
        await axios.post(`http://localhost:3001/workspace/${workspace.slug}/update-embeddings`, {
          adds: documents.map(d => d.location),
          deletes: [],
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.AUTH_TOKEN}`,
          },
        });

        results.successful.push(file);
        console.log(`  ✅ ${fileName}`);
      } else {
        results.failed.push(file);
        console.log(`  ❌ ${fileName}: ${response.data.reason}`);
      }

    } catch (error) {
      results.failed.push(file);
      console.log(`  ❌ ${path.basename(file)}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Get all PDF files recursively
 */
function getAllPdfFiles(directory) {
  const files = [];
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.toLowerCase().endsWith('.pdf')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(directory);
  return files;
}

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not load progress file:', error.message);
  }
  return { processed: [], failed: [] };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  try {
    fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Could not save progress:', error.message);
  }
}

/**
 * Chunk array
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
batchUpload().catch(console.error);
