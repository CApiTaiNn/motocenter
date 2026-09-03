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
