import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { METRIC_SLOTS, type IdMap, type Metric } from "@/lib/scout-types";

type Props = {
  columns: string[];
  idMap: IdMap;
  metrics: Metric[];
  onIdMapChange: (next: IdMap) => void;
  onMetricsChange: (next: Metric[]) => void;
};

const ID_FIELDS: { key: keyof IdMap; label: string; required?: boolean }[] = [
  { key: "name", label: "Nome do jogador", required: true },
  { key: "club", label: "Clube" },
  { key: "age", label: "Idade" },
  { key: "foot", label: "Pé preferido" },
  { key: "nationality", label: "Nacionalidade" },
  { key: "height", label: "Altura" },
  { key: "salary", label: "Salário" },
  { key: "rating", label: "Nota média" },
  { key: "fullGames", label: "Jogos completos" },
];

function ColumnSelect({
  value,
  onChange,
  columns,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-secondary px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{placeholder}</option>
      {columns.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function MappingFields({
  columns,
  idMap,
  metrics,
  onIdMapChange,
  onMetricsChange,
}: Props) {
  const slots: Metric[] = Array.from({ length: METRIC_SLOTS }, (_, i) =>
    metrics[i] ?? { column: "", label: "", invert: false },
  );

  const [metricSearch, setMetricSearch] = useState("");
  const metricColumns = useMemo(() => {
    const term = metricSearch.trim().toLowerCase();
    if (!term) return columns;
    return columns.filter((c) => c.toLowerCase().includes(term));
  }, [columns, metricSearch]);

  const updateSlot = (index: number, patch: Partial<Metric>) => {
    const next = slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    onMetricsChange(next);
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Identificação
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ID_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {field.label}
                {field.required ? " *" : ""}
              </Label>
              <ColumnSelect
                columns={columns}
                value={idMap[field.key]}
                placeholder="— escolher coluna —"
                onChange={(v) => onIdMapChange({ ...idMap, [field.key]: v })}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          As 14 avaliações
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Escolha a coluna, dê um nome curto e marque &quot;menor é melhor&quot; quando o valor baixo
          for o bom (ex: perdas de bola).
        </p>
        <div className="relative mt-3 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={metricSearch}
            onChange={(e) => setMetricSearch(e.target.value)}
            placeholder="Pesquisar avaliação pelo nome da coluna"
            className="bg-secondary pl-8"
          />
        </div>
        {metricSearch && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {metricColumns.length} coluna(s) encontrada(s) — as listas abaixo estão filtradas.
          </p>
        )}
        <div className="mt-3 space-y-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="grid items-center gap-2 rounded-lg border border-border/70 bg-surface p-2 sm:grid-cols-[2rem_1fr_1fr_auto]"
            >
              <span className="text-center text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <ColumnSelect
                columns={
                  slot.column && !metricColumns.includes(slot.column)
                    ? [slot.column, ...metricColumns]
                    : metricColumns
                }
                value={slot.column}
                placeholder="— coluna da planilha —"
                onChange={(v) => updateSlot(i, { column: v, label: slot.label || v })}
              />
              <Input
                value={slot.label}
                placeholder="Nome curto no dashboard"
                onChange={(e) => updateSlot(i, { label: e.target.value })}
                className="h-9 bg-secondary"
              />
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Switch
                  checked={slot.invert}
                  onCheckedChange={(v) => updateSlot(i, { invert: v })}
                />
                menor é melhor
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
