const cosineSimilarity = require("../services/similarity");

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const vector = [1, 2, 3];
    const result = cosineSimilarity(vector, vector);
    expect(result).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const vectorA = [1, 0];
    const vectorB = [0, 1];
    const result = cosineSimilarity(vectorA, vectorB);
    expect(result).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const vectorA = [1, 2, 3];
    const vectorB = [-1, -2, -3];
    const result = cosineSimilarity(vectorA, vectorB);
    expect(result).toBeCloseTo(-1, 5);
  });

  it("returns 0 when one vector is all zeros", () => {
    const vectorA = [0, 0, 0];
    const vectorB = [1, 2, 3];
    const result = cosineSimilarity(vectorA, vectorB);
    expect(result).toBe(0);
  });
});