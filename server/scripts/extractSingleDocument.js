const { extractLegalMetadata } = require('../utils/documentHooks/extractLegalMetadata');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

async function extract() {
  const docId = process.argv[2] || 'd10e65f0-934d-4023-93f3-ab28f99ce1e6';
  
  const doc = await prisma.workspace_documents.findUnique({
    where: { docId }
  });
  
  if (!doc) {
    console.log('Document not found');
    await prisma.$disconnect();
    return;
  }
  
  const collectorHotdir = path.join(__dirname, '../../collector/hotdir');
  const fileName = 'ZUNJARRAO-BHIKAJI-NAGARKAR-VS-UNION-OF-INDIA-AND-ORS-(06-08-1999)-1999-INSC-311.pdf';
  const pdfPath = path.join(collectorHotdir, fileName);
  
  console.log('Extracting from:', pdfPath);
  const result = await extractLegalMetadata(doc, pdfPath);
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await prisma.$disconnect();
}

extract();
