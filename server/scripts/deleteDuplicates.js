const fs = require('fs');
const path = require('path');

const customDocsPath = path.resolve(__dirname, '../storage/documents/custom-documents');
const duplicatesFile = path.join(__dirname, 'duplicates_to_delete.json');

// Read the list of duplicates
const duplicates = JSON.parse(fs.readFileSync(duplicatesFile, 'utf8'));

console.log('=== DELETING DUPLICATE FILES ===');
console.log('Total files to delete:', duplicates.length);
console.log('');

let deleted = 0;
let failed = 0;
let notFound = 0;

duplicates.forEach((file, index) => {
  const filePath = path.join(customDocsPath, file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted++;
      if ((index + 1) % 100 === 0) {
        console.log(`Deleted ${deleted} files...`);
      }
    } else {
      notFound++;
    }
  } catch (error) {
    console.error(`Failed to delete ${file}:`, error.message);
    failed++;
  }
});

console.log('');
console.log('=== DELETION COMPLETE ===');
console.log('Successfully deleted:', deleted);
console.log('Not found:', notFound);
console.log('Failed:', failed);

// Verify the result
const remainingFiles = fs.readdirSync(customDocsPath).filter(f => f.endsWith('.json'));
console.log('');
console.log('Files remaining in custom-documents:', remainingFiles.length);
console.log('Expected remaining:', 22129 - deleted);
