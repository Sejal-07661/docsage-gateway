const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateAnswer(question, relevantChunks, conversationHistory = []) {
  const context = relevantChunks
    .map((chunk, i) => `[Source ${i + 1}]: ${chunk.text}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful assistant that answers questions based ONLY on the provided context from the user's documents. If the answer isn't in the context, say "I don't have enough information in the provided documents to answer that." Use the conversation history to understand follow-up questions and references like "it" or "the first one."

Context:
${context}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: question },
  ];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
}

module.exports = generateAnswer;