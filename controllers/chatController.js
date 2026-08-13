const retrieveRelevantChunks = require("../services/retriever");
const generateAnswerStream = require("../services/answerGenerator");
const Conversation = require("../models/Conversation");

async function askQuestion(req, res) {
  try {
    const { question, conversationId } = req.body;

    if (!question || question.trim() === "") {
      return res.status(400).json({ message: "Question is required" });
    }

    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, owner: req.user.id });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    } else {
      conversation = await Conversation.create({ owner: req.user.id, messages: [] });
    }

    const relevantChunks = await retrieveRelevantChunks(question, req.user.id);
    const recentHistory = conversation.messages.slice(-6);

    const sources = relevantChunks.map((chunk) => ({
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      similarityScore: chunk.score,
    }));

    // --- SSE setup ---
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Send conversationId + sources immediately, before the answer starts streaming
    res.write(`event: meta\ndata: ${JSON.stringify({ conversationId: conversation._id, sources })}\n\n`);

    const fullAnswer = await generateAnswerStream(question, relevantChunks, recentHistory, (token) => {
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
    });

    conversation.messages.push({ role: "user", content: question });
    conversation.messages.push({ role: "assistant", content: fullAnswer, sources });
    await conversation.save();

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  }
}

module.exports = { askQuestion };