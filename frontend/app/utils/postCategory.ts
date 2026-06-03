/**
 * Forum post categories — mirror of the backend PostCategory enum.
 * Hardcoded source of truth (the Category collection no longer exists).
 */
export enum PostCategory {
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  RACING = 'racing',
  OPINION = 'opinion',
  MODEL = 'model'
}

export const POST_CATEGORY_META: Record<
  PostCategory,
  { label: string; icon: string }
> = {
  [PostCategory.REPAIR]: { label: 'Réparation', icon: 'i-lucide-wrench' },
  [PostCategory.MAINTENANCE]: { label: 'Entretien', icon: 'i-lucide-cog' },
  [PostCategory.RACING]: { label: 'Course', icon: 'i-lucide-motorbike' },
  [PostCategory.OPINION]: { label: 'Opinion', icon: 'i-lucide-megaphone' },
  [PostCategory.MODEL]: { label: 'Modèle', icon: 'i-lucide-component' }
}

/** Ready-to-use options for selects / filter lists. */
export const POST_CATEGORY_OPTIONS = (
  Object.values(PostCategory) as PostCategory[]
).map((value) => ({
  value,
  label: POST_CATEGORY_META[value].label,
  icon: POST_CATEGORY_META[value].icon
}))
