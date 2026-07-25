const { pipeline } = require("@xenova/transformers");

let embedderPipeline = null;

async function getEmbedder() {
  if (!embedderPipeline) {
    console.log("Loading embedding model (first time only, may take a moment)...");
    embedderPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedderPipeline;
}

async function generateEmbedding(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

module.exports = generateEmbedding;