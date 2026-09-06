/**
 * Normalizes text for search by removing diacritics/accents (e.g. á -> a, ñ -> n, etc.),
 * trimming whitespace, and converting to lowercase.
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Checks if a target string includes a search query, ignoring accents and case.
 */
export function matchesSearch(target: string | null | undefined, query: string | null | undefined): boolean {
  if (!query) return true;
  if (!target) return false;
  return normalizeSearchText(target).includes(normalizeSearchText(query));
}
