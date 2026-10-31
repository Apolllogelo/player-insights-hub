import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Bookmark, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { playersQuery, profilesQuery } from "@/lib/scout-api";
import { RadarChartSvg } from "@/lib/radar-chart";
import { toNumber, type PlayerRow, type PositionProfile } from "@/lib/scout-types";

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

function getStatusBadge(status?: string) {
  if (status === "Prioridade") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#FDECE3] text-[#E0663A] uppercase">{status}</span>;
  }
  if (status === "Monitorar") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#EDF4FB] text-[#2F4BC0] uppercase">{status}</span>;
  }
  if (status === "Observação") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#F2F0EC] text-[#6F7379] uppercase">{status}</span>;
  }
  return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium text-[#6F7379] uppercase">{status || "—"}</span>;
}

function VisaoGeralPage() {
  const players = useQuery(playersQuery);
  const profiles = useQuery(profilesQuery);
  const datasets = useQuery(datasetsQuery);

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

  const defaultSelectedId = playerList.length > 0 ? playerList[0].id : null;
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
        subject: metric.label.length > 12 ? metric.label.slice(0, 12) + "..." : metric.label,
        value: val ?? 50,
        fullMark: 100,
      };
    });
  }, [selectedPlayer, selectedProfile]);

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
    return avg.toFixed(1);
  }, [players.data, profiles.data]);

  return (
    <div className="min-h-screen bg-[#F3F2EE]">
      <div className="mx-auto max-w-[1380px] p-[38px_32px_60px]">

        {/* KPI Cards */}
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-16 mb-24">
          <article className="bg-white border-1 border-[#E3E1DA] rounded-[4px] p-[18px_19px_15px] border-t-2 border-[#2F4BC0] flex flex-col min-h-[142px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase">Jogadores analisados</span>
              <span className="inline-block bg-[#E8ECFA] text-[#2F4BC0] font-mono text-[9px] font-bold px-2 py-0.5 rounded-none">+12%</span>
            </div>
            <div className="mt-[17px] mb-auto">
              <strong className="font-mono text-[31px] leading-1 text-[#15171a] block">{totalPlayers}</strong>
            </div>
            <div className="stat-foot flex items-center justify-between text-[#6F7379] text-[9px] font-mono">
              <div className="avatar-stack flex">
                <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2F4BC0] text-white text-[7px] -ml-[-2px]">BA</span>
                <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2F4BC0] text-white text-[7px] -ml-[-5px]">IS</span>
                <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2F4BC0] text-white text-[7px] -ml-[-5px]">JM</span>
              </div>
              <span>+{Math.min(totalPlayers, 23)} este mês</span>
            </div>
          </article>

          <article className="bg-white border-1 border-[#E3E1DA] rounded-[4px] p-[18px_19px_15px] flex flex-col min-h-[142px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase">Em observação</span>
            </div>
            <div className="mt-[17px] mb-auto">
              <strong className="font-mono text-[31px] leading-1 text-[#15171a] block">{monitorCount}</strong>
            </div>
            <div className="progress h-[4px] rounded-none bg-[#E3E1DA] mt-auto mb-[9px] overflow-hidden w-full">
              <i className="h-full bg-[#2F4BC0] block" style={{ width: "65%" }} />
            </div>
            <div className="stat-foot flex items-center justify-between text-[#6F7379] text-[9px] font-mono">
              <span>Meta mensal: 40</span>
              <b className="text-[#15171a]">50</b>
            </div>
          </article>

          <article className="bg-white border-1 border-[#E3E1DA] rounded-[4px] p-[18px_19px_15px] flex flex-col min-h-[142px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase">Na shortlist</span>
            </div>
            <div className="mt-[17px] mb-auto">
              <strong className="font-mono text-[31px] leading-1 text-[#15171a] block">{priorityCount}</strong>
            </div>
            <div className="stat-foot flex items-center gap-[-2px] text-[#6F7379] text-[9px] font-mono">
              <span>4 com alta prioridade</span>
              <div className="mini-avatars flex">
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
                <i className="h-[19px] w-[19px] rounded-full bg-[#E3E1DA] border-[2px] border-white -ml-[-5px]" />
              </div>
            </div>
          </article>

          <article className="bg-white border-1 border-[#E3E1DA] rounded-[4px] p-[18px_19px_15px] flex flex-col min-h-[142px]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase">Nota média</span>
            </div>
            <div className="mt-[17px] mb-auto">
              <strong className="font-mono text-[31px] leading-1 text-[#15171a] block">{averageRating}</strong>
            </div>
            <div className="flex h-[32px] items-end gap-[0.5px] mt-auto">
              {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
                <div key={i} className="w-[1.5px] rounded-none bg-[#2F4BC0]/40" style={{ height: `${h}%` }} />
              ))}
            </div>
          </article>
        </div>

        {/* Seção Jogadores em destaque - layout 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-24 items-start">

          {/* Coluna esquerda: Tabela */}
          <div className="flex flex-col min-w-0">
            <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="eyebrow block mb-[4px] font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.8px]">
                  Jogadores em destaque
                </span>
                <h2 className="text-[18px] font-semibold text-[#15171a] mb-0">Lista de trabalho</h2>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto max-w-[340px]">
                <div className="relative flex-1 bg-[#F7F7F5] border-1 border-[#DFE1DE] rounded-none flex items-center gap-[7px] px-[10px] py-[8px]">
                  <Search className="h-4 w-4 text-[#6F7379]" />
                  <Input
                    placeholder="Buscar jogador ou clube"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent border-0 text-[#15171a] text-[11px] outline-none w-full min-w-0 font-sans"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveFilter("all")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 ${
                      activeFilter === "all"
                        ? "border-[#161B26] bg-[#161B26] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setActiveFilter("priority")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 ${
                      activeFilter === "priority"
                        ? "border-[#161B26] bg-[#161B26] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Prioridade
                  </button>
                  <button
                    onClick={() => setActiveFilter("monitor")}
                    className={`px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition-colors border-1 ${
                      activeFilter === "monitor"
                        ? "border-[#161B26] bg-[#161B26] text-white"
                        : "border-[#E3E1DA] text-[#6F7379] hover:bg-[#F7F6F2]"
                    }`}
                  >
                    Monitorar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden flex flex-col [max-height:640px]">
              <table className="border-collapse w-full text-left">
                <thead>
                  <tr className="bg-[#F3F2EE] border-b-1 border-[#E3E1DA]">
                    <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-16 py-[13px] border-b-1 border-[#E3E1DA]">Jogador</th>
                    <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-16 py-[13px] border-b-1 border-[#E3E1DA] w-[56px] text-right">Idade</th>
                    <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-16 py-[13px] border-b-1 border-[#E3E1DA] w-[56px] text-right">Nota</th>
                    <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-16 py-[13px] border-b-1 border-[#E3E1DA] w-[96px] text-right">Potencial</th>
                    <th className="font-mono text-[11px] font-bold text-[#6F7379] uppercase px-16 py-[13px] border-b-1 border-[#E3E1DA] w-[24px] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E1DA]">
                  {playerList.map((p) => {
                    const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
                    const ratingCol = profile?.id_map?.rating;
                    const rating = ratingCol ? toNumber(p.data[ratingCol]) : null;
                    const isSelected = selectedPlayer?.id === p.id;

                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlayerId(p.id)}
                        className={`flex w-full items-center gap-[11px] px-16 py-[13px] text-left transition-colors border-b-0 ${
                          isSelected
                            ? "bg-[#EEF1FB] border-l-2 border-[#2F4BC0]"
                            : "hover:bg-[#F7F6F2]"
                        } h-[52px]`}
                      >
                        <td className="w-0">
                          <div className={`flex h-[32px] w-[32px] items-center justify-center rounded-none text-[10px] font-bold bg-[#E8ECFA] text-[#2F4BC0] font-mono`}>
                            {getInitials(p.name)}
                          </div>
                        </td>
                        <td className="pl-0 pr-16">
                          <div className="directory-player flex flex-col min-w-0">
                            <p className="truncate text-[14px] font-medium text-[#15171a]">{p.name}</p>
                            <p className="mt-[1px] text-[12px] text-[#6F7379] font-sans">
                              {p.club || "Sem clube"} · {p.player_type}
                            </p>
                          </div>
                        </td>
                        <td className="pl-0 pr-16 w-[56px] text-right">
                          <span className="font-mono text-[12px] text-[#15171a]">{p.age ?? "—"}</span>
                        </td>
                        <td className="pl-0 pr-16 w-[56px] text-right">
                          <span className="font-mono text-[12px] font-semibold text-[#2F4BC0]">
                            {rating !== null ? rating.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="pl-0 pr-16 w-[96px] text-right">
                          <div className="potential flex items-center gap-[8px] justify-end">
                            <i className="h-[4px] rounded-none bg-[#E3E1DA] overflow-hidden w-[58px] block" />
                            <b className="h-[4px] rounded-none bg-[#2F4BC0] overflow-hidden w-full block" style={{ width: `${rating !== null ? rating * 10 : 50}%` }} />
                            <span className="font-mono text-[10px] text-[#6F7379]">
                              {rating !== null ? Math.round(rating * 10) : 50}
                            </span>
                          </div>
                        </td>
                        <td className="pl-0 pr-16 w-[24px] text-center">
                          <span className="h-4 w-4 text-[#6F7379]">›</span>
                        </td>
                      </button>
                    );
                  })}
                  {playerList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-16 py-[30px] text-center text-[#6F7379] text-[12px]">
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
            <div className="sticky top-80 flex flex-col h-full min-w-0 lg:min-w-[340px]">
              <div className="border-1 border-[#E3E1DA] rounded-[4px] overflow-hidden bg-white flex flex-col [max-height:640px] overflow-hidden">
                <div className="bg-[#161B26] text-white p-[16px]">
                  <div className="flex items-center gap-[12px]">
                    <div className={`flex h-[32px] w-[32px] items-center justify-center bg-[#2F4BC0] text-white text-[11px] font-bold font-mono`}>
                      {getInitials(selectedPlayer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[16px] font-semibold text-white leading-tight">{selectedPlayer.name}</h2>
                      <p className="mt-[1px] text-[12px] text-[#D7DCD9] font-sans">
                        {selectedPlayer.club || "Sem clube"} · {selectedPlayer.player_type}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-[16px] flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-[4px] mb-[12px]">
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Nota</span>
                      <strong className="font-mono text-[14px] text-[#15171a]">
                        {rating !== null ? rating.toFixed(1) : "—"}
                      </strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Potencial</span>
                      <strong className="font-mono text-[14px] text-[#15171a]">84</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] font-bold text-[#6F7379] uppercase">Idade</span>
                      <strong className="font-mono text-[14px] text-[#15171a]">
                        {selectedPlayer.age ?? "—"}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-[12px]">
                    <div className="flex justify-center">
                      <RadarChartSvg
                        values={radarData.length ? radarData.map((d) => d.value) : [78, 82, 73, 84, 66, 78]}
                        size={160}
                        color="#2F4BC0"
                      />
                    </div>
                  </div>

                  <div className="mb-[12px]">
                    <span className="block font-mono text-[8px] font-bold text-[#6F7379] uppercase mb-[4px]">Principais destaques</span>
                    {radarData
                      .map((d, i) => ({ value: d.value, label: d.subject }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                      .map((metric) => (
                        <div key={metric.label} className="flex items-center justify-between text-[8px] font-mono gap-[4px] mb-[2px]">
                          <span className="text-[#6F7379]">{metric.label}</span>
                          <strong className="text-[#15171a]">{metric.value}º pct</strong>
                        </div>
                      ))}
                  </div>

                  <div className="mt-auto">
                    <Button asChild className="w-full rounded-none bg-[#2F4BC0] border-0 text-white text-[11px] font-medium py-[10px] justify-center flex items-center gap-[6px] hover:bg-[#2F4BC0]/90 transition-colors">
                      <Link to="/jogador/$id" params={{ id: selectedPlayer.id }}>
                        Ver ficha completa
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
