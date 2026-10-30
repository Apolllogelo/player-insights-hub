import { readFileSync, existsSync } from "node:fs";

const filePath = "C:/Users/angel/OneDrive/Planejador/Planejador de Elenco.xlsm";

const XLSX = await import("xlsx");
const buffer = readFileSync(filePath);
const wb = XLSX.read(buffer, { type: "buffer" });

const ws = wb.Sheets["Elenco"];
const rows = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  defval: "",
  raw: true,
  blankrows: false,
});

console.log("Total rows in 'Elenco':", rows.length);
console.log("");

// Print all rows with their full content
for (let i = 0; i < Math.min(rows.length, 40); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
}
