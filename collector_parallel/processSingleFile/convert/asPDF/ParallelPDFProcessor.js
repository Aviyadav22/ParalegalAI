/**
 * Parallel PDF Processor
 * Processes PDF pages in parallel for faster extraction
 */

const { v4 } = require("uuid");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../../utils/files");
const { tokenizeString } = require("../../../utils/tokenizer");
const { default: slugify } = require("slugify");
const PDFLoader = require("./PDFLoader");
const OCRLoader = require("../../../utils/OCRLoader");
const { storeOriginalFile } = require("../../../../server/utils/originalFiles");

/**
 * Process PDF with parallel page parsing
 */
async function asPdfParallel({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  const pdfLoader = new PDFLoader(fullFilePath, {
    splitPages: true,
  });

  console.log(`-- Working ${filename} (PARALLEL MODE) --`);
  const startTime = Date.now();
  
  let docs = await pdfLoader.load();

  if (docs.length === 0) {
    console.log(
      `[asPDF-Parallel] No text content found for ${filename}. Will attempt OCR parse.`
    );
    docs = await new OCRLoader({
      targetLanguages: options?.ocr?.langList,
    }).ocrPDF(fullFilePath);
  }

  // PARALLEL: Process all pages concurrently
  const pageContents = await Promise.all(
    docs.map(async (doc, index) => {
      if (!doc.pageContent || !doc.pageContent.length) {
        return null;
      }
      
      // Log progress for large PDFs
      if (docs.length > 50 && index % 10 === 0) {
        console.log(`-- Parsed ${index}/${docs.length} pages --`);
      }
      
      return doc.pageContent;
    })
  );

  // Filter out null values
  const validPageContents = pageContents.filter(content => content !== null);

  if (!validPageContents.length) {
    console.error(`[asPDF-Parallel] Resulting text content was empty for ${filename}.`);
    trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const content = validPageContents.join("");
  const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`[asPDF-Parallel] Processed ${docs.length} pages in ${processingTime}s`);
  
  // Store the original PDF file before processing
  const originalFileResult = await storeOriginalFile({
    originalFilePath: fullFilePath,
    filename: filename,
    metadata: {
      title: metadata.title || filename,
      docAuthor: metadata.docAuthor || docs[0]?.metadata?.pdf?.info?.Creator || "no author found",
      description: metadata.description || docs[0]?.metadata?.pdf?.info?.Title || "No description found.",
      docSource: metadata.docSource || "pdf file uploaded by the user.",
      fileType: "pdf"
    }
  });

  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || filename,
    docAuthor:
      metadata.docAuthor ||
      docs[0]?.metadata?.pdf?.info?.Creator ||
      "no author found",
    description:
      metadata.description ||
      docs[0]?.metadata?.pdf?.info?.Title ||
      "No description found.",
    docSource: metadata.docSource || "pdf file uploaded by the user.",
    chunkSource: metadata.chunkSource || "",
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
    originalFileId: originalFileResult.success ? originalFileResult.fileId : null,
    originalFileName: filename,
    originalFileType: "pdf"
  };

  const document = writeToServerDocuments({
    data,
    filename: `${slugify(filename)}-${data.id}`,
    options: { parseOnly: options.parseOnly },
  });
  
  trashFile(fullFilePath);
  console.log(`[SUCCESS]: ${filename} converted & ready for embedding (${processingTime}s).\n`);
  
  return { success: true, reason: null, documents: [document] };
}

module.exports = asPdfParallel;
