// ============================================================
// CLASSLY — ID Generation Utility
// Simple unique ID generator (no external dependency needed).
// ============================================================

/**
 * Generate a unique ID using timestamp + random suffix.
 * Format: "cls_<timestamp>_<random>"
 * This is sufficient for a single-device offline app (v1).
 * When Supabase is added, UUIDs will be used instead.
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}
