/**
 * admin-csv.ts — CSV export helper for the admin ledger tables.
 *
 * Why not reuse src/lib/pay-csv.ts directly:
 *   pay-csv.ts is scoped to payment records (orderId / paidAt / card
 *   fields) and encodes a deliberate scrubbing policy for card data.
 *   Admin ledgers (commission / ticket / audit) have a different, much
 *   simpler shape and must NOT inherit the payment field list.
 *
 *   The escaping + download mechanics are identical though, so they are
 *   factored here once and pay-csv keeps its own copy-escape (it is
 *   locked down by the scrub-before-disk skill and must not gain a
 *   dependency that could be misused to export card fields).
 */

export function adminCsvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * toAdminCSV — build a CSV string from a header row and body rows.
 *
 * `rows` is an array of arrays; every cell is coerced to a string.
 */
export function toAdminCSV(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(adminCsvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(adminCsvEscape).join(','));
  }
  return lines.join('\n');
}

/**
 * downloadAdminCSV — trigger a browser download of the CSV.
 *
 * The BOM (\uFEFF) makes Excel open the file as UTF-8 instead of
 * mangling Chinese characters — admin ledgers contain user names and
 * ticket reasons.
 */
export function downloadAdminCSV(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * csvFilename — build a dated filename like `admin-comm-2026-10-29.csv`.
 */
export function csvFilename(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${prefix}-${d}.csv`;
}
