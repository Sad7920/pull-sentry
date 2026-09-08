import { toast } from "sonner"

const duration = 4500

export function toastSuccess(title, description) {
  toast.success(title, { description, duration })
}

export function toastError(title, description) {
  toast.error(title, { description, duration })
}

export function toastWarning(title, description) {
  toast.warning(title, { description, duration })
}

export function toastApiError(error, fallbackTitle = "Request failed") {
  const message = error?.message || "Something went wrong. Try again."

  if (error?.status === 429 || /too many requests|rate limit/i.test(message)) {
    toastError("Too many requests", message)
    return
  }

  toastError(fallbackTitle, message)
}

export async function apiErrorFromResponse(response, fallback) {
  const data = await response.json().catch(() => ({}))
  const error = new Error(data.error ?? fallback)
  error.status = response.status
  return error
}
