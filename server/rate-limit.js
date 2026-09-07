import { getAuth } from "@clerk/express"
import { ipKeyGenerator, rateLimit } from "express-rate-limit"

const TOO_MANY_REQUESTS = "Too many requests, try again later"

export const expensiveMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const { userId } = getAuth(req)
    if (userId) {
      return userId
    }
    return ipKeyGenerator(req.ip ?? "0.0.0.0")
  },
  handler: (_req, res) => {
    res.status(429).json({ error: TOO_MANY_REQUESTS })
  },
})
