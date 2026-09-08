export function severityVariant(severity) {
  if (severity === "high") {
    return "destructive"
  }
  if (severity === "low") {
    return "success"
  }
  return "warning"
}

export function severityDotClass(severity) {
  if (severity === "high") {
    return "bg-destructive"
  }
  if (severity === "low") {
    return "bg-success"
  }
  return "bg-warning"
}

export function findingTone(severity) {
  if (severity === "high") {
    return "bg-destructive/10"
  }
  if (severity === "low") {
    return "bg-success/10"
  }
  return "bg-warning/10"
}

export function highestSeverity(findings) {
  if (findings.some((finding) => finding.severity === "high")) {
    return "high"
  }
  if (findings.some((finding) => finding.severity === "medium")) {
    return "medium"
  }
  return "low"
}
