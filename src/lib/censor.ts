/**
 * Replaces any occurrence of 'wbsedcl' (case-insensitive) with 'w*****l'.
 * Preserves casing pattern if uppercase.
 */
export function maskWbsedcl(text?: string | null): string {
  if (!text) return text || '';
  return text.replace(/wbsedcl/gi, (match) => {
    if (match === match.toUpperCase()) return 'W*****L';
    if (match[0] === match[0].toUpperCase()) return 'W*****l';
    return 'w*****l';
  });
}
