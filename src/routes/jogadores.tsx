import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Plus, Bookmark, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playersQuery, profilesQuery } from "@/lib/scout-api";
import { getPlayerUid, toNumber, percentile, type PlayerRow, type PositionProfile } from "@/lib/scout-types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

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
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function getStatusBadge(status?: string) {
  if (status === "Prioridade") {
    return <Badge className="h-5 rounded-sm bg-orange-100 text-[10px] text-orange-700 hover:bg-orange-100">Prioridade</Badge>;
  }
  if (status === "Monitorar") {
    return <Badge className="h-5 rounded-sm bg-blue-100 text-[10px] text-blue-700 hover:bg-blue-100">Monitorar</Badge>;
  }
  if (status === "Observação") {
    return <Badge className="h-5 rounded-sm bg-gray-100 text-[10px] text-gray-700 hover:bg-gray-100">Observação</Badge>;
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
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Jogadores</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Consulte, compare e organize todos os jogadores da sua base
          </p>
        </div>
        <Button className="gap-2 bg-[#3458D4] hover:bg-[#2A4BC4]">
          <Plus className="h-4 w-4" />
          Adicionar jogador
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-border bg-white p-4">
          <p className="text-xs text-[#6B7280]">Total de jogadores</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalPlayers}</p>
        </Card>
        <Card className="border-border bg-white p-4">
          <p className="text-xs text-[#6B7280]">Idade média</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{avgAge}</p>
        </Card>
        <Card className="border-border bg-white p-4">
          <p className="text-xs text-[#6B7280]">Nota média</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{avgRating}</p>
        </Card>
        <Card className="border-border bg-white p-4">
          <p className="text-xs text-[#6B7280]">Alta prioridade</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{priorityCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="border-border bg-white">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <Input
                  placeholder="Buscar nome, clube ou posição"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[180px] text-sm">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {playerTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-[160px] text-sm">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating_desc">Nota (maior)</SelectItem>
                  <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="age_asc">Idade (menor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="divide-y divide-border">
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
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-medium ${getAvatarColor(p.name)}`}>
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-[#6B7280]">
                        {p.club || "Sem clube"} · {p.player_type}
                      </p>
                    </div>
                    <div className="w-16 text-center text-sm text-foreground">{p.age ?? "—"}</div>
                    <div className="w-16 text-center text-sm text-foreground">—</div>
                    <div className="w-16 text-center text-sm font-medium text-[#3458D4]">
                      {rating !== null ? rating.toFixed(1) : "—"}
                    </div>
                    <div className="w-24">{getStatusBadge(status)}</div>
                    <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-[#1F2127] bg-[#0F1015] text-white">
            <div className="border-b border-[#1F2127] px-5 py-4">
              <h3 className="text-sm font-semibold">Visualização rápida</h3>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-md text-sm font-medium ${getAvatarColor(selectedPlayer?.name || "")}`}>
                  {selectedPlayer ? getInitials(selectedPlayer.name) : "—"}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedPlayer?.name || "—"}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    {selectedPlayer?.club || "Sem clube"} · {selectedPlayer?.player_type}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9CA3AF] hover:text-white">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-4 h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#2A2F37" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#9CA3AF" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Jogador" dataKey="value" stroke="#3458D4" fill="#3458D4" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-md bg-[#16181D] p-2 text-center">
                  <p className="text-[10px] text-[#9CA3AF]">Nota</p>
                  <p className="text-sm font-semibold">7.8</p>
                </div>
                <div className="rounded-md bg-[#16181D] p-2 text-center">
                  <p className="text-[10px] text-[#9CA3AF]">Potencial</p>
                  <p className="text-sm font-semibold">8.4</p>
                </div>
                <div className="rounded-md bg-[#16181D] p-2 text-center">
                  <p className="text-[10px] text-[#9CA3AF]">Idade</p>
                  <p className="text-sm font-semibold">{selectedPlayer?.age ?? "—"}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-white">Principais destaques</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Jogo aéreo</span>
                    <span className="text-white">91º pct</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Desarmes</span>
                    <span className="text-white">87º pct</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Interceptações</span>
                    <span className="text-white">84º pct</span>
                  </div>
                </div>
              </div>
              <Button asChild className="w-full bg-white text-[#0F1015] hover:bg-gray-100">
                <Link to="/jogador/$id" params={{ id: selectedPlayer?.id || "" }}>
                  Abrir ficha completa
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
