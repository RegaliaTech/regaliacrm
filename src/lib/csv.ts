/**
 * Minimal CSV utilities — no runtime deps. Handles quoted values, escaped
 * quotes ("" inside a field), CR/LF newlines, and trailing empty lines.
 */

/** Escape a single cell for CSV output. */
export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a CSV string from a header row and data rows. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\n");
}

/**
 * Parse a CSV string into rows of string values. Tolerates a single header
 * line: pass `hasHeader: true` to skip the first row from the result.
 */
export function parseCsv(input: string, opts: { hasHeader?: boolean } = {}): {
  header: string[];
  rows: string[][];
} {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      cur.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // swallow — the following \n handles the row break
      i++;
      continue;
    }
    if (ch === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // flush last field/row
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  // drop trailing blank rows
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }

  if (opts.hasHeader && rows.length > 0) {
    const [header, ...rest] = rows;
    return { header, rows: rest };
  }
  return { header: [], rows };
}
