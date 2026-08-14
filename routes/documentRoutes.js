const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  deleteDocument,
  reprocessDocument,
} = require("../controllers/documentController");

router.post("/upload", requireAuth, upload.single("file"), uploadDocument);
router.get("/", requireAuth, listDocuments);
router.get("/:id/status", requireAuth, getDocumentStatus);
router.delete("/:id", requireAuth, deleteDocument);
router.post("/:id/reprocess", requireAuth, reprocessDocument);

module.exports = router;