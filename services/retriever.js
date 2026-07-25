const Chunk = require("../models/Chunk");
const generateEmbedding = require("./embedder");
const cosineSimilarity = require("./similarity");

async function retrieveRelevantChunks(question, ownerId, topK = 3) {
  const questionEmbedding = await generateEmbedding(question);

  const allChunks = await Chunk.find({ owner: ownerId });

  const scoredChunks = allChunks.map((chunk) => ({
    text: chunk.text,
    documentId: chunk.document,
    chunkIndex: chunk.chunkIndex,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK);
}

module.exports = retrieveRelevantChunks;