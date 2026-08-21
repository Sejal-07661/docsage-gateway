process.env.JWT_SECRET = "test_secret_key";

const request = require("supertest");

jest.mock("../services/embedder", () => jest.fn().mockResolvedValue([]));
jest.mock("../services/answerGenerator", () => jest.fn().mockResolvedValue("mocked answer"));
jest.mock("../queues/documentQueue", () => ({
  add: jest.fn().mockResolvedValue({}),
}));
jest.mock("../config/redis", () => ({
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}));

const app = require("../app");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/auth/signup", () => {
  test("creates a new user successfully", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Account created successfully");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.name).toBe("Test User");
    // Password hash should never be exposed in the response
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("rejects signup with an already-registered email", async () => {
    // First signup should succeed
    await request(app).post("/api/auth/signup").send({
      name: "First User",
      email: "duplicate@example.com",
      password: "password123",
    });

    // Second signup with the same email should fail
    const res = await request(app).post("/api/auth/signup").send({
      name: "Second User",
      email: "duplicate@example.com",
      password: "differentpassword",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already registered");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create a known user before each login test
    await request(app).post("/api/auth/signup").send({
      name: "Login Test User",
      email: "login@example.com",
      password: "correctpassword",
    });
  });

  test("logs in successfully with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "correctpassword",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged in successfully");
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("login@example.com");
  });

  test("rejects login with incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
    expect(res.body.token).toBeUndefined();
  });

  test("rejects login for a non-existent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@example.com",
      password: "anypassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});