import express from "express"

const port = Number(process.env.PORT) || 3001
const app = express()

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${port}`)
})
