const extractTextFromPDF = require("./pdfExtractor");
const chunkText = require("./chunker");
const generateEmbedding = require("./embedder");
const Chunk = require("../models/Chunk");
const Document = require("../models/Document");

async function processDocument(documentId, filePath, ownerId) {
  const text = await extractTextFromPDF(filePath);
  const chunks = chunkText(text);

  if (chunks.length === 0 || text.trim().length === 0) {
    await Document.findByIdAndUpdate(documentId, {
      embeddingStatus: "failed",
      chunkCount: 0,
    });
    throw new Error("No extractable text found in this document. It may be a scanned image without a text layer.");
  }

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);

    await Chunk.create({
      document: documentId,
      owner: ownerId,
      text: chunks[i],
      embedding,
      chunkIndex: i,
    });
  }

  await Document.findByIdAndUpdate(documentId, {
    embeddingStatus: "completed",
    chunkCount: chunks.length,
  });
}

module.exports = processDocument;