import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Search, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MappingFields } from "@/components/mapping-fields";
import { parseSpreadsheet, type ParsedSheet, type ParsedWorkbook } from "@/lib/spreadsheet";
import {
  datasetsQuery,
  deleteDataset,
  importDataset,
  playersQuery,
  profilesQuery,
} from "@/lib/scout-api";
import { emptyIdMap, type IdMap, type Metric } from "@/lib/scout-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scout Board — planilhas de scouting em fichas claras" },
      {
        name: "description",
        content:
          "Suba suas planilhas de scouting, mapeie as 14 avaliações de cada tipo de jogador e navegue por fichas individuais com percentis, destaques e alertas.",
      },
      { property: "og:title", content: "Scout Board — planilhas de scouting em fichas claras" },
      {
        property: "og:description",
        content:
          "De 100+ colunas para uma ficha individual limpa: percentis por posição, destaques e pontos de atenção automáticos.",
      },
    ],
  }),
  component: Home,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl px-4 py-16 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Nada por aqui.</div>,
});

function Home() {
  const queryClient = useQueryClient();
  const datasets = useQuery(datasetsQuery);
  const profiles = useQuery(profilesQuery);
  const players = useQuery(playersQuery);

  const fileRef = useRef<HTMLInputElement>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [playerType, setPlayerType] = useState("");
  const [idMap, setIdMap] = useState<IdMap>(emptyIdMap);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [importing, setImporting] = useState(false);

  const sheet: ParsedSheet | null = workbook?.sheets[sheetIndex] ?? null;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const playerTypes = useMemo(
    () => Array.from(new Set((datasets.data ?? []).map((d) => d.player_type))).sort(),
    [datasets.data],
  );

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (players.data ?? []).filter((p) => {
      if (typeFilter && p.player_type !== typeFilter) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) || (p.club ?? "").toLowerCase().includes(term)
      );
    });
  }, [players.data, search, typeFilter]);

  async function handleFile(file: File) {
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.sheets.length) {
        toast.error("Não encontrei colunas nessa planilha.");
        return;
      }
      setWorkbook(parsed);
      setFileName(file.name);
      setMetrics([]);
      setIdMap(emptyIdMap);
      selectSheet(parsed, 0);
      toast.success(
        parsed.sheets.length > 1
          ? `${parsed.sheets.length} abas lidas. Escolha qual quer importar.`
          : `${parsed.sheets[0]!.rows.length} linhas e ${parsed.sheets[0]!.columns.length} colunas lidas.`,
      );
    } catch {
      toast.error("Não consegui ler o arquivo. Use CSV ou Excel (.xlsx).");
    }
  }

  /** "🛡️Zagueiros" → "zagueiros" */
  function suggestType(sheetName: string) {
    return sheetName
      .replace(/[^\p{L}\p{N}\s/-]/gu, "")
      .trim()
      .toLowerCase();
  }

  function selectSheet(book: ParsedWorkbook, index: number) {
    setSheetIndex(index);
    const target = book.sheets[index];
    if (!target) return;
    applyProfile(suggestType(target.name), target);
  }

  function applyProfile(type: string, target: ParsedSheet | null = sheet) {
    setPlayerType(type);
    const profile = (profiles.data ?? []).find(
      (p) => p.player_type.toLowerCase() === type.trim().toLowerCase(),
    );
    if (profile && target) {
      const known = new Set(target.columns);
      const saved = { ...emptyIdMap, ...profile.id_map };
      setIdMap(
        Object.fromEntries(
          Object.entries(saved).map(([k, v]) => [k, known.has(String(v)) ? v : ""]),
        ) as IdMap,
      );
      setMetrics(profile.metrics.filter((m) => known.has(m.column)));
    } else if (target) {
      setIdMap((prev) => (target.columns.includes(prev.name) ? prev : emptyIdMap));
      setMetrics((prev) => prev.filter((m) => target.columns.includes(m.column)));
    }
  }

  async function handleImport() {
    if (!sheet) return;
    if (!playerType.trim()) {
      toast.error("Informe o tipo de jogador (ex: zagueiro).");
      return;
    }
    if (!idMap.name) {
      toast.error("Escolha a coluna com o nome do jogador.");
      return;
    }
    const validMetrics = metrics.filter((m) => m.column);
    if (!validMetrics.length) {
      toast.error("Escolha ao menos uma avaliação.");
      return;
    }
    setImporting(true);
    try {
      await importDataset({
        name: workbook && workbook.sheets.length > 1 ? `${fileName} · ${sheet.name}` : fileName,
        player_type: playerType.trim(),
        columns: sheet.columns,
        rows: sheet.rows,
        id_map: idMap,
        metrics: validMetrics.map((m) => ({ ...m, label: m.label || m.column })),
      });
      await queryClient.invalidateQueries();
      setWorkbook(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Planilha importada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDataset(id);
      await queryClient.invalidateQueries();
      toast.success("Planilha removida.");
    } catch {
      toast.error("Não consegui remover.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="max-w-2xl text-3xl font-semibold sm:text-4xl">
        Suas planilhas de scouting, em fichas que cabem numa tela
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Suba o CSV ou Excel, aponte uma vez quais são as 14 avaliações daquele tipo de jogador e o
        resto do trabalho — percentis, destaques e alertas — fica pronto.
      </p>

      <section className="mt-8 rounded-xl border border-border/70 bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Escolher planilha
          </Button>
          <span className="text-sm text-muted-foreground">
            {sheet
              ? `${fileName} · ${sheet.rows.length} jogadores · ${sheet.columns.length} colunas`
              : "CSV ou Excel (.xlsx) — cada aba pode ser um tipo de jogador"}
          </span>
        </div>

        {workbook && workbook.sheets.length > 1 && (
          <div className="mt-5 space-y-2">
            <Label className="text-xs text-muted-foreground">
              Abas encontradas — importe uma por vez
            </Label>
            <div className="flex flex-wrap gap-2">
              {workbook.sheets.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => selectSheet(workbook, i)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    i === sheetIndex
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/70 bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.name}
                  <span className="ml-1.5 opacity-60">{s.rows.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sheet && (
          <div className="mt-6 space-y-6 border-t border-border/70 pt-6">
            <div className="grid gap-3 sm:max-w-sm">
              <Label className="text-xs text-muted-foreground">
                Tipo de jogador desta planilha *
              </Label>
              <Input
                value={playerType}
                list="player-types"
                placeholder="ex: zagueiro"
                className="bg-secondary"
                onChange={(e) => applyProfile(e.target.value)}
              />
              <datalist id="player-types">
                {(profiles.data ?? []).map((p) => (
                  <option key={p.id} value={p.player_type} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Se você já mapeou este tipo antes, o mapeamento é carregado automaticamente.
              </p>
            </div>

            <MappingFields
              columns={sheet.columns}
              idMap={idMap}
              metrics={metrics}
              onIdMapChange={setIdMap}
              onMetricsChange={setMetrics}
            />

            <div className="flex gap-2">
              <Button onClick={() => void handleImport()} disabled={importing}>
                {importing ? "Importando…" : "Salvar mapeamento e importar"}
              </Button>
              <Button variant="ghost" onClick={() => setWorkbook(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>

      {!!(datasets.data ?? []).length && (
        <section className="mt-10">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Planilhas importadas
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(datasets.data ?? []).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.player_type} · {d.row_count} jogadores · {d.columns.length} colunas
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => void handleDelete(d.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Jogadores ({filteredPlayers.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome ou clube"
                className="w-64 bg-secondary pl-8"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-secondary px-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              {playerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {players.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filteredPlayers.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Nenhum jogador ainda. Importe uma planilha acima.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
            {filteredPlayers.slice(0, 300).map((p) => (
              <Link
                key={p.id}
                to="/jogador/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.club, p.age ? `${p.age} anos` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {p.player_type}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
