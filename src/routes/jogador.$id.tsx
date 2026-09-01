import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, ChevronDown, TrendingUp, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { datasetPlayersQuery, playerQuery, profilesQuery } from "@/lib/scout-api";
import { formatValue, percentile, toNumber, type Metric } from "@/lib/scout-types";

export const Route = createFileRoute("/jogador/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do jogador — Scout Board" },
      {
        name: "description",
        content:
          "Ficha individual com as 14 avaliações da posição, percentis contra o grupo, destaques, pontos de atenção e todas as colunas originais.",
      },
      { property: "og:title", content: "Ficha do jogador — Scout Board" },
      {
        property: "og:description",
        content: "Percentis por posição, destaques e alertas automáticos para cada jogador.",
      },
    ],
  }),
  component: PlayerSheet,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-5xl px-4 py-16 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Jogador não encontrado.</div>,
});

function scoreColor(p: number) {
  if (p >= 70) return "text-primary";
  if (p <= 30) return "text-alert";
  return "text-foreground";
}

function PlayerSheet() {
  const { id } = Route.useParams();
  const player = useQuery(playerQuery(id));
  const profiles = useQuery(profilesQuery);
  const [showAll, setShowAll] = useState(false);

  const datasetId = player.data?.dataset_id ?? "";
  const peers = useQuery({
    ...datasetPlayersQuery(datasetId),
    enabled: !!datasetId,
  });

  const profile = useMemo(
    () => (profiles.data ?? []).find((p) => p.player_type === player.data?.player_type) ?? null,
    [profiles.data, player.data],
  );

  const rows = useMemo(() => {
    if (!player.data || !profile) return [];
    const group = peers.data ?? [];
    return profile.metrics.map((metric: Metric) => {
      const value = toNumber(player.data!.data[metric.column]);
      const values = group
        .map((p) => toNumber(p.data[metric.column]))
        .filter((v): v is number => v !== null);
      const pct = value === null ? null : percentile(values, value, metric.invert);
      return { metric, value, pct };
    });
  }, [player.data, profile, peers.data]);

  const radarData = rows
    .filter((r) => r.pct !== null)
    .map((r) => ({ label: r.metric.label, pct: r.pct as number }));

  const strengths = rows.filter((r) => (r.pct ?? 0) >= 70).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const warnings = rows
    .filter((r) => r.pct !== null && (r.pct as number) <= 30)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  if (player.isLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Carregando…</main>;
  }

  if (!player.data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-muted-foreground">Jogador não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary">
          Voltar
        </Link>
      </main>
    );
  }

  const p = player.data;
  const allEntries = Object.entries(p.data);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Todos os jogadores
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{p.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {[
              p.club,
              p.age ? `${p.age} anos` : null,
              ...(profile
                ? ([
                    ["Pé", profile.id_map.foot],
                    ["Nacionalidade", profile.id_map.nationality],
                    ["Altura", profile.id_map.height],
                    ["Salário", profile.id_map.salary],
                    ["Nota média", profile.id_map.rating],
                    ["Jogos completos", profile.id_map.fullGames],
                  ] as const)
                    .filter(([, col]) => !!col && p.data[col] !== undefined && p.data[col] !== "")
                    .map(([label, col]) => `${label}: ${formatValue(p.data[col])}`)
                : []),
            ]
              .filter(Boolean)
              .join("  ·  ") || "Sem dados de identificação"}
          </p>
        </div>
        <Badge variant="secondary">{p.player_type}</Badge>
      </header>

      {!profile || rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Este tipo de jogador ainda não tem avaliações mapeadas.{" "}
          <Link to="/mapear" className="text-primary">
            Configurar perfil
          </Link>
        </p>
      ) : (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Perfil (percentil vs. {(peers.data ?? []).length} jogadores da planilha)
              </h2>
              <div className="mt-2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="pct"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.28}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-primary">
                  <TrendingUp className="h-4 w-4" /> Destaques
                </h2>
                {strengths.length ? (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {strengths.slice(0, 5).map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-3">
                        <span className="truncate">{r.metric.label}</span>
                        <span className="shrink-0 font-medium text-primary">{r.pct}º pct</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nada acima do percentil 70.</p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-alert">
                  <TriangleAlert className="h-4 w-4" /> Pontos de atenção
                </h2>
                {warnings.length ? (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {warnings.slice(0, 5).map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-3">
                        <span className="truncate">{r.metric.label}</span>
                        <span className="shrink-0 font-medium text-alert">{r.pct}º pct</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nada abaixo do percentil 30.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              As 14 avaliações
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {rows.map((r) => (
                <div
                  key={r.metric.column}
                  className="rounded-lg border border-border/70 bg-surface p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm">
                      {r.metric.label}
                      {r.metric.invert && (
                        <span className="ml-1 text-xs text-muted-foreground">(menor é melhor)</span>
                      )}
                    </p>
                    <p className="shrink-0 text-sm font-semibold">
                      {r.value === null ? "—" : formatValue(r.value)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${r.pct ?? 0}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${scoreColor(r.pct ?? 50)}`}>
                    {r.pct === null ? "sem valor" : `percentil ${r.pct}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mt-8">
        <Button variant="secondary" size="sm" onClick={() => setShowAll((v) => !v)}>
          <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          Dados completos ({allEntries.length} colunas)
        </Button>
        {showAll && (
          <div className="mt-3 grid gap-x-6 gap-y-1 rounded-xl border border-border/70 bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {allEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 border-b border-border/40 py-1">
                <span className="truncate text-muted-foreground">{key}</span>
                <span className="shrink-0 font-medium">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
