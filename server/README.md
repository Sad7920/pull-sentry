# Server

Express API for PullSentry. Bind address is `0.0.0.0` and the port is `PORT` or `3001`.

## API versions

All HTTP routes are mounted at **`/api/v1`**. Add new endpoints on the v1 router in `api/v1.js` (for example `POST /api/v1/repos/connect`).

Do not add unversioned `/api/...` routes. If a change cannot stay backward compatible, introduce **`/api/v2`** and keep v1 until clients can move over.

Health: `GET /api/v1/health` → `{ "status": "ok" }`.
