const fs = require('fs');
const path = require('path');

const customDocsPath = path.resolve(__dirname, '../storage/documents/custom-documents');
const files = fs.readdirSync(customDocsPath).filter(f => f.endsWith('.json'));

console.log('Total files:', files.length);

// Group files by their content hash or base name
const fileMap = new Map();

files.forEach(file => {
  // Remove the UUID part at the end
  // Format: NAME-uuid.json where uuid is 8-4-4-4-12 hex pattern
  const match = file.match(/^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.json$/i);
  
  if (match) {
    const baseName = match[1];
    const uuid = match[2];
    
    if (!fileMap.has(baseName)) {
      fileMap.set(baseName, []);
    }
    fileMap.get(baseName).push({ file, uuid });
  } else {
    console.log('No UUID match:', file);
  }
});

// Find duplicates
let duplicateCount = 0;
let uniqueCount = 0;
const duplicatesToDelete = [];

fileMap.forEach((files, baseName) => {
  if (files.length > 1) {
    console.log(`\nDuplicate: ${baseName} (${files.length} copies)`);
    // Keep the first one, mark others for deletion
    for (let i = 1; i < files.length; i++) {
      duplicatesToDelete.push(files[i].file);
      console.log(`  DELETE: ${files[i].file}`);
    }
    duplicateCount += files.length - 1;
  }
  uniqueCount++;
});

console.log('\n=== SUMMARY ===');
console.log('Unique documents:', uniqueCount);
console.log('Duplicate files to delete:', duplicateCount);
console.log('Total files:', files.length);

// Export the list
fs.writeFileSync(
  path.join(__dirname, 'duplicates_to_delete.json'),
  JSON.stringify(duplicatesToDelete, null, 2)
);

console.log('\nDuplicate list saved to: duplicates_to_delete.json');
console.log('Total files to delete:', duplicatesToDelete.length);
