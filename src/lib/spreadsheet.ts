import Papa from "papaparse";

export type ParsedSheet = {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type ParsedWorkbook = {
  sheets: ParsedSheet[];
};

/** Nomes de coluna vazios/duplicados quebram o mapeamento — normalizamos aqui. */
function normalizeHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((value, index) => {
    let label = String(value ?? "").trim();
    if (!label) label = `Coluna ${index + 1}`;
    const count = seen.get(label) ?? 0;
    seen.set(label, count + 1);
    return count === 0 ? label : `${label} (${count + 1})`;
  });
}

function buildSheet(name: string, matrix: unknown[][]): ParsedSheet {
  const headerIndex = matrix.findIndex(
    (row) => row.filter((c) => String(c ?? "").trim() !== "").length >= 3,
  );
  if (headerIndex === -1) return { name, columns: [], rows: [] };

  let columns = normalizeHeaders(matrix[headerIndex] ?? []);
  // Tudo depois da coluna "Inf" só existe para as fórmulas da planilha — descartamos.
  const infIndex = columns.findIndex((c) => /^inf\b/i.test(c.trim()));
  if (infIndex !== -1) columns = columns.slice(0, infIndex);
  const rows: Record<string, unknown>[] = [];
  for (const line of matrix.slice(headerIndex + 1)) {
    if (!line.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) continue;
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      row[col] = line[i] ?? "";
    });
    rows.push(row);
  }
  return { name, columns, rows };
}

export async function parseSpreadsheet(file: File): Promise<ParsedWorkbook> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<unknown[]>(text, { header: false, skipEmptyLines: true });
    return { sheets: [buildSheet(file.name.replace(/\.csv$/i, ""), result.data)] };
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheets = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return { name, columns: [], rows: [] };
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
      blankrows: false,
    });
    return buildSheet(name, matrix);
  }).filter((s) => s.columns.length > 0 && s.rows.length > 0);

  return { sheets };
}
