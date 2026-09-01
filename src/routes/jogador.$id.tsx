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
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  TrendingUp,
  TriangleAlert,
  User,
  Ruler,
  DollarSign,
  Star,
  Award,
  Layers,
  ListFilter,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Target,
  GitBranch,
  Footprints,
  Shield,
  HandMetal,
  Zap,
  AlertOctagon,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupEntries, type GroupingMode, type ColumnGroup } from "@/lib/column-groups";
import { datasetPlayersQuery, playerQuery, profilesQuery } from "@/lib/scout-api";
import { formatValue, percentile, toNumber, type Metric } from "@/lib/scout-types";

export const Route = createFileRoute("/jogador/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do jogador — Scout Board" },
      {
        name: "description",
        content:
          "Ficha individual com avaliações da posição, percentis comparados ao grupo, dados de identificação, destaques e dados completos.",
      },
      { property: "og:title", content: "Ficha do jogador — Scout Board" },
      {
        property: "og:description",
        content: "Percentis por posição, comparativo físico/cadastral e dados organizados em categorias.",
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
  if (p >= 70) return "text-emerald-400 font-semibold";
  if (p <= 30) return "text-rose-400 font-semibold";
  return "text-muted-foreground";
}

function scoreBg(p: number) {
  if (p >= 70) return "bg-emerald-500";
  if (p <= 30) return "bg-rose-500";
  return "bg-primary";
}

function scoreBadgeVariant(p: number) {
  if (p >= 70) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (p <= 30) return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  return "border-border/80 bg-secondary text-foreground";
}

function renderGroupIcon(id: string, className = "h-4 w-4") {
  switch (id) {
    case "id_contract":
      return <UserCheck className={className} />;
    case "participation":
      return <Clock className={className} />;
    case "finishing":
      return <Target className={className} />;
    case "creation":
      return <GitBranch className={className} />;
    case "dribble_carry":
      return <Footprints className={className} />;
    case "defense":
      return <Shield className={className} />;
    case "goalkeeper":
      return <HandMetal className={className} />;
    case "physical":
      return <Zap className={className} />;
    case "discipline":
      return <AlertOctagon className={className} />;
    case "only_filled":
      return <CheckCircle2 className={className} />;
    case "all_alphabetical":
      return <ListFilter className={className} />;
    default:
      return <FileSpreadsheet className={className} />;
  }
}

export function PlayerSheet() {
  const { id } = Route.useParams();
  const player = useQuery(playerQuery(id));
  const profiles = useQuery(profilesQuery);

  // Full data controls state
  const [showAll, setShowAll] = useState(true);
  const [dataSearch, setDataSearch] = useState("");
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  /** Comparativo detalhado dos 5 dados de identificação (Altura, Idade, Salário, Nota média e Jogos Completos) */
  const idRows = useMemo(() => {
    if (!player.data) return [];
    const group = peers.data ?? [];
    const dataKeys = Object.keys(player.data.data);

    // Fallback inteligente para encontrar coluna caso não esteja definida no id_map
    const findCol = (key: string, regex: RegExp): string => {
      const mapped = profile?.id_map?.[key as keyof typeof profile.id_map];
      if (mapped && player.data!.data[mapped] !== undefined) return mapped;
      const found = dataKeys.find((k) => regex.test(k));
      return found ?? "";
    };

    const fields = [
      {
        key: "age",
        label: "Idade",
        icon: User,
        unit: "anos",
        invert: true,
        invertNote: "Mais jovem",
        column: findCol("age", /^(idade|age)$/i),
      },
      {
        key: "height",
        label: "Altura",
        icon: Ruler,
        unit: "cm",
        invert: false,
        invertNote: "Mais alto",
        column: findCol("height", /^(altura|height)$/i),
      },
      {
        key: "salary",
        label: "Salário",
        icon: DollarSign,
        unit: "R$",
        invert: true,
        invertNote: "Menor custo",
        column: findCol("salary", /(sal[aá]rio|salary|wage|vencimento)/i),
      },
      {
        key: "rating",
        label: "Nota média",
        icon: Star,
        unit: "pts",
        invert: false,
        invertNote: "Maior nota",
        column: findCol("rating", /(nota|rating|m[eé]dia.*nota|overall)/i),
      },
      {
        key: "fullGames",
        label: "Jogos completos",
        icon: Award,
        unit: "jogos",
        invert: false,
        invertNote: "Mais minutagem",
        column: findCol("fullGames", /(jogo.*complet|full.*game|partida.*complet|90s)/i),
      },
    ] as const;

    return fields
      .map((f) => {
        if (!f.column) return null;
        const rawValue = player.data!.data[f.column];
        const value = toNumber(rawValue);
        if (value === null) return null;

        const values = group
          .map((p) => toNumber(p.data[f.column]))
          .filter((v): v is number => v !== null);

        const count = values.length;
        const pct = percentile(values, value, f.invert);
        const min = count ? Math.min(...values) : value;
        const max = count ? Math.max(...values) : value;
        const avg = count ? values.reduce((sum, v) => sum + v, 0) / count : value;
        const diffAvg = avg !== 0 ? ((value - avg) / avg) * 100 : 0;

        return {
          key: f.key,
          label: f.label,
          column: f.column,
          icon: f.icon,
          unit: f.unit,
          invert: f.invert,
          invertNote: f.invertNote,
          value,
          pct,
          min,
          max,
          avg,
          diffAvg,
          count,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [player.data, profile, peers.data]);

  const radarData = useMemo(
    () =>
      rows
        .filter((r) => r.pct !== null)
        .map((r) => ({ label: r.metric.label, pct: r.pct as number })),
    [rows],
  );

  const strengths = useMemo(
    () => rows.filter((r) => (r.pct ?? 0) >= 70).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)),
    [rows],
  );

  const warnings = useMemo(
    () =>
      rows
        .filter((r) => r.pct !== null && (r.pct as number) <= 30)
        .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
    [rows],
  );

  const allEntries = useMemo(() => {
    return Object.entries(player.data?.data ?? {});
  }, [player.data]);

  // Filtro e agrupamento dos dados completos (chamado antes dos early returns)
  const computedGroups = useMemo(() => {
    const term = dataSearch.trim().toLowerCase();
    const filtered = term
      ? allEntries.filter(
          ([k, v]) =>
            k.toLowerCase().includes(term) ||
            String(v ?? "").toLowerCase().includes(term),
        )
      : allEntries;

    const rawGroups = groupEntries(filtered, groupingMode);

    if (selectedCategory === "all" || groupingMode !== "categories") {
      return rawGroups;
    }
    return rawGroups.filter((g) => g.id === selectedCategory);
  }, [allEntries, dataSearch, groupingMode, selectedCategory]);

  const allCategoriesCount = useMemo(() => {
    return groupEntries(allEntries, "categories");
  }, [allEntries]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAllGroups = () => setCollapsedGroups({});
  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    computedGroups.forEach((g) => {
      allCollapsed[g.id] = true;
    });
    setCollapsedGroups(allCollapsed);
  };

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            {p.player_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Base: {(peers.data ?? []).length} jogadores
          </span>
        </div>
      </header>

      {/* 1. SEÇÃO DE COMPARATIVO DOS DADOS DE IDENTIFICAÇÃO (Altura, Idade, Salário, Nota, Jogos Completos) */}
      {idRows.length > 0 && (
        <section className="mt-8 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                Comparativo de Identificação & Físico
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Comparação individual de Altura, Idade, Salário, Nota Média e Jogos Completos contra o elenco / posição
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {(peers.data ?? []).length} jogadores no grupo
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {idRows.map((r) => {
              const IconComp = r.icon;
              return (
                <div
                  key={r.key}
                  className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-surface p-4 transition-all hover:border-border"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-primary">
                          <IconComp className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{r.label}</span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreBadgeVariant(
                          r.pct,
                        )}`}
                      >
                        {r.pct}º pct
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <p className="text-2xl font-bold tracking-tight text-foreground">
                        {formatValue(r.value)}
                        {r.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{r.unit}</span>}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {r.invertNote} {r.invert ? "(menor é melhor)" : ""}
                      </span>
                    </div>

                    {/* Barra de percentil */}
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${scoreBg(r.pct)}`}
                          style={{ width: `${Math.max(4, r.pct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas do grupo (Mín / Média / Máx) */}
                  <div className="mt-4 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="rounded bg-secondary/50 p-1">
                        <span className="block text-[10px] text-muted-foreground/70">Mínimo</span>
                        <span className="font-medium text-foreground">{formatValue(r.min)}</span>
                      </div>
                      <div className="rounded bg-secondary/50 p-1">
                        <span className="block text-[10px] text-muted-foreground/70">Média</span>
                        <span className="font-medium text-foreground">{formatValue(r.avg)}</span>
                      </div>
                      <div className="rounded bg-secondary/50 p-1">
                        <span className="block text-[10px] text-muted-foreground/70">Máximo</span>
                        <span className="font-medium text-foreground">{formatValue(r.max)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. SEÇÃO DE RADAR E DESTAQUES DAS 14 AVALIAÇÕES */}
      {!profile || rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border/80 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Este tipo de jogador ({p.player_type}) ainda não tem as 14 avaliações configuradas.
          </p>
          <Link to="/mapear" className="mt-3 inline-block">
            <Button size="sm">Configurar perfil de avaliações</Button>
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Radar de Desempenho (percentil vs. {(peers.data ?? []).length} jogadores)
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
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-emerald-400">
                  <TrendingUp className="h-4 w-4" /> Destaques (Top Percentil)
                </h2>
                {strengths.length ? (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {strengths.slice(0, 6).map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-3 rounded-lg bg-surface px-3 py-1.5">
                        <span className="truncate">{r.metric.label}</span>
                        <span className="shrink-0 font-semibold text-emerald-400">{r.pct}º pct</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma métrica acima do percentil 70.</p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-rose-400">
                  <TriangleAlert className="h-4 w-4" /> Pontos de Atenção
                </h2>
                {warnings.length ? (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {warnings.slice(0, 6).map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-3 rounded-lg bg-surface px-3 py-1.5">
                        <span className="truncate">{r.metric.label}</span>
                        <span className="shrink-0 font-semibold text-rose-400">{r.pct}º pct</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma métrica abaixo do percentil 30.</p>
                )}
              </div>
            </div>
          </section>

          {/* 14 AVALIAÇÕES */}
          <section className="mt-8">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              As 14 avaliações da posição
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {rows.map((r) => (
                <div
                  key={r.metric.column}
                  className="rounded-lg border border-border/70 bg-surface p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">
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
                      className={`h-full rounded-full transition-all ${scoreBg(r.pct ?? 50)}`}
                      style={{ width: `${r.pct ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={scoreColor(r.pct ?? 50)}>
                      {r.pct === null ? "sem valor" : `percentil ${r.pct}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{r.metric.column}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* 3. REORGANIZAÇÃO COMPLETA DOS DADOS (Grupos Semelhantes, Categorias, Busca e Filtros) */}
      <section className="mt-10 rounded-xl border border-border/70 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              Dados Completos da Planilha ({allEntries.length} colunas)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Colunas organizadas em blocos temáticos inteligentes para visualização e consulta rápida
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs"
            >
              {showAll ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
              {showAll ? "Recolher Seção" : "Expandir Seção"}
            </Button>
          </div>
        </div>

        {showAll && (
          <div className="mt-5 space-y-5">
            {/* Barra de Ferramentas: Busca + Modos de Agrupamento + Expandir/Recolher */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Campo de Busca */}
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={dataSearch}
                  onChange={(e) => setDataSearch(e.target.value)}
                  placeholder="Buscar métrica ou valor (ex: chutes, 185, contrato...)"
                  className="bg-secondary pl-9 text-sm"
                />
                {dataSearch && (
                  <button
                    onClick={() => setDataSearch("")}
                    className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    limpar
                  </button>
                )}
              </div>

              {/* Seletor de Modo de Visualização */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupingMode("categories");
                      setSelectedCategory("all");
                    }}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                      groupingMode === "categories"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Categorias
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupingMode("alphabetical")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                      groupingMode === "alphabetical"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    A-Z
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupingMode("with_values")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                      groupingMode === "with_values"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Preenchidos
                  </button>
                </div>

                {/* Botões de abrir/fechar todos os grupos */}
                {groupingMode === "categories" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={expandAllGroups}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Expandir todos
                    </Button>
                    <span className="text-muted-foreground/40">|</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={collapseAllGroups}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Recolher todos
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Filtros de Pílula por Categoria (quando em modo Categorias) */}
            {groupingMode === "categories" && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                    selectedCategory === "all"
                      ? "border-primary bg-primary/20 font-medium text-primary"
                      : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  Todas as categorias
                  <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.2 text-[10px] opacity-80">
                    {allEntries.length}
                  </span>
                </button>

                {allCategoriesCount.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                      selectedCategory === cat.id
                        ? "border-primary bg-primary/20 font-medium text-primary"
                        : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {renderGroupIcon(cat.id, "h-3 w-3")}
                    {cat.name}
                    <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.2 text-[10px] opacity-80">
                      {cat.items.length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Listagem dos Grupos / Colunas */}
            {computedGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma coluna ou valor encontrado para a busca.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDataSearch("");
                    setSelectedCategory("all");
                  }}
                  className="mt-3 text-xs"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {computedGroups.map((g: ColumnGroup) => {
                  const isCollapsed = collapsedGroups[g.id] ?? false;

                  return (
                    <div
                      key={g.id}
                      className="overflow-hidden rounded-xl border border-border/70 bg-card transition-all"
                    >
                      {/* Header do Grupo */}
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(g.id)}
                        className="flex w-full items-center justify-between gap-3 border-b border-border/50 bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary/70"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary">
                            {renderGroupIcon(g.id, "h-4 w-4")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-sm font-semibold tracking-wide text-foreground">
                                {g.name}
                              </h3>
                              <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                                {g.items.length} {g.items.length === 1 ? "coluna" : "colunas"}
                              </Badge>
                            </div>
                            {g.description && (
                              <p className="text-[11px] text-muted-foreground">{g.description}</p>
                            )}
                          </div>
                        </div>

                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                            isCollapsed ? "" : "rotate-180"
                          }`}
                        />
                      </button>

                      {/* Conteúdo do Grupo com grid responsivo */}
                      {!isCollapsed && (
                        <div className="p-4">
                          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            {g.items.map(([key, value]) => {
                              const strVal = formatValue(value);
                              const hasValue = value !== null && value !== undefined && String(value).trim() !== "" && strVal !== "—";

                              return (
                                <div
                                  key={key}
                                  className={`flex items-center justify-between gap-3 rounded-md border border-border/40 px-2.5 py-1.5 transition-colors ${
                                    hasValue ? "bg-surface/80" : "bg-surface/30 opacity-70"
                                  }`}
                                >
                                  <span className="truncate text-xs text-muted-foreground" title={key}>
                                    {key}
                                  </span>
                                  <span
                                    className={`shrink-0 font-medium ${
                                      hasValue ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  >
                                    {strVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

