const Chunk = require("../models/Chunk");
const generateEmbedding = require("./embedder");
const cosineSimilarity = require("./similarity");

async function retrieveRelevantChunks(question, ownerId, documentIds = [], topK = 3) {
  const questionEmbedding = await generateEmbedding(question);

  const query = { owner: ownerId };
  if (documentIds.length > 0) {
    query.document = { $in: documentIds };
  }

  const allChunks = await Chunk.find(query);

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