const { RateLimiterRedis } = require("rate-limiter-flexible");
const redisClient = require("../config/redis");

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "ratelimit",
  points: 10,
  duration: 60,
});

async function rateLimitMiddleware(req, res, next) {
  try {
    await rateLimiter.consume(req.user.id);
    next();
  } catch (rejRes) {
    res.status(429).json({
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: Math.ceil(rejRes.msBeforeNext / 1000),
    });
  }
}

module.exports = rateLimitMiddleware;