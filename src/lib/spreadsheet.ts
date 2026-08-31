import Papa from "papaparse";

export type ParsedSheet = {
  columns: string[];
  rows: Record<string, unknown>[];
};

function normalizeRows(raw: Record<string, unknown>[]): ParsedSheet {
  const rows = raw.filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && v !== ""));
  const columns = rows.length ? Object.keys(rows[0]!) : [];
  return { columns, rows };
}

export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";

  if (isCsv) {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    return normalizeRows(result.data);
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { columns: [], rows: [] };
  const sheet = wb.Sheets[first]!;
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  return normalizeRows(json);
}
