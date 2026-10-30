import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Upload, Bookmark, ChevronRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PlayerFace } from "@/components/player-face";
import { datasetsQuery, playersQuery, profilesQuery } from "@/lib/scout-api";
import {
  getPlayerUid,
  formatValue,
  toNumber,
  percentile,
  type PlayerRow,
  type PositionProfile,
} from "@/lib/scout-types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

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
  const data = profile.metrics.slice(0, 6).map((metric) => {
    const val = toNumber(player.data[metric.column]);
    return {
      subject: metric.label.length > 12 ? metric.label.slice(0, 12) + "..." : metric.label,
      value: val ?? 50,
      fullMark: 100,
    };
  });
  return data;
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

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId) {
      return (players.data ?? []).find((p) => p.id === selectedPlayerId);
    }
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
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[#6B7280]">
            SCOUTING / TEMPORADA 2025–26
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Visão geral</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Acompanhe jogadores, avaliações e prioridades do departamento
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Base atualizada há 5 min
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#1F2127] bg-[#0F1015] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">Jogadores analisados</span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{totalPlayers}</span>
            <span className="mb-0.5 text-xs text-emerald-400">+12%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <div className="flex -space-x-2">
              <div className="h-6 w-6 rounded-md bg-blue-500/20" />
              <div className="h-6 w-6 rounded-md bg-violet-500/20" />
              <div className="h-6 w-6 rounded-md bg-emerald-500/20" />
            </div>
            <span>+{Math.min(totalPlayers, 23)} este mês</span>
          </div>
        </Card>

        <Card className="border-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">Em observação</span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">{monitorCount}</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-[#3458D4]" style={{ width: "65%" }} />
            </div>
            <span className="text-xs text-[#6B7280]">Meta mensal: 40</span>
          </div>
        </Card>

        <Card className="border-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">Na shortlist</span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">{priorityCount}</span>
            <span className="mb-0.5 text-xs text-[#6B7280]">{priorityCount} alta prioridade</span>
          </div>
          <div className="flex -space-x-2">
            <div className="h-6 w-6 rounded-md bg-orange-100" />
            <div className="h-6 w-6 rounded-md bg-red-100" />
          </div>
        </Card>

        <Card className="border-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">Nota média</span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">{averageRating}</span>
            <span className="mb-0.5 text-xs text-emerald-600">+0.2</span>
          </div>
          <div className="flex h-8 items-end gap-0.5">
            {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
              <div key={i} className="w-1.5 rounded-sm bg-[#3458D4]/40" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Jogadores em destaque</h2>
              <Link to="/jogadores" className="text-xs text-[#3458D4] hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="flex items-center gap-3 border-b border-border px-5 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                <Input
                  placeholder="Buscar por jogador ou clube"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 rounded-md bg-gray-50 p-1">
                <Button
                  size="sm"
                  variant={activeFilter === "all" ? "default" : "ghost"}
                  className={`h-6 px-2.5 text-xs ${activeFilter === "all" ? "bg-white shadow-sm" : ""}`}
                  onClick={() => setActiveFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === "priority" ? "default" : "ghost"}
                  className={`h-6 px-2.5 text-xs ${activeFilter === "priority" ? "bg-white shadow-sm" : ""}`}
                  onClick={() => setActiveFilter("priority")}
                >
                  Prioridade
                </Button>
                <Button
                  size="sm"
                  variant={activeFilter === "monitor" ? "default" : "ghost"}
                  className={`h-6 px-2.5 text-xs ${activeFilter === "monitor" ? "bg-white shadow-sm" : ""}`}
                  onClick={() => setActiveFilter("monitor")}
                >
                  Monitorar
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border">
              {playerList.map((p) => {
                const profile = (profiles.data ?? []).find((pr) => pr.player_type === p.player_type);
                const ratingCol = profile?.id_map?.rating;
                const rating = ratingCol ? toNumber(p.data[ratingCol]) : null;
                const isSelected = selectedPlayer?.id === p.id;
                const status = (p.data as any)?.status;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-l-2 border-[#3458D4] bg-blue-50/50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-medium ${getAvatarColor(p.name)}`}>
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <span className="text-xs text-[#6B7280]">{p.player_type}</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">{p.club || "Sem clube"}</p>
                    </div>
                    <div className="w-12 text-center text-sm text-foreground">{p.age ?? "—"}</div>
                    <div className="w-12 text-center text-sm font-medium text-[#3458D4]">
                      {rating !== null ? rating.toFixed(1) : "—"}
                    </div>
                    <div className="w-20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground">78</span>
                        <div className="h-1 flex-1 rounded-full bg-gray-100">
                          <div className="h-1 rounded-full bg-[#3458D4]" style={{ width: "78%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="w-24">{getStatusBadge(status)}</div>
                    <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-md text-sm font-medium ${getAvatarColor(selectedPlayer?.name || "")}`}>
                    {selectedPlayer ? getInitials(selectedPlayer.name) : "—"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedPlayer?.name || "—"}</h3>
                    <p className="text-sm text-[#6B7280]">
                      {selectedPlayer?.club || "Sem clube"} · {selectedPlayer?.player_type}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="border-b border-border px-5">
              <div className="flex gap-6">
                <button className="border-b-2 border-[#3458D4] pb-2 text-sm font-medium text-foreground">
                  Visão geral
                </button>
                <button className="pb-2 text-sm text-[#6B7280]">Métricas</button>
                <button className="pb-2 text-sm text-[#6B7280]">Histórico</button>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-5 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Jogador" dataKey="value" stroke="#3458D4" fill="#3458D4" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-[#6B7280]">Nota geral</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">7.8</p>
                  <p className="text-xs text-[#3458D4]">Top 15%</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-[#6B7280]">Potencial</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">8.4</p>
                  <p className="text-xs text-emerald-600">Acima da média</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-[#6B7280]">Idade</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{selectedPlayer?.age ?? "—"}</p>
                  <p className="text-xs text-[#6B7280]">—</p>
                </div>
              </div>
              <div className="mb-4 rounded-lg border-l-2 border-orange-400 bg-orange-50/50 p-3">
                <p className="text-xs font-medium text-orange-900">Nota de observação</p>
                <p className="mt-1 text-xs text-orange-800">
                  Bom posicionamento defensivo. Necessita evoluir na saída de bola sob pressão.
                </p>
              </div>
              <Button asChild className="w-full bg-[#3458D4] hover:bg-[#2A4BC4]">
                <Link to="/jogador/$id" params={{ id: selectedPlayer?.id || "" }}>
                  Abrir perfil completo
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
