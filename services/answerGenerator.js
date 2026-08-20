const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateAnswerStream(question, relevantChunks, conversationHistory = [], onChunk) {
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

  const stream = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    temperature: 0.2,
    stream: true,
  });

  let fullAnswer = "";

  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content || "";
    if (token) {
      fullAnswer += token;
      onChunk(token);
    }
  }

  return fullAnswer;
}

module.exports = generateAnswerStream;