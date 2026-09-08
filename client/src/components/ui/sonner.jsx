import { Toaster as Sonner } from "sonner"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react"

function Toaster({ ...props }) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      closeButton
      richColors
      duration={4500}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4 text-success" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <AlertCircleIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={{
        "--normal-bg": "var(--card)",
        "--normal-text": "var(--foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
        "--success-bg": "oklch(from var(--success) 0.96 0.04 h)",
        "--success-text": "oklch(from var(--success) 0.4 0.12 h)",
        "--success-border": "oklch(from var(--success) 0.84 0.08 h)",
        "--error-bg": "oklch(from var(--destructive) 0.96 0.04 h)",
        "--error-text": "oklch(from var(--destructive) 0.42 0.16 h)",
        "--error-border": "oklch(from var(--destructive) 0.84 0.1 h)",
        "--warning-bg": "oklch(from var(--warning) 0.96 0.05 h)",
        "--warning-text": "oklch(from var(--warning) 0.42 0.12 h)",
        "--warning-border": "oklch(from var(--warning) 0.84 0.1 h)",
      }}
      {...props}
    />
  )
}

export { Toaster }
