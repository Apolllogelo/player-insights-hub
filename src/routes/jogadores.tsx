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
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#FDECE3] text-[#E0663A]">Prioridade</span>;
  }
  if (status === "Monitorar") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#EDF4FB] text-[#2F4BC0]">Monitorar</span>;
  }
  if (status === "Observação") {
    return <span className="inline-block rounded-none border-none px-2 py-1 text-[8px] font-mono font-medium bg-[#F2F0EC] text-[#6F7379]">Observação</span>;
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
    <div className="bg-surface p-[38px_32px_60px] max-w-[1380px] mx-auto min-h-screen">
      <div className="directory-heading flex items-flex-end justify-between mb-[24px]">
        <div>
          <span className="eyebrow block mb-[4px] font-mono text-[8px] font-bold text-muted-foreground tracking-[0.8px] uppercase">
            Base de dados / Jogadores
          </span>
          <h1 className="text-[clamp(30px,3vw,40px)] font-semibold tracking[-1.5px] leading-1 mb-0 text-ink">
            Jogadores
          </h1>
          <p className="mt-[10px] text-[12px] text-muted-foreground">
            Consulte, compare e organize todos os jogadores da sua base.
          </p>
        </div>
        <Button className="directory-action rounded-none border border-border text-muted-foreground text-[10px] font-medium px-[13px] py-[10px] hover:bg-accent transition-colors">
          <Plus className="h-4 w-4" />
          Adicionar jogador
        </Button>
      </div>

      <div className="directory-kpis grid grid-cols-[repeat(4,1fr)] gap-[1px] border border-border mb-[14px]">
        <div className="bg-surface flex flex-col gap-[9px] p-[14px_17px] border-b border-border">
          <span className="font-mono text-[7px] tracking-[0.4px] text-muted-foreground uppercase">Total de jogadores</span>
          <strong className="font-mono text-[21px] font-medium text-ink">{totalPlayers}</strong>
        </div>
        <div className="bg-surface flex flex-col gap-[9px] p-[14px_17px] border-b border-border">
          <span className="font-mono text-[7px] tracking-[0.4px] text-muted-foreground uppercase">Idade média</span>
          <strong className="font-mono text-[21px] font-medium text-ink">{avgAge}</strong>
        </div>
        <div className="bg-surface flex flex-col gap-[9px] p-[14px_17px] border-b border-border">
          <span className="font-mono text-[7px] tracking-[0.4px] text-muted-foreground uppercase">Nota média</span>
          <strong className="font-mono text-[21px] font-medium text-ink">{avgRating}</strong>
        </div>
        <div className="bg-surface flex flex-col gap-[9px] p-[14px_17px] border-b border-border">
          <span className="font-mono text-[7px] tracking-[0.4px] text-muted-foreground uppercase">Alta prioridade</span>
          <strong className="font-mono text-[21px] font-medium text-ink">{priorityCount}</strong>
        </div>
      </div>

      <div className="directory-layout grid gap-[14px] grid-cols-[minmax(0,1fr)_300px]">
        <div className="directory-list min-w-0">
          <div className="directory-toolbar flex items-center gap-[8px] p-[15px] border-b border-border bg-surface">
            <div className="directory-search relative flex-1 bg-[#F7F7F5] border border-input rounded-none flex items-center gap-[7px] px-[9px] text-muted-foreground">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar nome, clube ou posição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-0 text-ink text-[10px] outline-none w-full min-w-0"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-[#F7F7F5] border border-input text-muted-foreground text-[9px] h-[36px] outline-none p-[0_24px_0_9px]">
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
          <div className="directory-count border-t border-border border-b border-border flex items-center justify-between font-mono text-[7px] tracking-[0.3px] px-[15px] py-[9px] text-muted-foreground bg-[#F7F7F5]">
            <span>{playerList.length} jogadores</span>
            <span>Última atualização · Hoje</span>
          </div>
          <div className="directory-table-wrapper border border-border rounded-[3px] overflow-hidden bg-surface">
            <table className="border-collapse w-full text-left">
              <thead>
                <tr className="bg-[#F7F7F5]">
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]">Jogador</th>
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]">Idade</th>
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]">Altura</th>
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]">Nota</th>
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]">Status</th>
                  <th className="border-b border-border font-mono text-[7px] font-bold tracking-[0.4px] text-muted-foreground uppercase px-[14px] py-[12px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                      className={`flex w-full items-center gap-[11px] px-[14px] py-[12px] text-left transition-colors border-b border-border ${
                        isSelected
                          ? "bg-[#F7F7F5] border-l-[3px] border-primary"
                          : "hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[3px] text-[10px] font-bold ${getAvatarColor(p.name)}`}>
                        {getInitials(p.name)}
                      </div>
                      <div className="directory-player flex flex-col min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        <p className="mt-[3px] text-[9px] text-muted-foreground font-mono uppercase">
                          {p.club || "Sem clube"} · {p.player_type}
                        </p>
                      </div>
                      <div className="directory-meta flex flex-col gap-[3px]">
                        <span className="font-mono text-[7px] text-muted-foreground uppercase">Idade</span>
                        <strong className="font-mono text-[10px] text-ink">{p.age ?? "—"}</strong>
                      </div>
                      <div className="directory-meta flex flex-col gap-[3px]">
                        <span className="font-mono text-[7px] text-muted-foreground uppercase">Altura</span>
                        <strong className="font-mono text-[10px] text-ink">{p.height ?? "—"} cm</strong>
                      </div>
                      <div className="directory-rating flex flex-col gap-[3px]">
                        <span className="font-mono text-[7px] text-muted-foreground uppercase">Nota</span>
                        <strong className="font-mono text-[11px] font-semibold text-primary">
                          {rating !== null ? rating.toFixed(1) : "—"}
                        </strong>
                      </div>
                      <span className={`rounded-none border-none px-2 py-1 text-[7px] font-mono font-medium ${
                        status === "Prioridade"
                          ? "bg-[#FDECE3] text-[#E0663A]"
                          : status === "Monitorar"
                            ? "bg-[#EDF4FB] text-[#2F4BC0]"
                            : status === "Observação"
                              ? "bg-[#F2F0EC] text-[#6F7379]"
                              : "text-muted-foreground"
                      }`} uppercase>{status || "—"}</span>
                      <div className="flex h-4 w-4 items-center justify-center text-muted-foreground">
                        <span className="h-4 w-4">›</span>
                      </div>
                    </button>
                  );
                })}
                {playerList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border-b border-border px-[14px] py-[30px] text-center text-muted-foreground text-[10px]">
                      Nenhum jogador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPlayer && (
          <aside className="directory-preview border border-border rounded-[3px] overflow-hidden bg-surface text-ink p-[18px] sticky top-[88px]">
            <div className="preview-top flex items-center justify-between mb-[10px]">
              <span className="eyebrow block font-mono text-[8px] font-bold text-muted-foreground tracking-[0.8px] uppercase">
                Visualização rápida
              </span>
              <button className="bg-transparent border-0 text-muted-foreground p-0 hover:text-ink transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="preview-player flex items-center gap-[12px] mb-[10px]">
              <div className={`avatar avatar-large rounded-none h-[54px] w-[54px] text-[15px] flex items-center justify-center font-bold font-mono ${getAvatarColor(selectedPlayer.name)}`}>
                {getInitials(selectedPlayer.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-ink">{selectedPlayer.name}</h2>
                <p className="mt-[4px] text-[10px] text-muted-foreground font-mono uppercase">
                  {selectedPlayer.club || "Sem clube"} · {selectedPlayer.player_type}
                </p>
              </div>
            </div>
            <div className="mt-[10px] mb-[8px]">
              <RadarChartSvg values={radarData.length ? radarData.map((d) => d.value) : [78, 82, 73, 84, 66, 78]} size={180} color="primary" />
            </div>
            <div className="preview-score grid grid-cols-3 gap-[4px] mb-[10px]">
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-muted-foreground uppercase">Nota</span>
                <strong className="font-mono text-[12px] text-ink">{rating !== null ? rating.toFixed(1) : "—"}</strong>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-muted-foreground uppercase">Potencial</span>
                <strong className="font-mono text-[12px] text-ink">84</strong>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[7px] text-muted-foreground uppercase">Idade</span>
                <strong className="font-mono text-[12px] text-ink">{selectedPlayer.age ?? "—"}</strong>
              </div>
            </div>
            <div className="preview-highlights mt-[10px]">
              <span className="block font-mono text-[7px] text-muted-foreground uppercase mb-[4px]">Principais destaques</span>
              {radarData
                .map((d, i) => ({ value: d.value, label: d.subject }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 3)
                .map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-[7px] font-mono gap-[4px]">
                    <span className="text-muted-foreground">{metric.label}</span>
                    <strong className="text-ink">{metric.value}º pct</strong>
                  </div>
                ))}
            </div>
            <Button asChild className="w-full mt-[10px] rounded-none bg-primary border-0 text-white text-[10px] font-medium py-[10px] justify-center flex items-center gap-[6px] hover:bg-primary/90 transition-colors">
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
