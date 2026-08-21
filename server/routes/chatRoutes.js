const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const rateLimitMiddleware = require("../middleware/rateLimiter");
const { askQuestion, listConversations, getConversation } = require("../controllers/chatController");

router.post("/ask", requireAuth, rateLimitMiddleware, askQuestion);
router.get("/conversations", requireAuth, listConversations);
router.get("/conversations/:id", requireAuth, getConversation);

module.exports = router;