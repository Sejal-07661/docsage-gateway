const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const rateLimitMiddleware = require("../middleware/rateLimiter");
const { askQuestion } = require("../controllers/chatController");

router.post("/ask", requireAuth, rateLimitMiddleware, askQuestion);

module.exports = router;