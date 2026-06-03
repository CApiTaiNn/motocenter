/**
 * Forum post topic — the category of a forum post (repair, maintenance, …).
 * Distinct from MotorcycleCategory (motorcycle types). Hardcoded source of truth.
 *
 * Enum values are stable code identifiers (stored in the DB); POST_CATEGORY_META
 * holds the human-facing label + icon, replacing the former Category collection.
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
