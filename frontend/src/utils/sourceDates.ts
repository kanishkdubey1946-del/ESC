/**
 * Format source dates for COMET UI.
 * Only formats values that parse as real dates from backend metadata.
 * Never invents or substitutes today's date as a publication date.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function parseSourceDate(value?: string | null): Date | null {
  if (!value || !String(value).trim()) return null;
  const text = String(value).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // ISO datetime
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) {
    return new Date(iso);
  }

  // RSS-like: 14 Jul 2026 / Mon, 14 Jul 2026 ...
  const m = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (m) {
    const month = MONTHS.findIndex(x => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      const date = new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

/** DD MMM YYYY e.g. 14 Jul 2026 */
export function formatSourceDate(value?: string | null): string {
  const date = parseSourceDate(value);
  if (!date) return 'Date unavailable';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** Format retrieval timestamps (ISO) the same way when possible. */
export function formatRetrievedDate(value?: string | null): string {
  if (!value) return 'Date unavailable';
  const formatted = formatSourceDate(value);
  if (formatted !== 'Date unavailable') return formatted;
  // Local fallback for full timestamps only when parseable
  const local = new Date(value);
  if (Number.isNaN(local.getTime())) return 'Date unavailable';
  const day = String(local.getDate()).padStart(2, '0');
  const month = MONTHS[local.getMonth()];
  const year = local.getFullYear();
  return `${day} ${month} ${year}`;
}
