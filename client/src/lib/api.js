import { apiErrorFromResponse } from "@/lib/app-toast"

export const API_BASE = "/api/v1"

export function apiUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}${suffix}`
}

export async function authedFetch(getToken, path, options = {}) {
  const { method, body, fallback = "Request failed", parseJson = true } = options
  const token = await getToken()
  const response = await fetch(apiUrl(path), {
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
