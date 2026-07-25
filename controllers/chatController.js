const retrieveRelevantChunks = require("../services/retriever");
const generateAnswer = require("../services/answerGenerator");
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

    const answer = await generateAnswer(question, relevantChunks, recentHistory);

    const sources = relevantChunks.map((chunk) => ({
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      similarityScore: chunk.score,
    }));

    conversation.messages.push({ role: "user", content: question });
    conversation.messages.push({ role: "assistant", content: answer, sources });
    await conversation.save();

    res.status(200).json({
      conversationId: conversation._id,
      answer,
      sources,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
}

module.exports = { askQuestion };