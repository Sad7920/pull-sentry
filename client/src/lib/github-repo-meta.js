const LANGUAGE_COLORS = {
  C: "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  CSS: "#563d7c",
  Dart: "#00B4AB",
  Dockerfile: "#384d54",
  Elixir: "#6e4a7e",
  Go: "#00ADD8",
  GraphQL: "#e10098",
  HTML: "#e34c26",
  Haskell: "#5e5086",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  JSON: "#292929",
  Kotlin: "#A97BFF",
  Lua: "#000080",
  Markdown: "#083fa1",
  PHP: "#4F5D95",
  Python: "#3572A5",
  Ruby: "#701516",
  Rust: "#dea584",
  SCSS: "#c6538c",
  Scala: "#c22d40",
  Shell: "#89e051",
  Solidity: "#AA6746",
  Swift: "#F05138",
  TypeScript: "#3178c6",
  Vue: "#41b883",
}

export function languageColor(language) {
  if (!language) {
    return null
  }

  return LANGUAGE_COLORS[language] ?? null
}

export function formatStarCount(count) {
  const value = Number(count)
  if (!Number.isFinite(value) || value < 0) {
    return "0"
  }

  return value.toLocaleString()
}

export function formatTimeAgo(isoDate) {
  const then = Date.parse(isoDate)
  if (!Number.isFinite(then)) {
    return null
  }

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))

  if (seconds < 45) {
    return "just now"
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`
  }

  const days = Math.round(hours / 24)
  if (days < 30) {
    return `${days} ${days === 1 ? "day" : "days"} ago`
  }

  const months = Math.round(days / 30)
  if (months < 12) {
    return `${months} ${months === 1 ? "month" : "months"} ago`
  }

  const years = Math.round(days / 365)
  return `${years} ${years === 1 ? "year" : "years"} ago`
}

export function formatUpdatedAgo(isoDate) {
  const ago = formatTimeAgo(isoDate)
  if (!ago) {
    return null
  }

  if (ago === "just now") {
    return "Updated just now"
  }

  return `Updated ${ago}`
}

export function formatIndexedAgo(isoDate) {
  const ago = formatTimeAgo(isoDate)
  if (!ago) {
    return null
  }

  if (ago === "just now") {
    return "Indexed just now"
  }

  return `Indexed ${ago}`
}
