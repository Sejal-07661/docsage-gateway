const retrieveRelevantChunks = require("../services/retriever");
const generateAnswerStream = require("../services/answerGenerator");
const Conversation = require("../models/Conversation");
const Document = require("../models/Document");

async function askQuestion(req, res) {
  try {
    const { question, conversationId, documentIds = [] } = req.body;

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
      const title = question.length > 50 ? question.slice(0, 50) + "..." : question;
      conversation = await Conversation.create({ owner: req.user.id, messages: [], title });
    }

    const relevantChunks = await retrieveRelevantChunks(question, req.user.id, documentIds);
    const recentHistory = conversation.messages.slice(-6);

    const uniqueDocumentIds = [...new Set(relevantChunks.map((c) => c.documentId.toString()))];
    const documents = await Document.find({ _id: { $in: uniqueDocumentIds } }).select("originalName");
    const documentNameMap = Object.fromEntries(documents.map((d) => [d._id.toString(), d.originalName]));

    const sources = relevantChunks.map((chunk) => ({
      documentId: chunk.documentId,
      documentName: documentNameMap[chunk.documentId.toString()] || "Unknown document",
      chunkIndex: chunk.chunkIndex,
      similarityScore: chunk.score,
      text: chunk.text,
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

async function listConversations(req, res) {
  try {
    const conversations = await Conversation.find({ owner: req.user.id })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

async function getConversation(req, res) {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.status(200).json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

module.exports = { askQuestion, listConversations, getConversation };