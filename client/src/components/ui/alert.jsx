import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-2 [&_svg]:translate-y-0.5 [&_svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90 [&_svg]:text-destructive",
        warning:
          "border-warning/20 bg-warning/10 text-warning *:data-[slot=alert-description]:text-warning/90 [&_svg]:text-warning",
        success:
          "border-success/20 bg-success/10 text-success *:data-[slot=alert-description]:text-success/90 [&_svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
