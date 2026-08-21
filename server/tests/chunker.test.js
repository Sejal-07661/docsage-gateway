const chunkText = require("../services/chunker");

describe("chunkText", () => {
  test("returns a single chunk when text is shorter than chunkSize", () => {
    const text = "This is a short sentence with few words";
    const chunks = chunkText(text, 500, 50);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text);
  });

  test("splits text into multiple chunks when it exceeds chunkSize", () => {
    // Generate 1200 words — should require more than one chunk at chunkSize=500
    const words = Array.from({ length: 1200 }, (_, i) => `word${i}`);
    const text = words.join(" ");

    const chunks = chunkText(text, 500, 50);

    expect(chunks.length).toBeGreaterThan(1);
  });

  test("each chunk (except possibly the last) contains exactly chunkSize words", () => {
    const words = Array.from({ length: 1200 }, (_, i) => `word${i}`);
    const text = words.join(" ");

    const chunks = chunkText(text, 500, 50);

    // Check all chunks except the last, since the last chunk may be shorter
    for (let i = 0; i < chunks.length - 1; i++) {
      const wordCount = chunks[i].split(" ").length;
      expect(wordCount).toBe(500);
    }
  });

  test("consecutive chunks overlap by the specified number of words", () => {
    const words = Array.from({ length: 1200 }, (_, i) => `word${i}`);
    const text = words.join(" ");

    const chunks = chunkText(text, 500, 50);

    const firstChunkWords = chunks[0].split(" ");
    const secondChunkWords = chunks[1].split(" ");

    // The last 50 words of chunk 1 should match the first 50 words of chunk 2
    const overlapFromFirst = firstChunkWords.slice(-50);
    const overlapFromSecond = secondChunkWords.slice(0, 50);

    expect(overlapFromFirst).toEqual(overlapFromSecond);
  });

  test("returns an empty array for empty input", () => {
    const chunks = chunkText("", 500, 50);
    expect(chunks).toEqual([]);
  });

  test("handles input with irregular whitespace correctly", () => {
    const text = "word1   word2\nword3\t\tword4";
    const chunks = chunkText(text, 500, 50);

    expect(chunks[0]).toBe("word1 word2 word3 word4");
  });

  test("respects custom chunkSize and overlap parameters", () => {
    const words = Array.from({ length: 30 }, (_, i) => `word${i}`);
    const text = words.join(" ");

    const chunks = chunkText(text, 10, 2);

    expect(chunks[0].split(" ").length).toBe(10);
    // step size = chunkSize - overlap = 8, so chunk 2 starts at word index 8
    expect(chunks[1].split(" ")[0]).toBe("word8");
  });
});