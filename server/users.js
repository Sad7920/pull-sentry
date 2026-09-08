import { requireCurrentUser } from "./lib/auth.js"
import { parseSyncUserBody } from "./lib/validate.js"
import { syncUserAccount } from "./services/users.js"

export async function syncUser(req, res) {
  req.sentryStep = "users.sync"
  const input = parseSyncUserBody(req.body)
  const payload = await syncUserAccount(input)
  res.json(payload)
}
