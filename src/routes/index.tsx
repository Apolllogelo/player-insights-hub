// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Bookmark, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playersQuery, profilesQuery } from "@/lib/scout-api";
import { RadarChartSvg } from "@/lib/radar-chart";
import { formatValue, toNumber, type PlayerRow, type PositionProfile } from "@/lib/scout-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scoutboard — Visão Geral" },
      {
        name: "description",
        content: "Dashboard de scouting com indicadores, jogadores em destaque e relatório dinâmico.",
      },
    ],
  }),
  component: VisaoGeralPage,
});

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-[#FDEBD0] text-[#A94820]",
    "bg-[#E9EDFB] text-[#3955A8]",
    "bg-[#F0F0ED] text-[#666A6F]",
    "bg-[#FAEE9E] text-[#A94820]",
    "bg-[#EDF5DC] text-[#5D7936]",
    "bg-[#E0EEF7] text-[#2F4BC0]",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getStatusBadge(status?: string) {
  if (status === "Prioridade") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[11px] font-mono font-medium bg-[#FCEBE3] text-[#C2501F]">{status}</span>;
  }
  if (status === "Monitorar") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[11px] font-mono font-medium bg-[#E8ECFA] text-[#2F4BC0]">{status}</span>;
  }
  if (status === "Observação") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[11px] font-mono font-medium bg-[#ECECE8] text-[#5A5A55]">{status}</span>;
  }
  return <span className="inline-block rounded-none border-none px-2 py-1 text-[11px] font-mono font-medium text-[#5A5A55]">{status || "—"}</span>;
}

function computeStatusFromPotential(potential: number) {
  if (potential >= 80) return "Prioridade";
  if (potential >= 70) return "Monitorar";
  return "Observação";
}

function formatRating(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function VisaoGeralPage() {
  const players = useQuery(playersQuery);
  const profiles = useQuery(profilesQuery);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "priority" | "monitor">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playerList = useMemo(() => {
    let list = players.data ?? [];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.club ?? "").toLowerCase().includes(term),
      );
    }
    if (activeFilter === "priority") {
      list = list.filter((p) => (p.data as any)?.status === "Prioridade");
    }
    if (activeFilter === "monitor") {
      list = list.filter((p) => (p.data as any)?.status === "Monitorar");
    }
    return list.slice(0, 50);
  }, [players.data, search, activeFilter]);

  const defaultSelectedId = playerList.length > 0 ? (playerList[0]?.id ?? null) : null;
  const selectedPlayerIdFinal = selectedPlayerId ?? defaultSelectedId;

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerIdFinal) {
      return (players.data ?? []).find((p) => p.id === selectedPlayerIdFinal);
    }
    return playerList[0];
  }, [selectedPlayerIdFinal, playerList, players.data]);

  const selectedProfile = useMemo(() => {
    if (!selectedPlayer) return null;
    return (profiles.data ?? []).find((pr) => pr.player_type === selectedPlayer.player_type);
  }, [selectedPlayer, profiles.data]);

  const radarData = useMemo(() => {
    if (!selectedPlayer) return [];
    if (!selectedProfile || !selectedProfile.metrics.length) return [];
    return selectedProfile.metrics.slice(0, 6).map((metric) => {
      const val = toNumber(selectedPlayer.data[metric.column]);
      return {
        subject: metric.label,
        value: val ?? 50,
        fullMark: 100,
      };
    });
  }, [selectedPlayer, selectedProfile]);

  const selectedRating = useMemo(() => {
    if (!selectedPlayer) return null;
    const profile = (profiles.data ?? []).find((pr) => pr.player_type === selectedPlayer.player_type);
    const ratingCol = profile?.id_map?.rating;
    if (!ratingCol) return null;
    return toNumber(selectedPlayer.data[ratingCol]);
  }, [selectedPlayer, profiles.data]);

  const selectedPotential = useMemo(() => {
    if (!selectedPlayer) return 50;
    const rating = selectedRating;
    if (rating === null) return 50;
    return Math.round(rating * 10);
  }, [selectedRating]);

  const totalPlayers = (players.data ?? []).length;
  const priorityCount = (players.data ?? []).filter((p) => (p.data as any)?.status === "Prioridade").length;
  const monitorCount = (players.data ?? []).filter((p) => (p.data as any)?.status === "Monitorar").length;

  const averageRating = useMemo(() => {
    const ratings = (players.data ?? [])
      .map((p) => {
        const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
        const ratingCol = profile?.id_map?.rating;
        if (!ratingCol) return null;
        return toNumber(p.data[ratingCol]);
      })
      .filter((r): r is number => r !== null);
    if (!ratings.length) return "—";
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return formatRating(avg);
  }, [players.data, profiles.data]);

  return (
    <div className="min-h-screen bg-[#F3F2EE] min-w-0 w-full max-w-full overflow-x-hidden">
      {/* Wrapper único de largura */}
      <div className="mx-auto w-full max-w-[1400px] min-w-0 p-[0_32px] box-border overflow-x-hidden">

        {/* KPI Cards */}
        <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden min-w-0 w-full grid grid-cols-[repeat(4,minmax(0,1fr))] gap-0 mb-24">
          {/* Card 1: Jogadores analisados - fundo navy */}
          <article className="bg-[#161B26] text-white p-[18px_19px_15px] border-r-1 border-[#2A3530] flex flex-col min-h-[142px] min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <span className="font-sans text-[12px] font-normal text-[#D7DCD9] min-w-0">Jogadores analisados</span>
              <span className="inline-block bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[9px] font-bold px-2 py-0.5 rounded-none shrink-0">+12%</span>
            </div>
            <div className="mt-[17px] mb-auto min-w-0">
              <strong className="font-mono text-[32px] leading-1 block">{totalPlayers}</strong>
            </div>
            <div className="stat-foot flex items-center justify-between text-[#8D949D] text-[9px] font-mono min-w-0">
              <div className="avatar-stack flex min-w-0 shrink-0">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#2A3142] border-[2px] border-[#161B26] text-white text-[10px] font-mono shrink-0 ml-[0px]">BA</span>
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#2A3142] border-[2px] border-[#161B26] text-white text-[10px] font-mono shrink-0 ml-[-6px]">IS</span>
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#2A3142] border-[2px] border-[#161B26] text-white text-[10px] font-mono shrink-0 ml-[-6px]">JM</span>
              </div>
              <span className="shrink-0">+{Math.min(totalPlayers, 23)} este mês</span>
            </div>
          </article>

          {/* Card 2: Em observação - branco */}
          <article className="bg-white p-[18px_19px_15px] border-r-1 border-[#E3E1DA] flex flex-col min-h-[142px] min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <span className="font-sans text-[12px] font-normal text-[#6F7379] min-w-0">Em observação</span>
            </div>
            <div className="mt-[17px] mb-auto min-w-0">
              <strong className="font-mono text-[32px] leading-1 text-[#15171a] block">{monitorCount}</strong>
            </div>
            <div className="progress h-[4px] rounded-none bg-[#E3E1DA] mt-auto mb-[9px] overflow-hidden w-full shrink-0">
              <i className="h-full bg-[#2F4BC0] block" style={{ width: "64%" }} />
            </div>
            <div className="stat-foot flex items-center justify-between text-[#6F7379] text-[9px] font-mono min-w-0">
              <span className="shrink-0">64% da meta mensal</span>
              <b className="text-[#15171a] shrink-0">50</b>
            </div>
          </article>

          {/* Card 3: Na shortlist - branco */}
          <article className="bg-white p-[18px_19px_15px] border-r-1 border-[#E3E1DA] flex flex-col min-h-[142px] min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-[6px] min-w-0">
                <Bookmark className="h-4 w-4 text-[#6F7379] shrink-0" />
                <span className="font-sans text-[12px] font-normal text-[#6F7379] shrink-0">Na shortlist</span>
              </div>
            </div>
            <div className="mt-[17px] mb-auto min-w-0">
              <strong className="font-mono text-[32px] leading-1 text-[#15171a] block">{priorityCount}</strong>
            </div>
            <div className="stat-foot flex items-center gap-[-2px] text-[#6F7379] text-[9px] font-mono min-w-0">
              <span className="shrink-0">4 com alta prioridade</span>
              <div className="mini-avatars flex shrink-0">
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
              </div>
            </div>
          </article>

          {/* Card 4: Nota média - branco */}
          <article className="bg-white p-[18px_19px_15px] flex flex-col min-h-[142px] min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <span className="font-sans text-[12px] font-normal text-[#6F7379] min-w-0">Nota média</span>
              <span className="inline-block bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[9px] font-bold px-2 py-0.5 rounded-none shrink-0">↗ 0,4</span>
            </div>
            <div className="mt-[17px] mb-auto min-w-0">
              <strong className="font-mono text-[32px] leading-1 text-[#15171a] block">{averageRating}</strong>
            </div>
            <div className="mt-auto w-full min-w-0 shrink-0">
              <svg className="w-full h-[28px] shrink-0" viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="2,22 12,10 22,26 32,8 42,18 52,14 62,20 72,12 82,24 92,16 102,20 112,10" stroke="#2F4BC0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </article>
        </div>

        {/* Lista + Relatório lado a lado, mesmo wrapper */}
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-16 items-start min-w-0 w-full max-w-full overflow-x-hidden">
          <>
            {/* Coluna esquerda: UM card branco com lista */}
            <div className="bg-white border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden flex flex-col min-w-0 w-full">
              {/* Cabeçalho */}
              <div className="p-[21px] border-b border-[#E3E1DA] flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <span className="block font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.8px] mb-[4px] shrink-0">Lista de trabalho</span>
                  <h2 className="text-[20px] font-semibold text-[#15171a] mb-0 min-w-0">Jogadores em destaque</h2>
                </div>
                <Link to="/jogadores" className="text-button flex items-center gap-[6px] rounded-none bg-transparent border-0 text-[#2F4BC0] text-[10px] hover:bg-transparent font-mono shrink-0">
                  Ver todos <span className="h-4 w-4 shrink-0">›</span>
                </Link>
              </div>

              {/* Busca + filtros */}
              <div className="flex items-center gap-[8px] p-[15px] border-b border-[#E3E1DA] bg-[#F7F7F5] min-w-0">
                <div className="relative flex-1 bg-[#F7F7F5] border border-[#DFE1DE] rounded-none flex items-center gap-[7px] px-[9px] text-[#8A8F93] min-w-[280px] shrink-0">
                  <Search className="h-4 w-4 shrink-0" />
                  <Input
                    placeholder="Buscar jogador ou clube"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent border-0 text-[#15171a] text-[11px] outline-none w-full min-w-0 font-sans shrink-0"
                  />
                </div>
                <div className="flex gap-[2px] shrink-0">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 shrink-0 ${
                      activeFilter === "all"
                        ? "border-[#2F4BC0] bg-[#2F4BC0] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setActiveFilter("priority")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 shrink-0 ${
                      activeFilter === "priority"
                        ? "border-[#2F4BC0] bg-[#2F4BC0] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Prioridade
                  </button>
                  <button
                    onClick={() => setActiveFilter("monitor")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 shrink-0 ${
                      activeFilter === "monitor"
                        ? "border-[#2F4BC0] bg-[#2F4BC0] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Monitorar
                  </button>
                </div>
              </div>

              {/* Tabela - sem overflow-x horizontal */}
              <div className="flex-1 min-h-0 overflow-hidden min-w-0">
                <table className="border-collapse w-full text-left min-w-0">
                  <thead>
                    <tr style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 48px 60px 120px 96px 24px",
                      columnGap: 12,
                      alignItems: "center",
                      width: "100%",
                    }} className="bg-[#F3F2EE] border-b-1 border-[#E3E1DA]">
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA]">JOGADOR</th>
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right">IDADE</th>
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right">NOTA</th>
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-right">POTENCIAL</th>
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA]">STATUS</th>
                      <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-[16px] py-[13px] border-b-1 border-[#E3E1DA] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E1DA] [max-height:560px] overflow-y-auto">
                    {playerList.map((p) => {
                      const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
                      const ratingCol = profile?.id_map?.rating;
                      const rating = ratingCol ? toNumber(p.data[ratingCol]) : null;
                      const statusRaw = (p.data as any)?.status;
                      const potential = rating !== null ? Math.round(rating * 10) : 50;
                      const status = statusRaw ?? computeStatusFromPotential(potential);
                      const isSelected = selectedPlayer?.id === p.id;

                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlayerId(p.id)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) 48px 60px 120px 96px 24px",
                            columnGap: 12,
                            alignItems: "center",
                            width: "100%",
                          }}
                          className={`px-[16px] py-[13px] text-left transition-colors border-b-0 h-[64px] min-w-0 ${
                            isSelected
                              ? "bg-[#EEF1FB] border-l-2 border-[#2F4BC0] pl-[14px]"
                              : "hover:bg-[#F7F6F2]"
                          }`}
                        >
                          <td className="min-w-0">
                            <div className="flex items-center gap-[12px] min-w-0">
                              <div className={`flex h-[40px] w-[40px] items-center justify-center rounded-[2px] text-[10px] font-bold font-mono ${getAvatarColor(p.name)} shrink-0`}>
                                {getInitials(p.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <p className="truncate text-[14px] font-medium text-[#15171a] min-w-0">{p.name}</p>
                                <p className="mt-[1px] text-[12px] text-[#6F7379] font-sans whitespace-nowrap overflow-hidden text-overflow-ellipsis min-w-0">
                                  {p.club || "Sem clube"} · {p.player_type}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="pl-[16px] pr-[16px] text-right">
                            <span className="font-mono text-[12px] text-[#15171a]">{p.age ?? "—"}</span>
                          </td>
                          <td className="pl-[16px] pr-[16px] text-right">
                            <span className="font-mono text-[12px] font-semibold text-[#2F4BC0]">{formatRating(rating)}</span>
                          </td>
                          <td className="pl-[16px] pr-[16px] text-right">
                            <div className="potential flex items-center gap-[8px] min-w-0">
                              <span className="font-mono text-[12px] text-[#6F7379] shrink-0">{potential}</span>
                              <div className="bar-track h-[4px] w-[56px] rounded-[2px] bg-[#E3E1DA] relative shrink-0 overflow-hidden">
                                <b className="h-full bg-[#2F4BC0] block" style={{ width: `${potential}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="pl-[16px] pr-[16px]">
                            {getStatusBadge(status)}
                          </td>
                          <td className="pl-[16px] pr-[16px] text-center">
                            <span className="h-4 w-4 text-[#6F7379] shrink-0">›</span>
                          </td>
                        </button>
                      );
                    })}
                    {playerList.length === 0 && (
                      <tr style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 48px 60px 120px 96px 24px", columnGap: 12, alignItems: "center", width: "100%" }}>
                        <td colSpan={6} className="px-[16px] py-[30px] text-center text-[#6F7379] text-[12px]">
                          Nenhum jogador encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Coluna direita: Relatório do jogador */}
            {selectedPlayer && (
              <div className="sticky top-80 flex flex-col h-full min-w-[380px] overflow-hidden min-w-0">
                <div className="border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden bg-white flex flex-col [max-height:calc(100vh-100px)] overflow-hidden min-w-0">
                  <div className="border-b border-[#E3E1DA] p-[16px] flex items-center justify-between min-w-0 shrink-0">
                    <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase shrink-0">Relatório do jogador</span>
                    <button className="bg-transparent border-0 text-[#6F7379] p-0 hover:text-ink shrink-0">
                      <span className="h-4 w-4">⋯</span>
                    </button>
                  </div>

                  <div className="p-[16px] flex items-center gap-[12px] min-w-0 shrink-0 bg-white">
                    <div className={`flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#2F4BC0] text-white text-[15px] font-bold font-mono shrink-0`}>
                      {getInitials(selectedPlayer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[18px] font-semibold text-[#15171a] leading-tight">{selectedPlayer.name}</h2>
                      <p className="mt-[1px] text-[12px] text-[#6F7379] font-sans shrink-0">
                        {selectedPlayer.club || "Sem clube"} · {selectedPlayer.player_type}
                      </p>
                    </div>
                    <button className="bg-transparent border-0 text-[#6F7379] p-0 hover:text-ink shrink-0">
                      <Bookmark className="h-4 w-4 shrink-0" />
                    </button>
                  </div>

                  <div className="flex gap-[2px] border-b border-[#E3E1DA] min-w-0 shrink-0">
                    {["Visão geral", "Métricas", "Histórico"].map((item, idx) => (
                      <button
                        key={item}
                        className={`text-[10px] font-mono font-bold uppercase transition-colors border-b-2 ${
                          item === "Visão geral" ? "border-[#2F4BC0] text-[#2F4BC0]" : "border-transparent text-[#6F7379] hover:bg-[#F7F7F5]"
                        } px-[16px] py-[8px] shrink-0`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="p-[16px] flex-1 min-h-0 overflow-y-auto min-w-0 shrink-0">
                    <div className="grid grid-cols-3 gap-[4px] mb-[12px] min-w-0">
                      <div className="flex flex-col min-w-0 shrink-0">
                        <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Nota geral</span>
                        <strong className="font-mono text-[14px] text-[#15171a]">{formatRating(selectedRating)}</strong>
                        <span className="text-[10px] text-[#6F7379] mt-[2px]">Top 18%</span>
                      </div>
                      <div className="flex flex-col min-w-0 shrink-0">
                        <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Potencial</span>
                        <strong className="font-mono text-[14px] text-[#15171a]">{selectedPotential}</strong>
                        <span className="text-[10px] text-[#4EAA6A] mt-[2px]">Acima da média</span>
                      </div>
                      <div className="flex flex-col min-w-0 shrink-0">
                        <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Idade</span>
                        <strong className="font-mono text-[14px] text-[#15171a]">{selectedPlayer.age ?? "—"}</strong>
                        <span className="text-[10px] text-[#6F7379] mt-[2px]">{selectedPlayer.age ? selectedPlayer.age + " anos" : "—"}</span>
                      </div>
                    </div>

                    <div className="mb-[12px] min-w-0 shrink-0">
                      <div className="flex justify-center w-full">
                        <RadarChartSvg
                          values={radarData.length ? radarData.map((d) => d.value) : [78, 82, 73, 84, 66, 78]}
                          size={280}
                          color="#2F4BC0"
                        />
                      </div>
                    </div>

                    <div className="mb-[12px] min-w-0 shrink-0">
                      <span className="block font-mono text-[8px] font-bold text-[#6F7379] uppercase mb-[4px]">Nota de observação</span>
                      <div className="rounded-none border-l-2 border-[#E0663A] bg-[#FBF3EE] p-[10px] min-w-0 shrink-0">
                        <p className="text-[12px] text-[#5A5A55] leading-[1.5] m-0">
                          Bom posicionamento defensivo. Necessita evoluir na saída de bola sob pressão.
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto min-w-0 shrink-0">
                      <Button asChild className="w-full rounded-none bg-[#2F4BC0] border-0 text-white text-[11px] font-medium py-[10px] justify-center flex items-center gap-[6px] hover:bg-[#2F4BC0]/90 transition-colors shrink-0">
                        <Link to="/jogador/$id" params={{ id: selectedPlayer.id }}>
                          Abrir perfil completo
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
}
