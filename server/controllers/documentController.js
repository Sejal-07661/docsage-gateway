const fs = require("fs");
const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const documentQueue = require("../queues/documentQueue");

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const document = await Document.create({
      owner: req.user.id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
    });

    await documentQueue.add("process-document", {
      documentId: document._id.toString(),
      filePath: document.filePath,
      ownerId: req.user.id,
    });

    res.status(202).json({
      message: "Document uploaded, processing started",
      document: {
        id: document._id,
        originalName: document.originalName,
        status: document.embeddingStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

async function listDocuments(req, res) {
  try {
    const documents = await Document.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: documents.length, documents });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

async function getDocumentStatus(req, res) {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json({
      success: true,
      status: document.embeddingStatus,
      chunkCount: document.chunkCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Remove the physical file from disk, ignore if it's already missing
    fs.unlink(document.filePath, (err) => {
      if (err) console.error("Failed to delete file from disk:", err.message);
    });

    // Remove all chunks/embeddings tied to this document
    await Chunk.deleteMany({ document: document._id });

    await document.deleteOne();

    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

async function reprocessDocument(req, res) {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Clear old chunks before reprocessing so we don't end up with duplicates
    await Chunk.deleteMany({ document: document._id });

    document.embeddingStatus = "pending";
    document.chunkCount = 0;
    await document.save();

    await documentQueue.add("process-document", {
      documentId: document._id.toString(),
      filePath: document.filePath,
      ownerId: req.user.id,
    });

    res.status(202).json({ success: true, message: "Reprocessing started" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  deleteDocument,
  reprocessDocument,
};