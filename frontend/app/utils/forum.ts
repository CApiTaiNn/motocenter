const CATEGORY_PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316'
] as const

export function categoryAccent(name: string | undefined): string {
  if (!name) return CATEGORY_PALETTE[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0]
}

export function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return ''
  const now = Date.now()
  const past = new Date(dateString).getTime()
  const diff = now - past

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${days} j`
}
