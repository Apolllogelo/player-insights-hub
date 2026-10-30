import { createServerFn } from "@tanstack/react-start";
import path from "path";
import { existsSync, readFileSync } from "fs";

const SPREADSHEET_PATH = path.resolve(
  "C:/Users/angel/OneDrive/Planejador/Planejador de Elenco.xlsm",
);

type SheetRow = (string | number | boolean | null)[];

function buildSheet(
  name: string,
  matrix: unknown[][],
): {
  name: string;
  columns: string[];
  rows: SheetRow[];
} {
  const headerIndex = matrix.findIndex(
    (row) => row.filter((c) => String(c ?? "").trim() !== "").length >= 3,
  );
  if (headerIndex === -1) return { name, columns: [], rows: [] };

  let columns = (matrix[headerIndex] ?? []).map((v) => String(v ?? "").trim());
  columns = columns.map((c, i) => {
    if (!c) return `Coluna ${i + 1}`;
    return c;
  });

  const rows: SheetRow[] = [];
  for (const line of matrix.slice(headerIndex + 1)) {
    if (!line.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) continue;
    rows.push(line as SheetRow);
  }
  return { name, columns, rows: matrix as SheetRow[] };
}

export const loadPlanejadorData = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    if (!existsSync(SPREADSHEET_PATH)) {
      return { ok: false as const, reason: "Arquivo não encontrado" };
    }

    const buffer = readFileSync(SPREADSHEET_PATH);

    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const sheets = wb.SheetNames.map((name: string) => {
      const ws = wb.Sheets[name];
      if (!ws) return { name, columns: [] as string[], rows: [] as SheetRow[] };
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: "",
        raw: true,
        blankrows: false,
      });
      const built = buildSheet(name, matrix);
      return {
        name: built.name,
        columns: built.columns,
        rows: built.rows,
      };
    });

    const adminSheet = sheets.find((s) => s.name === "Administração") ?? null;
    const elencoSheet = sheets.find((s) => s.name === "Elenco") ?? null;

    return {
      ok: true as const,
      admin: adminSheet,
      elenco: elencoSheet,
    };
  } catch (e) {
    return { ok: false as const, reason: e instanceof Error ? e.message : String(e) };
  }
});
