/**
 * Forum post topic — the category of a forum post (repair, maintenance, …).
 * Distinct from MotorcycleCategory (motorcycle types). Hardcoded source of truth,
 * replacing the former Category collection.
 *
 * Enum values are stable code identifiers (stored in the DB). The human-facing
 * label + icon live frontend-side in `frontend/app/utils/postCategory.ts`,
 * which mirrors this enum.
 */
export enum PostCategory {
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  RACING = 'racing',
  OPINION = 'opinion',
  MODEL = 'model'
}
