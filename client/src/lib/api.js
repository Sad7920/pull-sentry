import { apiErrorFromResponse } from "@/lib/app-toast"

export async function authedFetch(getToken, path, options = {}) {
  const { method, body, fallback = "Request failed", parseJson = true } = options
  const token = await getToken()
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw await apiErrorFromResponse(response, fallback)
  }

  if (!parseJson || response.status === 204) {
    return null
  }

  return response.json().catch(() => ({}))
}
