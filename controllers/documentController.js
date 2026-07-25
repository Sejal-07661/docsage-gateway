const Document = require("../models/Document");
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

module.exports = { uploadDocument, listDocuments, getDocumentStatus };