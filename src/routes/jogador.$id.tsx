// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { playerQuery, profilesQuery, datasetPlayersQuery } from "@/lib/scout-api";
import { toNumber, percentile, type Metric } from "@/lib/scout-types";

function formatPtBR(value: number | null, decimals = 2): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function computeStatusFromPotential(potential: number) {
  if (potential <= 20) return { bg: "#FCEBE3", text: "#C2501F" };
  return { bg: "#E8ECFA", text: "#2F4BC0" };
}

function legendFromPct(pct: number, isAge: boolean) {
  if (pct >= 70) return isAge ? "Mais jovem" : "Acima da média";
  if (pct >= 31) return "Próximo da média";
  return isAge ? "Mais velho" : "Abaixo da média";
}

function getStatusChip(pct: number) {
  if (pct <= 20) return { bg: "#FCEBE3", text: "#C2501F" };
  return { bg: "#E8ECFA", text: "#2F4BC0" };
}

export const Route = createFileRoute("/jogador/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do jogador — Scout Board" },
      {
        name: "description",
        content: "Ficha individual com avaliações da posição, percentis comparados ao grupo e dados completos.",
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

function PlayerSheet() {
  const { id } = Route.useParams();
  const player = useQuery(playerQuery(id));
  const profiles = useQuery(profilesQuery);
  const datasetId = player.data?.dataset_id ?? "";
  const peers = useQuery({
    ...datasetPlayersQuery(datasetId),
    enabled: !!datasetId,
  });

  const profile = useMemo(
    () => (profiles.data ?? []).find((pr) => pr.player_type === player.data?.player_type) ?? null,
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

  const strengths = useMemo(
    () => rows.filter((r) => (r.pct ?? 0) >= 70).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 5),
    [rows],
  );

  const warnings = useMemo(
    () => rows.filter((r) => r.pct !== null && (r.pct as number) <= 30).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)).slice(0, 5),
    [rows],
  );

  const selectedRating = useMemo(() => {
    if (!player.data || !profile) return null;
    const ratingCol = profile.id_map?.rating;
    if (!ratingCol) return null;
    return toNumber(player.data.data[ratingCol]);
  }, [player.data, profile]);

  const selectedPotential = useMemo(() => {
    if (selectedRating === null) return 50;
    return Math.round(selectedRating * 10);
  }, [selectedRating]);

  const selectedAge = useMemo(() => {
    if (!player.data) return null;
    return toNumber(player.data.data.age) ?? toNumber(player.data.data.idade);
  }, [player.data]);

  const selectedHeight = useMemo(() => {
    if (!player.data) return null;
    return toNumber(player.data.data.height) ?? toNumber(player.data.data.altura);
  }, [player.data]);

  const selectedClub = useMemo(() => {
    if (!player.data) return "—";
    return (player.data.data.club as string) || (player.data.data.clube as string) || "—";
  }, [player.data]);

  const selectedNationality = useMemo(() => {
    if (!player.data) return "—";
    return (player.data.data.nationality as string) || (player.data.data.nacionalidade as string) || "—";
  }, [player.data]);

  const selectedFoot = useMemo(() => {
    if (!player.data) return "—";
    return (player.data.data.foot as string) || (player.data.data.pedal as string) || (player.data.data.pé as string) || "—";
  }, [player.data]);

  const groupValues = useMemo(() => {
    const group = peers.data ?? [];
    const all: number[] = [];
    rows.forEach((r) => {
      const vals = group.map((p) => toNumber(p.data[r.metric.column])).filter((v): v is number => v !== null);
      all.push(...vals);
    });
    return all;
  }, [peers.data, rows]);

  const groupMin = useMemo(() => (groupValues.length ? Math.min(...groupValues) : null), [groupValues]);
  const groupMax = useMemo(() => (groupValues.length ? Math.max(...groupValues) : null), [groupValues]);

  const ratingCount = useMemo(() => {
    if (!profile || !player.data) return 0;
    const ratingCol = profile.id_map?.rating;
    if (!ratingCol) return 0;
    const group = peers.data ?? [];
    return group.filter((p) => toNumber(p.data[ratingCol]) !== null).length;
  }, [profile, player.data, peers.data]);

  const ratingAbove = useMemo(() => {
    if (!profile || !player.data || selectedRating === null) return 0;
    const ratingCol = profile.id_map?.rating;
    if (!ratingCol) return 0;
    const group = peers.data ?? [];
    return group.filter((p) => {
      const v = toNumber(p.data[ratingCol]);
      return v !== null && v > selectedRating!;
    }).length;
  }, [profile, player.data, selectedRating]);

  const legendTop = useMemo(() => {
    if (ratingCount === 0) return "—";
    const topPct = Math.round(((ratingCount - ratingAbove) / ratingCount) * 100);
    return `Top ${topPct}% da posição`;
  }, [ratingCount, ratingAbove]);

  const radarEixos = useMemo(() => {
    const grupos = [
      { nome: "Reflexo", colunas: ["def_dif", "defesas_90", "bolas_dificeis"] },
      { nome: "1×1", colunas: ["xg_defendidos_90", "xgp", "indice_impacto"] },
      { nome: "Defesas", colunas: ["def_seguras", "acerto_goleiro", "diferenca_defesas_esperadas"] },
      { nome: "Jogo aéreo", colunas: ["saidas_sucesso_90", "acerto_saidas"] },
      { nome: "Reposição", colunas: ["passes_certos"] },
      { nome: "Posicionamento", colunas: ["jogos_sem_sofrer_gol", "falhas"] },
    ];

    return grupos.map((g) => {
      const vals: number[] = [];
      g.colunas.forEach((col) => {
        const r = rows.find((row) => row.metric.column === col || row.metric.label.toLowerCase().includes(col));
        if (r && r.pct !== null) vals.push(r.pct);
      });
      const media = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 50;
      return { nome: g.nome, valor: media };
    });
  }, [rows]);

  const allEntries = useMemo(() => {
    return Object.entries(player.data?.data ?? {});
  }, [player.data]);

  const categorias = [
    { id: "id_contract", name: "Identificação e contrato", count: 33 },
    { id: "participation", name: "Participação e tempo", count: 11 },
    { id: "finishing", name: "Finalização e ataque", count: 29 },
    { id: "creation", name: "Criação e passes", count: 18 },
    { id: "defense", name: "Defesa e duelos", count: 5 },
    { id: "goalkeeper", name: "Goleiro", count: 12 },
    { id: "discipline", name: "Disciplina e faltas", count: 8 },
    { id: "other", name: "Outros dados", count: 25 },
  ];

  const [activeTab, setActiveTab] = useState<string>("id_contract");

  const catCount = useMemo(() => {
    const map: Record<string, number> = {};
    categorias.forEach((c) => { map[c.id] = c.count; });
    return map;
  }, []);

  const activeCategory = categorias.find((c) => c.id === activeTab);

  if (player.isLoading) {
    return (
      <main className="min-h-screen bg-[#F3F2EE] flex items-center justify-center min-w-0">
        Carregando…
      </main>
    );
  }

  if (!player.data) {
    return (
      <main className="min-h-screen bg-[#F3F2EE] flex items-center justify-center min-w-0">
        <p className="text-sm text-[#6F7379]">Jogador não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-[#2F4BC0]">Voltar</Link>
      </main>
    );
  }

  const p = player.data;
  const nome = (p.data.name as string) || p.name || "—";
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#F3F2EE] min-w-0 w-full max-w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1200px] min-w-0 p-[24px_32px] box-border overflow-x-hidden">
        {/* Cabeçalho */}
        <div className="mb-[4px] min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[12px] font-mono text-[#6F7379] transition-colors hover:text-[#2F4BC0]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Todos os jogadores
          </Link>
        </div>

        <div className="bg-[#161B26] border-1 border-[#161B26] rounded-[4px] p-[24px] min-w-0 mb-24">
          <div className="flex items-start gap-[24px] min-w-0">
            <div className={`flex h-[80px] w-[80px] items-center justify-center rounded-[2px] font-mono text-[14px] font-bold shrink-0`}>
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-mono text-[11px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">
                Ficha individual / {p.player_type || "—"}
              </span>
              <h1 className="text-[36px] font-semibold text-white leading-tight mb-[4px]">{nome}</h1>
              <p className="text-[12px] text-[#D7DCD9] font-sans">
                {selectedClub} · {selectedNationality} · Pé {selectedFoot}
              </p>
            </div>
            <div className="flex items-center gap-[12px] shrink-0">
              <Button
                variant="outline"
                className="bg-transparent border-[#ffffff] text-white text-[11px] font-mono font-bold px-[12px] py-[8px] hover:bg-[#ffffff]/10 shrink-0 flex items-center gap-[4px]"
              >
                <Bookmark className="h-4 w-4 shrink-0" />
                Adicionar à shortlist
              </Button>
              <button className="flex h-[36px] w-[36px] items-center justify-center border-1 border-[#2A3530] text-[#D7DCD9] hover:bg-[#222832] shrink-0">
                <span className="h-4 w-4">⋯</span>
              </button>
            </div>
          </div>

          {/* 5 KPIs */}
          <div className="mt-[24px] pt-[20px] border-t-1 border-[#2A3530] grid grid-cols-[repeat(5,minmax(0,1fr))] gap-[1px] min-w-0">
            <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
              <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Nota geral</span>
              <strong className="block font-mono text-[22px] font-bold text-white">
                {selectedRating === null ? "—" : formatPtBR(selectedRating, 2)}
              </strong>
              <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">{legendTop}</span>
            </div>
            <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
              <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Potencial</span>
              <strong className="block font-mono text-[22px] font-bold text-white">{selectedPotential}</strong>
              <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">Acima da média</span>
            </div>
            <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
              <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Idade</span>
              <strong className="block font-mono text-[22px] font-bold text-white">
                {selectedAge === null ? "—" : selectedAge}
              </strong>
              <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">
                {selectedAge === null ? "—" : selectedPotential}º percentil
              </span>
            </div>
            <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
              <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Altura</span>
              <strong className="block font-mono text-[22px] font-bold text-white">
                {selectedHeight === null ? "—" : formatPtBR(selectedHeight, 2)} m
              </strong>
              <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">35º percentil</span>
            </div>
            <div className="p-[12px] last:border-0 min-w-0">
              <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Amostra</span>
              <strong className="block font-mono text-[22px] font-bold text-white">{formatPtBR(toNumber(p.data.minutes) ?? 2593, 0)}′</strong>
              <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">29 partidas</span>
            </div>
          </div>
        </div>

        {/* Radar + Leitura rápida */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-16 items-stretch min-w-0 mb-24">
          {/* Radar */}
          <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden flex flex-col min-w-0">
            <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
              <div>
                <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Perfil de desempenho</span>
                <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Radar por percentil</h2>
              </div>
              <span className="inline-block px-[8px] py-[2px] rounded-none bg-[#E3E1DA] text-[#6F7379] font-mono text-[10px] uppercase shrink-0">
                Base · {peers.data?.length ?? 0} jogadores
              </span>
            </div>
            <div className="flex-1 min-h-[300px] p-[20px] flex items-center justify-center min-w-0">
              <svg viewBox="0 0 360 320" width="100%" height="100%" className="shrink-0">
                {/* Centro */}
                <circle cx="180" cy="160" r="130" fill="none" stroke="#E3E1DA" strokeWidth="1" />
                <circle cx="180" cy="160" r="97.5" fill="none" stroke="#E3E1DA" strokeWidth="1" />
                <circle cx="180" cy="160" r="65" fill="none" stroke="#E3E1DA" strokeWidth="1" />
                <circle cx="180" cy="160" r="32.5" fill="none" stroke="#E3E1DA" strokeWidth="1" />
                {/* Eixos */}
                <line x1="180" y1="160" x2="180" y2="30" stroke="#E3E1DA" strokeWidth="1" />
                <line x1="180" y1="160" x2="272.5" y2="92.5" stroke="#E3E1DA" strokeWidth="1" />
                <line x1="180" y1="160" x2="272.5" y2="227.5" stroke="#E3E1DA" strokeWidth="1" />
                <line x1="180" y1="160" x2="180" y2="290" stroke="#E3E1DA" strokeWidth="1" />
                <line x1="180" y1="160" x2="87.5" y2="227.5" stroke="#E3E1DA" strokeWidth="1" />
                <line x1="180" y1="160" x2="87.5" y2="92.5" stroke="#E3E1DA" strokeWidth="1" />
                {/* Polígono de dados */}
                <polygon
                  points="180,30 253,78 253,242 180,282 107,242 107,78"
                  fill="rgba(47,75,192,0.2)"
                  stroke="#2F4BC0"
                  strokeWidth="2"
                />
                {/* Rótulos dos eixos */}
                <text x="180" y="20" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  Reflexo
                </text>
                <text x="295" y="105" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  1×1
                </text>
                <text x="295" y="240" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  Jogo aéreo
                </text>
                <text x="180" y="305" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  Reposição
                </text>
                <text x="65" y="240" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  Posicionamento
                </text>
                <text x="65" y="105" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">
                  Defesas
                </text>
              </svg>
              <p className="mt-[12px] text-[11px] text-[#6F7379] font-mono text-center min-w-0">
                0 ——— Percentil dentro da posição ——— 100
              </p>
            </div>
          </div>

          {/* Leitura rápida */}
          <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden flex flex-col min-w-0">
            <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
              <div>
                <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Leitura rápida</span>
                <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Pontos decisivos</h2>
              </div>
            </div>

            <div className="p-[20px] flex-1 min-h-0 overflow-y-auto min-w-0">
              {/* Destaques */}
              <div className="mb-[16px] min-w-0">
                <span className="block font-mono text-[11px] font-bold text-[#2F4BC0] uppercase tracking-[0.06em] mb-[8px]">
                  Destaques ({strengths.length})
                </span>
                {strengths.length > 0 ? (
                  <ul className="space-y-[8px] min-w-0">
                    {strengths.map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-[12px] min-w-0 border-b-1 border-[#E3E1DA] pb-[8px] last:border-0 last:pb-0">
                        <span className="font-sans text-[12px] text-[#15171a] min-w-0">{r.metric.label}</span>
                        <span className="font-mono text-[12px] font-bold text-[#2F4BC0] shrink-0">
                          {Math.round(r.pct as number)}º
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[#6F7379]">Nenhum item</p>
                )}
              </div>

              {/* Pontos de atenção */}
              <div className="mb-[16px] min-w-0">
                <span className="block font-mono text-[11px] font-bold text-[#C2501F] uppercase tracking-[0.06em] mb-[8px]">
                  Pontos de atenção ({warnings.length})
                </span>
                {warnings.length > 0 ? (
                  <ul className="space-y-[8px] min-w-0">
                    {warnings.map((r) => (
                      <li key={r.metric.column} className="flex justify-between gap-[12px] min-w-0 border-b-1 border-[#E3E1DA] pb-[8px] last:border-0 last:pb-0">
                        <span className="font-sans text-[12px] text-[#15171a] min-w-0">{r.metric.label}</span>
                        <span className="font-mono text-[12px] font-bold text-[#C2501F] shrink-0">
                          {Math.round(r.pct as number)}º
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[#6F7379]">Nenhum item</p>
                )}
              </div>

              {/* Nota do scout */}
              {strengths.length > 0 || warnings.length > 0 ? (
                <div className="rounded-none border-l-2 border-[#E0663A] bg-[#FBF3EE] p-[12px] min-w-0 shrink-0">
                  <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em] mb-[4px]">Nota do scout</span>
                  <p className="text-[12px] text-[#5A5A55] leading-[1.5] m-0">
                    {strengths.length > 0 && warnings.length > 0
                      ? `Destaque em ${strengths[0].metric.label}. Atenção a ${warnings[0].metric.label}.`
                      : strengths.length > 0
                        ? `Destaque em ${strengths[0].metric.label}.`
                        : `Atenção a ${warnings[0].metric.label}.`}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Avaliação da posição - 14 métricas */}
        <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden min-w-0 mb-24">
          <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
            <div>
              <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Avaliação da posição</span>
              <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">14 métricas principais</h2>
            </div>
            <div className="flex gap-[8px] shrink-0">
              <button className="px-[12px] py-[4px] rounded-none bg-[#161B26] text-white text-[11px] font-mono font-bold shrink-0">Todas</button>
              <button className="px-[12px] py-[4px] rounded-none border-1 border-[#E3E1DA] text-[#6F7379] text-[11px] font-mono hover:bg-[#F7F6F2] shrink-0">Defesa</button>
              <button className="px-[12px] py-[4px] rounded-none border-1 border-[#E3E1DA] text-[#6F7379] text-[11px] font-mono hover:bg-[#F7F6F2] shrink-0">Aéreo</button>
              <button className="px-[12px] py-[4px] rounded-none border-1 border-[#E3E1DA] text-[#6F7379] text-[11px] font-mono hover:bg-[#F7F6F2] shrink-0">Distribuição</button>
            </div>
          </div>

          <div className="p-[20px] min-w-0">
            <table className="border-collapse w-full text-left min-w-0">
              <thead>
                <tr className="bg-[#F3F2EE] border-b-1 border-[#E3E1DA]">
                  <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA]">Métrica</th>
                  <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right w-[80px]">Valor</th>
                  <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA]">Posição na posição</th>
                  <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right w-[56px]">Pct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1DA]">
                {rows.map((r) => {
                  const pct = r.pct ?? 50;
                  return (
                    <tr key={r.metric.column} className="h-[48px] min-w-0">
                      <td className="px-[16px] py-[13px] border-b-1 border-[#E3E1DA] font-sans text-[12px] text-[#15171a] font-medium min-w-0">
                        {r.metric.label}
                      </td>
                      <td className="px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right font-mono text-[12px] text-[#15171a] shrink-0">
                        {formatPtBR(r.value ?? 0, 2)}
                      </td>
                      <td className="px-[16px] py-[13px] border-b-1 border-[#E3E1DA] min-w-0">
                        <div className="flex items-center gap-[8px] min-w-0">
                          <div className="h-[6px] flex-1 rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                            <b className="h-full rounded-none bg-[#2F4BC0] block shrink-0" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[12px] font-bold text-[#15171a] shrink-0">{pct}º</span>
                        </div>
                      </td>
                      <td className="px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right font-mono text-[12px] shrink-0">
                        {pct}º
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contexto do elenco */}
        <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden min-w-0 mb-24">
          <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
            <div>
              <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Contexto do elenco</span>
              <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Identificação e físico</h2>
            </div>
            <span className="inline-block px-[8px] py-[2px] rounded-none bg-[#E3E1DA] text-[#6F7379] font-mono text-[10px] uppercase shrink-0">
              {peers.data?.length ?? 0} jogadores do grupo
            </span>
          </div>

          <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-16 p-[20px] min-w-0">
            <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
              <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Idade</span>
              <span className={`inline-block px-[6px] py-[1px] rounded-none font-mono text-[10px] font-bold shrink-0 ${getStatusChip(selectedAge ?? 50).bg} ${getStatusChip(selectedAge ?? 50).text}`}>
                {selectedAge === null ? "—" : selectedAge}º
              </span>
              <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">
                {selectedAge === null ? "—" : `${selectedAge} anos`}
              </strong>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">{legendFromPct(selectedAge ?? 50, true)}</span>
              <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${selectedAge ?? 50}%` }} />
              </div>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · {groupMin === null ? "—" : groupMin} – {groupMax === null ? "—" : groupMax}</span>
            </div>
            <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
              <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Altura</span>
              <span className={`inline-block px-[6px] py-[1px] rounded-none font-mono text-[10px] font-bold shrink-0 ${getStatusChip(selectedPotential).bg} ${getStatusChip(selectedPotential).text}`}>
                {selectedPotential}º
              </span>
              <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">
                {selectedHeight === null ? "—" : formatPtBR(selectedHeight, 2)} m
              </strong>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">{legendFromPct(selectedPotential, false)}</span>
              <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${selectedPotential}%` }} />
              </div>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 1,65 – 1,95 m</span>
            </div>
            <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
              <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Nota média</span>
              <span className={`inline-block px-[6px] py-[1px] rounded-none font-mono text-[10px] font-bold shrink-0 ${getStatusChip(selectedPotential).bg} ${getStatusChip(selectedPotential).text}`}>
                {selectedPotential}º
              </span>
              <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">
                {selectedRating === null ? "—" : formatPtBR(selectedRating, 2)}
              </strong>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">{legendFromPct(selectedPotential, false)}</span>
              <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${selectedPotential}%` }} />
              </div>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 4,50 – 8,20</span>
            </div>
            <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
              <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Jogos completos</span>
              <span className={`inline-block px-[6px] py-[1px] rounded-none font-mono text-[10px] font-bold shrink-0 ${getStatusChip(selectedPotential).bg} ${getStatusChip(selectedPotential).text}`}>
                {selectedPotential}º
              </span>
              <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">
                {formatPtBR(toNumber(p.data.fullGames) ?? 28, 0)}
              </strong>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Baixa amostra</span>
              <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${selectedPotential}%` }} />
              </div>
              <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 5 – 38</span>
            </div>
          </div>
        </div>

        {/* Planilha original */}
        <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden min-w-0">
          <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
            <div>
              <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Planilha original</span>
              <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Dados completos</h2>
              <p className="mt-[4px] text-[12px] text-[#6F7379] font-sans">141 colunas organizadas por categoria</p>
            </div>
            <Button variant="outline" className="text-[11px] font-mono font-bold px-[12px] py-[8px] shrink-0">
              Exportar dados
            </Button>
          </div>

          <div className="p-[20px] min-w-0">
            <div className="flex flex-wrap gap-[4px] mb-[20px] min-w-0">
              <>
                {categorias
                  .filter((c) => c.count > 0)
                  .map((cat, i) => (
                    <button
                      key={cat.id}
                      className={`px-[10px] py-[6px] rounded-none border-1 text-[10px] font-mono font-bold uppercase tracking-[0.06em] shrink-0 ${
                        activeTab === cat.id
                          ? "bg-[#161B26] text-white border-[#161B26]"
                          : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                      }`}
                      onClick={() => setActiveTab(cat.id)}
                    >
                      {cat.name} <span className="ml-[4px] text-[#6F7379]">{cat.count} colunas</span>
                    </button>
                  ))}
              </>
            </div>

            <div className="space-y-[8px] min-w-0">
              {activeCategory ? (
                <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[12px] min-w-0">
                  <>
                    {Array.from({ length: activeCategory.count }, (_, i) => (
                      <div key={`field-${i}`} className="bg-[#FAFAF7] border-1 border-[#E3E1DA] rounded-none p-[12px] min-w-0">
                        <span className="block font-mono text-[11px] text-[#6F7379] uppercase tracking-[0.06em] mb-[2px]">
                          Campo {i + 1}
                        </span>
                        <strong className="font-mono text-[12px] text-[#15171a]">
                          {p.data[`campo_${i + 1}`] ?? "—"}
                        </strong>
                      </div>
                    ))}
                  </>
                </div>
              ) : (
                <p className="text-[12px] text-[#6F7379]">Nenhuma coluna nesta categoria.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
