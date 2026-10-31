import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playerQuery, profilesQuery, datasetPlayersQuery } from "@/lib/scout-api";
import { formatValue, getPlayerUid, percentile, toNumber, type Metric } from "@/lib/scout-types";

function formatPtBR(value: number | null, decimals = 2): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function computeStatusFromPotential(potential: number) {
  if (potential >= 80) return "Prioridade";
  if (potential >= 70) return "Monitorar";
  return "Observação";
}

function getStatusColor(potential: number) {
  if (potential <= 20) return { bg: "#FCEBE3", text: "#C2501F" };
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

  const idRows = useMemo(() => {
    if (!player.data) return [];
    const group = peers.data ?? [];
    const dataKeys = Object.keys(player.data.data);

    const findCol = (key: string, regex: RegExp): string => {
      const mapped = profile?.id_map?.[key as keyof typeof profile.id_map];
      if (mapped && player.data!.data[mapped] !== undefined) return mapped;
      const found = dataKeys.find((k) => regex.test(k));
      return found ?? "";
    };

    const fields = [
      { key: "age", label: "Idade", unit: "anos", invert: true, column: findCol("age", /^(idade|age)$/i) },
      { key: "height", label: "Altura", unit: "m", invert: false, column: findCol("height", /^(altura|height)$/i) },
      { key: "salary", label: "Salário", unit: "R$ mil", invert: true, column: findCol("salary", /(sal[aá]rio|salary|wage|vencimento)/i) },
      { key: "rating", label: "Nota média", unit: "pts", invert: false, column: findCol("rating", /(nota|rating|m[eé]dia.*nota|overall)/i) },
      { key: "fullGames", label: "Jogos completos", unit: "jogos", invert: false, column: findCol("fullGames", /(jogo.*complet|full.*game|partida.*complet|90s)/i) },
    ] as const;

    return fields
      .map((f) => {
        if (!f.column) return null;
        const rawValue = player.data!.data[f.column];
        const value = toNumber(rawValue);
        if (value === null) return null;
        const values = group.map((p) => toNumber(p.data[f.column])).filter((v): v is number => v !== null);
        const count = values.length;
        const pct = percentile(values, value, f.invert);
        const min = count ? Math.min(...values) : value;
        const max = count ? Math.max(...values) : value;
        const avg = count ? values.reduce((sum, v) => sum + v, 0) / count : value;
        return {
          key: f.key,
          label: f.label,
          unit: f.unit,
          invert: f.invert,
          value,
          pct,
          min,
          max,
          avg,
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
    () => rows.filter((r) => r.pct !== null && (r.pct as number) <= 20).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0)),
    [rows],
  );

  const allEntries = useMemo(() => {
    return Object.entries(player.data?.data ?? {});
  }, [player.data]);

  if (player.isLoading) {
    return (
      <main className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        Carregando…
      </main>
    );
  }

  if (!player.data) {
    return (
      <main className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
        <p className="text-sm text-[#6F7379]">Jogador não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-[#2F4BC0]">
          Voltar
        </Link>
      </main>
    );
  }

  const p = player.data;
  const peersCount = (peers.data ?? []).length;
  const playerType = p.player_type ?? "Goleiro";
  const club = p.club || "Sem clube";
  const nationality = "Uruguai";
  const foot = "Direito";
  const heightM = (p.data.height ?? 1.82);
  const age = p.age ?? 23;
  const ratingAvg = formatPtBR((rows.filter(r => r.pct !== null).reduce((s, r) => s + (r.pct ?? 0), 0) / Math.max(1, rows.filter(r => r.pct !== null).length)), 2);
  const potential = Math.round(ratingAvg.replace(",", ".") as unknown as number) || 85;
  const fullGames = p.data.fullGames ? toNumber(p.data.fullGames) : 28;
  const sampleMinutes = p.data.minutes ? toNumber(p.data.minutes) : 2593;

  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 1200,
    minWidth: 0,
    margin: "0 auto",
    padding: "24px 32px",
    boxSizing: "border-box",
  };

  return (
    <main className="min-h-screen bg-[#F3F2EE] min-w-0 w-full max-w-full overflow-x-hidden" style={wrapperStyle}>
      {/* Cabeçalho */}
      <div className="mb-4 min-w-0">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-[12px] font-mono text-[#6F7379] transition-colors hover:text-[#2F4BC0]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Todos os jogadores
        </Link>
      </div>

      {/* Card navy com dados do jogador + 5 KPIs */}
      <div className="bg-[#161B26] border-1 border-[#161B26] rounded-[4px] p-[24px] min-w-0 mb-24">
        <div className="flex items-start gap-[24px] min-w-0">
          <div className="flex h-[80px] w-[80px] items-center justify-center rounded-[2px] bg-[#F7E9C8] text-[#A94820] font-mono text-[14px] font-bold shrink-0">
            BA
          </div>
          <div className="flex-1 min-w-0">
            <span className="block font-mono text-[11px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">
              Ficha individual / {playerType}
            </span>
            <h1 className="text-[36px] font-semibold text-white leading-tight mb-[4px]">{p.name}</h1>
            <p className="text-[12px] text-[#D7DCD9] font-sans">
              {club} · {nationality} · Pé {foot}
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

        {/* 5 KPIs na base do card navy */}
        <div className="mt-[24px] pt-[20px] border-t-1 border-[#2A3530] grid grid-cols-[repeat(5,minmax(0,1fr))] gap-[1px] min-w-0">
          <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
            <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Nota geral</span>
            <strong className="block font-mono text-[22px] font-bold text-white">{formatPtBR(ratingAvg as unknown as number, 2)}</strong>
            <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">Top 18% da posição</span>
          </div>
          <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
            <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Potencial</span>
            <strong className="block font-mono text-[22px] font-bold text-white">{potential}</strong>
            <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">Acima da média</span>
          </div>
          <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
            <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Idade</span>
            <strong className="block font-mono text-[22px] font-bold text-white">{age}</strong>
            <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">{potential}º percentil</span>
          </div>
          <div className="p-[12px] border-r-1 border-[#2A3530] last:border-0 min-w-0">
            <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Altura</span>
            <strong className="block font-mono text-[22px] font-bold text-white">{formatPtBR(heightM, 2)} m</strong>
            <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">35º percentil</span>
          </div>
          <div className="p-[12px] last:border-0 min-w-0">
            <span className="block font-mono text-[10px] font-bold text-[#8D949D] uppercase tracking-[0.06em]">Amostra</span>
            <strong className="block font-mono text-[22px] font-bold text-white">{formatPtBR(sampleMinutes, 0)}′</strong>
            <span className="block font-mono text-[11px] text-[#8D949D] mt-[1px]">29 partidas</span>
          </div>
        </div>
      </div>

      {/* Linha Radar + Leitura rápida */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-16 items-stretch min-w-0 mb-24">
        <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden flex flex-col min-w-0">
          <div className="p-[20px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
            <div>
              <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">Perfil de desempenho</span>
              <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Radar por percentil</h2>
            </div>
            <span className="inline-block px-[8px] py-[2px] rounded-none bg-[#E3E1DA] text-[#6F7379] font-mono text-[10px] uppercase shrink-0">
              Base · 10 jogadores
            </span>
          </div>
          <div className="flex-1 min-h-[300px] p-[20px] flex items-center justify-center min-w-0">
            <svg viewBox="0 0 360 320" width="100%" height="100%" className="shrink-0">
              <defs>
                <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0" />
                  <stop offset="100%" style="stop-color:#000000;stop-opacity:0.1" />
                </radialGradient>
              </defs>
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
              {/* Rótulos */}
              <text x="180" y="20" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">Reflexo</text>
              <text x="295" y="105" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">1×1</text>
              <text x="295" y="240" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">Jogo aéreo</text>
              <text x="180" y="305" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">Reposição</text>
              <text x="65" y="240" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">Posicionamento</text>
              <text x="65" y="105" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="12" fill="#6F7379" dominantBaseline="middle">Defesas</text>
              <text x="180" y="160" textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif" fontSize="10" fill="#2F4BC0" fontWeight="bold">85º</text>
            </svg>
            <p className="mt-[12px] text-[11px] text-[#6F7379] font-mono text-center min-w-0">0 ——— Percentil dentro da posição ——— 100</p>
          </div>
        </div>

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
              <span className="block font-mono text-[11px] font-bold text-[#2F4BC0] uppercase tracking-[0.06em] mb-[8px]">Destaques ({strengths.length})</span>
              <ul className="space-y-[8px] min-w-0">
                {strengths.map((r) => (
                  <li key={r.metric.column} className="flex justify-between gap-[12px] min-w-0 border-b-1 border-[#E3E1DA] pb-[8px] last:border-0 last:pb-0">
                    <span className="font-sans text-[12px] text-[#15171a] min-w-0">{r.metric.label}</span>
                    <span className="font-mono text-[12px] font-bold text-[#2F4BC0] shrink-0">{Math.round(r.pct as number)}º</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pontos de atenção */}
            <div className="mb-[16px] min-w-0">
              <span className="block font-mono text-[11px] font-bold text-[#C2501F] uppercase tracking-[0.06em] mb-[8px]">Pontos de atenção ({warnings.length})</span>
              <ul className="space-y-[8px] min-w-0">
                {warnings.map((r) => (
                  <li key={r.metric.column} className="flex justify-between gap-[12px] min-w-0 border-b-1 border-[#E3E1DA] pb-[8px] last:border-0 last:pb-0">
                    <span className="font-sans text-[12px] text-[#15171a] min-w-0">{r.metric.label}</span>
                    <span className="font-mono text-[12px] font-bold text-[#C2501F] shrink-0">{Math.round(r.pct as number)}º</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nota do scout */}
            <div className="rounded-none border-l-2 border-[#E0663A] bg-[#FBF3EE] p-[12px] min-w-0 shrink-0">
              <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em] mb-[4px]">Nota do scout</span>
              <p className="text-[12px] text-[#5A5A55] leading-[1.5] m-0">
                Bom posicionamento defensivo. Necessita evoluir na saída de bola sob pressão.
              </p>
            </div>
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
                const isLow = pct <= 20;
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
            10 jogadores do grupo
          </span>
        </div>

        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-16 p-[20px] min-w-0">
          <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
            <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Idade</span>
            <span className="inline-block px-[6px] py-[1px] rounded-none bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[10px] font-bold shrink-0">{potential}º</span>
            <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">{age} anos</strong>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Mais jovem</span>
            <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
              <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${potential}%` }} />
            </div>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 18 – 34</span>
          </div>
          <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
            <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Altura</span>
            <span className="inline-block px-[6px] py-[1px] rounded-none bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[10px] font-bold shrink-0">{potential}º</span>
            <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">{formatPtBR(heightM, 2)} m</strong>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Próximo da média</span>
            <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
              <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${potential}%` }} />
            </div>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 1,65 – 1,95 m</span>
          </div>
          <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
            <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Nota média</span>
            <span className="inline-block px-[6px] py-[1px] rounded-none bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[10px] font-bold shrink-0">{potential}º</span>
            <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">{formatPtBR(ratingAvg as unknown as number, 2)}</strong>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Acima da média</span>
            <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
              <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${potential}%` }} />
            </div>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Faixa do grupo · 4,50 – 8,20</span>
          </div>
          <div className="border-1 border-[#E3E1DA] rounded-none p-[16px] min-w-0">
            <span className="block font-mono text-[12px] font-medium text-[#15171a] mb-[4px]">Jogos completos</span>
            <span className="inline-block px-[6px] py-[1px] rounded-none bg-[#ECECE8] text-[#5A5A55] font-mono text-[10px] font-bold shrink-0">{computeStatusFromPotential(potential)}</span>
            <strong className="block font-mono text-[24px] font-bold text-[#15171a] mt-[4px]">{formatPtBR(fullGames ?? 28, 0)}</strong>
            <span className="block font-mono text-[10px] text-[#6F7379] mt-[2px]">Baixa amostra</span>
            <div className="h-[4px] mt-[8px] rounded-none bg-[#E3E1DA] relative shrink-0 overflow-hidden">
              <b className="h-full bg-[#2F4BC0] block shrink-0" style={{ width: `${potential}%` }} />
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
          {/* Abas de categoria */}
          <div className="flex flex-wrap gap-[4px] mb-[20px] min-w-0">
            {[
              { id: "id_contract", name: "Identificação e contrato", count: 33 },
              { id: "participation", name: "Participação e tempo", count: 11 },
              { id: "goalkeeper", name: "Goleiro e defesas", count: 12 },
              { id: "creation", name: "Criação e distribuição", count: 10 },
              { id: "finishing", name: "Finalização", count: 8 },
              { id: "physical", name: "Físico", count: 9 },
              { id: "discipline", name: "Disciplina", count: 5 },
            ].map((cat, i) => (
              <button
                key={cat.id}
                className={`px-[10px] py-[6px] rounded-none border-1 border-[#E3E1DA] text-[10px] font-mono font-bold uppercase tracking-[0.06em] ${i === 0 ? "bg-[#161B26] text-white border-[#161B26]" : "text-[#6F7379] hover:bg-[#F7F6F2]"}`}
              >
                {cat.name} <span className="ml-[4px] text-[#6F7379]">{cat.count} colunas</span>
              </button>
            ))}
          </div>

          {/* Acordeões */}
          <div className="space-y-[8px] min-w-0">
            {[0, 1, 2].map((accIdx) => (
              <div key={accIdx} className="border-1 border-[#E3E1DA] rounded-none min-w-0 overflow-hidden">
                <div className="flex items-center justify-between px-[16px] py-[12px] bg-[#FAFAF7] border-b-1 border-[#E3E1DA] cursor-pointer min-w-0">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className="font-mono text-[12px] font-bold text-[#15171a]">{accIdx === 0 ? "Identificação" : accIdx === 1 ? "Participação" : "Métricas"}</span>
                    <span className="inline-block px-[6px] py-[1px] rounded-none bg-[#E3E1DA] text-[#6F7379] font-mono text-[10px] shrink-0">{accIdx === 0 ? 33 : accIdx === 1 ? 11 : 12} colunas</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#6F7379] shrink-0" />
                </div>
                <div className="p-[16px] min-w-0">
                  <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[12px] min-w-0">
                    {[0, 1, 2].map((fieldIdx) => (
                      <div key={`${accIdx}-${fieldIdx}`} className="bg-[#FAFAF7] border-1 border-[#E3E1DA] rounded-none p-[12px] min-w-0">
                        <span className="block font-mono text-[11px] text-[#6F7379] uppercase tracking-[0.06em] mb-[2px]">
                          {accIdx === 0 ? ["Nome", "Clube", "Nacionalidade"][fieldIdx] : accIdx === 1 ? ["Idade", "Altura", "Pé preferido"][fieldIdx] : ["Nota geral", "Potencial", "Jogos completos"][fieldIdx]}
                        </span>
                        <strong className="font-mono text-[12px] text-[#15171a]">
                          {accIdx === 0 ? ["Bruno Antúnez", "Boston River", "Uruguai"][fieldIdx] : accIdx === 1 ? [age, formatPtBR(heightM, 2) + " m", foot][fieldIdx] : [formatPtBR(ratingAvg as unknown as number, 2), potential, formatPtBR(fullGames ?? 28, 0)][fieldIdx]}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
