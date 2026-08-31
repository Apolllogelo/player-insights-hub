export type Metric = {
  column: string;
  label: string;
  invert: boolean;
};

export type IdMap = {
  name: string;
  club: string;
  age: string;
  position: string;
  minutes: string;
};

export type PositionProfile = {
  id: string;
  player_type: string;
  id_map: IdMap;
  metrics: Metric[];
  created_at: string;
  updated_at: string;
};

export type Dataset = {
  id: string;
  name: string;
  player_type: string;
  row_count: number;
  columns: string[];
  created_at: string;
};

export type PlayerRow = {
  id: string;
  dataset_id: string;
  player_type: string;
  name: string;
  club: string | null;
  age: number | null;
  position: string | null;
  minutes: number | null;
  data: Record<string, unknown>;
  created_at: string;
};

export const emptyIdMap: IdMap = {
  name: "",
  club: "",
  age: "",
  position: "",
  minutes: "",
};

export const METRIC_SLOTS = 14;

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/%/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Percentil (0-100) de um jogador dentro do grupo, respeitando métricas invertidas. */
export function percentile(values: number[], value: number, invert: boolean): number {
  if (values.length < 2) return 50;
  const below = values.filter((v) => (invert ? v > value : v < value)).length;
  const equal = values.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / values.length) * 100);
}
