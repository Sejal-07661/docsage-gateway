require("dotenv").config();
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const connection = require("./config/redis");
const Document = require("./models/Document");
const processDocument = require("./services/documentProcessor");

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Worker connected to MongoDB"))
  .catch((err) => console.error("Worker MongoDB connection failed:", err.message));

const worker = new Worker(
  "document-processing",
  async (job) => {
    const { documentId, filePath, ownerId } = job.data;
    console.log(`Processing document ${documentId}...`);

    await Document.findByIdAndUpdate(documentId, { embeddingStatus: "processing" });

    await processDocument(documentId, filePath, ownerId);

    console.log(`Finished processing document ${documentId}`);
  },
  { connection }
);

worker.on("failed", async (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
  await Document.findByIdAndUpdate(job.data.documentId, { embeddingStatus: "failed" });
});

console.log("Worker started, waiting for jobs...");