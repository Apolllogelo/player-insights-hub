import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Plus, Bookmark, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playersQuery, profilesQuery } from "@/lib/scout-api";
import { toNumber, type PlayerRow, type PositionProfile } from "@/lib/scout-types";
import { RadarChartSvg } from "@/lib/radar-chart";

export const Route = createFileRoute("/jogadores")({
  head: () => ({
    meta: [
      { title: "Scoutboard — Jogadores" },
      {
        name: "description",
        content: "Consulte, compare e organize todos os jogadores da sua base",
      },
    ],
  }),
  component: JogadoresPage,
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
    "bg-amber-100 text-amber-700",
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-pink-100 text-pink-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getStatusBadge(status?: string) {
  if (status === "Prioridade") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-faee9e text-[#a94820]">Prioridade</span>;
  }
  if (status === "Monitorar") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#e9edfb] text-[#3955a8]">Monitorar</span>;
  }
  if (status === "Observação") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#f0f0ed] text-[#666a6f]">Observação</span>;
  }
  return null;
}

function computeRadarData(player: PlayerRow, profile: PositionProfile | null | undefined) {
  if (!profile || !profile.metrics.length) return [];
  return profile.metrics.slice(0, 6).map((metric) => {
    const val = toNumber(player.data[metric.column]);
    return {
      subject: metric.label.length > 10 ? metric.label.slice(0, 10) + "..." : metric.label,
      value: val ?? 50,
      fullMark: 100,
    };
  });
}

function JogadoresPage() {
  const players = useQuery(playersQuery);
  const profiles = useQuery(profilesQuery);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating_desc");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const playerTypes = useMemo(() => {
    const types = new Set((players.data ?? []).map((p) => p.player_type));
    return Array.from(types).sort();
  }, [players.data]);

  const playerList = useMemo(() => {
    let list = players.data ?? [];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.club ?? "").toLowerCase().includes(term) ||
          p.player_type.toLowerCase().includes(term),
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((p) => p.player_type === typeFilter);
    }
    return list;
  }, [players.data, search, typeFilter]);

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId) return (players.data ?? []).find((p) => p.id === selectedPlayerId);
    return playerList[0];
  }, [selectedPlayerId, playerList, players.data]);

  const selectedProfile = useMemo(() => {
    if (!selectedPlayer) return null;
    return (profiles.data ?? []).find((pr) => pr.player_type === selectedPlayer.player_type);
  }, [selectedPlayer, profiles.data]);

  const radarData = useMemo(() => {
    if (!selectedPlayer) return [];
    return computeRadarData(selectedPlayer, selectedProfile);
  }, [selectedPlayer, selectedProfile]);

  const totalPlayers = (players.data ?? []).length;
  const avgAge = useMemo(() => {
    const ages = (players.data ?? []).map((p) => p.age).filter((a): a is number => a !== null);
    if (!ages.length) return "—";
    return (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
  }, [players.data]);
  const avgRating = useMemo(() => {
    const ratings = (players.data ?? [])
      .map((p) => {
        const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
        const ratingCol = profile?.id_map?.rating;
        if (!ratingCol) return null;
        return toNumber(p.data[ratingCol]);
      })
      .filter((r): r is number => r !== null);
    if (!ratings.length) return "—";
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [players.data, profiles.data]);
  const priorityCount = (players.data ?? []).filter((p) => (p.data as any)?.status === "Prioridade").length;

  return (
    <div className="p-[38px_32px_60px] max-w-[1380px] mx-auto">
      <div className="directory-heading flex items-flex-end justify-between mb-[24px]">
        <div>
          <span className="eyebrow block mb-[4px] text-[8px] font-mono font-bold text-[#74787d] tracking-[0.8px]">
            BASE DE DADOS / JOGADORES
          </span>
          <h1 className="text-[clamp(30px,3vw,40px)] font-semibold tracking[-1.5px] leading-1 mb-0">Jogadores</h1>
          <p className="mt-[10px] text-[12px] text-[#74787d]">
            Consulte, compare e organize todos os jogadores da sua base.
          </p>
        </div>
        <Button className="directory-action rounded-none border border-[#cfd2cf] text-[#4f555a] text-[10px] font-medium px-[13px] py-[10px]">
          <Plus className="h-4 w-4" />
          Adicionar jogador
        </Button>
      </div>

      <div className="directory-kpis grid grid-cols-[repeat(4,1fr)] gap-[1px] border border-[#d9dbd8] bg-[#d9dbd8] mb-[14px]">
        <div className="bg-[#fff] flex flex-col gap-[9px] p-[14px_17px]">
          <span className="font-mono text-[7px] tracking-[0.4px] text-[#8b8f94]">TOTAL DE JOGADORES</span>
          <strong className="font-mono text-[21px] font-medium">{totalPlayers}</strong>
        </div>
        <div className="bg-[#fff] flex flex-col gap-[9px] p-[14px_17px]">
          <span className="font-mono text-[7px] tracking-[0.4px] text-[#8b8f94]">IDADE MÉDIA</span>
          <strong className="font-mono text-[21px] font-medium">{avgAge}</strong>
        </div>
        <div className="bg-[#fff] flex flex-col gap-[9px] p-[14px_17px]">
          <span className="font-mono text-[7px] tracking-[0.4px] text-[#8b8f94]">NOTA MÉDIA</span>
          <strong className="font-mono text-[21px] font-medium">{avgRating}</strong>
        </div>
        <div className="bg-[#fff] flex flex-col gap-[9px] p-[14px_17px]">
          <span className="font-mono text-[7px] tracking-[0.4px] text-[#8b8f94]">ALTA PRIORIDADE</span>
          <strong className="font-mono text-[21px] font-medium">{priorityCount}</strong>
        </div>
      </div>

      <div className="directory-layout grid gap-[14px] grid-cols-[minmax(0,1fr)_300px]">
        <div className="directory-list min-w-0">
          <div className="directory-toolbar flex items-center gap-[8px] p-[15px]">
            <div className="directory-search relative flex-1 bg-[#f7f7f5] border border-[#dfe1de] rounded-none flex items-center gap-[7px] px-[9px] text-[#8a8f93]">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar nome, clube ou posição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-0 text-[10px] outline-none w-full min-w-0"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-[#f7f7f5] border border-[#dfe1de] text-[#5e6469] text-[9px] h-[36px] outline-none p-[0_24px_0_9px]">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {playerTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="directory-count bg-[#f1f2ef] border-t border-[#dfe1de] border-b border-[#dfe1de] flex items-center justify-between font-mono text-[7px] tracking-[0.3px] px-[15px] py-[9px] text-[#7e8388]">
            <span>{playerList.length} jogadores</span>
            <span>ÚLTIMA ATUALIZAÇÃO · HOJE</span>
          </div>
          <div className="directory-rows divide-y divide-[#e6e8e5]">
            {playerList.map((p) => {
              const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
              const ratingCol = profile?.id_map?.rating;
              const rating = ratingCol ? toNumber(p.data[ratingCol]) : null;
              const status = (p.data as any)?.status;
              const isSelected = selectedPlayer?.id === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={`directory-row grid items-center gap-[11px] px-[14px] py-[12px] text-left transition-colors w-full ${
                    isSelected
                      ? "bg-[#f1f3fb] border-l-[3px] border-[#3155c6]"
                      : "bg-[#fff] hover:bg-[#f8f9fc]"
                  }`}
                >
                  <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-[10px] font-bold ${getAvatarColor(p.name)}`}>
                    {getInitials(p.name)}
                  </div>
                  <div className="directory-player flex flex-col min-w-0">
                    <p className="truncate text-[10px] font-semibold text-[#252a2e]">{p.name}</p>
                    <p className="mt-[3px] text-[8px] text-[#8c9195] font-mono">{p.club || "Sem clube"} · {p.player_type}</p>
                  </div>
                  <div className="directory-meta flex flex-col gap-[3px]">
                    <span className="font-mono text-[6px] text-[#999da1]">IDADE</span>
                    <strong className="font-mono text-[9px] text-[#50565b]">{p.age ?? "—"}</strong>
                  </div>
                  <div className="directory-meta flex flex-col gap-[3px]">
                    <span className="font-mono text-[6px] text-[#999da1]">ALTURA</span>
                    <strong className="font-mono text-[9px] text-[#50565b]">{p.height ?? "—"} cm</strong>
                  </div>
                  <div className="directory-rating flex flex-col gap-[3px]">
                    <span className="font-mono text-[6px] text-[#999da1]">NOTA</span>
                    <strong className="font-mono text-[12px] font-semibold text-[#3155c6]">
                      {rating !== null ? rating.toFixed(1) : "—"}
                    </strong>
                  </div>
                  <span className={`rounded-none border-none px-2 py-1 text-[7px] font-mono font-medium ${
                    status === "Prioridade"
                      ? "bg-faee9e text-[#a94820]"
                      : status === "Monitorar"
                        ? "bg-[#e9edfb] text-[#3955a8]"
                        : status === "Observação"
                          ? "bg-[#f0f0ed] text-[#666a6f]"
                          : "text-[#999da1]"
                  }`}>{status || "—"}</span>
                  <div className="flex h-4 w-4 items-center justify-center text-[#9ca1a5]">
                    <span className="h-4 w-4">›</span>
                  </div>
                </button>
              );
            })}
            {playerList.length === 0 && (
              <div className="evaluation-empty text-center text-[#8a8f93] text-[10px] py-[30px]">
                Nenhum jogador encontrado.
              </div>
            )}
          </div>
        </div>

        {selectedPlayer && (
          <aside className="directory-preview bg-[#20252d] text-[#fff] p-[18px] sticky top-[88px]">
            <div className="preview-top flex items-center justify-between">
              <span className="eyebrow block text-[8px] font-mono font-bold text-[#8d949d] tracking-[0.8px]">VISUALIZAÇÃO RÁPIDA</span>
              <button className="bg-transparent border-0 text-[#76817c] p-0">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="preview-player flex items-center gap-[12px]">
              <div className={`avatar avatar-large rounded-none h-[54px] w-[54px] text-[15px] flex items-center justify-center font-bold font-mono ${getAvatarColor(selectedPlayer.name)}`}>
                {getInitials(selectedPlayer.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-mono">{selectedPlayer.name}</h2>
                <p className="mt-[4px] text-[10px] text-[#8c9195] font-mono">{selectedPlayer.club || "Sem clube"} · {selectedPlayer.player_type}</p>
              </div>
            </div>
            <div className="mt-[10px]">
              <RadarChartSvg values={radarData.length ? radarData.map((d) => d.value) : [78, 82, 73, 84, 66, 78]} size={180} color="#3155c6" />
            </div>
            <div className="preview-score mt-[8px] grid grid-cols-3 gap-[4px]">
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-[#8c9195]">NOTA</span>
                <strong className="font-mono text-[12px] text-[#fff]">{rating !== null ? rating.toFixed(1) : "—"}</strong>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-[#8c9195]">POTENCIAL</span>
                <strong className="font-mono text-[12px] text-[#fff]">84</strong>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-[#8c9195]">IDADE</span>
                <strong className="font-mono text-[12px] text-[#fff]">{selectedPlayer.age ?? "—"}</strong>
              </div>
            </div>
            <div className="preview-highlights mt-[10px]">
              <span className="block font-mono text-[7px] text-[#8c9195] mb-[4px]">PRINCIPAIS DESTAQUES</span>
              {radarData
                .map((d, i) => ({ value: d.value, label: d.subject }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 3)
                .map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-[7px] font-mono gap-[4px]">
                    <span className="text-[#8c9195]">{metric.label}</span>
                    <strong className="text-[#fff]">{metric.value}º pct</strong>
                  </div>
                ))}
            </div>
            <Button asChild className="w-full mt-[10px] rounded-none bg-[#3155c6] border-0 text-white text-[10px] font-medium py-[10px] justify-center flex items-center gap-[6px]">
              <Link to="/jogador/$id" params={{ id: selectedPlayer.id }}>
                Abrir ficha completa
                <span className="h-4 w-4">›</span>
              </Link>
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}
