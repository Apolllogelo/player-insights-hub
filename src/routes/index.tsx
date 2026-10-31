import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Bookmark, ArrowUpRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { datasetsQuery, playersQuery, profilesQuery } from "@/lib/scout-api";
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

  const selectedRating = useMemo(() => {
    if (!selectedPlayer) return null;
    const profile = (profiles.data ?? []).find((pr) => pr.player_type === selectedPlayer.player_type);
    const ratingCol = profile?.id_map?.rating;
    if (!ratingCol) return null;
    return toNumber(selectedPlayer.data[ratingCol]);
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
    <div className="p-[44px_36px_60px] max-w-[1500px] mx-auto">
      <section className="intro mb-[34px] flex items-flex-end justify-between">
        <div>
          <span className="eyebrow">SCOUTING / TEMPORADA 2025–26</span>
          <h1 className="text-[clamp(30px,3vw,45px)] font-semibold tracking-[-2px] leading-[1.09] mb-0">Visão geral</h1>
          <p className="mt-[13px] text-[13px] text-[#818984]">Acompanhe jogadores, avaliações e prioridades do departamento</p>
        </div>
        <div className="updated flex items-center text-[9px] font-mono font-bold text-[#939b96] gap-[8px] mb-[5px] letter-spacing-[0.8px]">
          <span className="live-dot inline-block h-[10px] w-[10px] rounded-full bg-[#80a946] border-[3px] border-[#e0e9d4]" />
          BASE ATUALIZADA HÁ 12 MIN
        </div>
      </section>

      <div className="stats-grid grid gap-[12px] grid-cols-[repeat(4,1fr)] mb-[16px]">
        <article className="stat-card stat-featured bg-[#dfff88] border-[#d7f67e] border p-[18px_19px_15px] min-h-[142px] overflow-hidden flex flex-col">
          <div className="stat-top flex items-center justify-between text-[#536238] text-[11px] font-medium">
            <span>Jogadores analisados</span>
            <span className="trend-positive inline-block bg-[#edf5dc] rounded-[12px] text-[#5d7936] text-[9px] font-bold px-[7px] py-[4px]">↗ 12%</span>
          </div>
          <div className="mt-[17px] mb-auto">
            <strong className="font-mono text-[31px] leading-1 tracking-[-1.5px] block">{totalPlayers}</strong>
          </div>
          <div className="stat-foot flex items-center justify-between text-[#5f6c46] text-[9px]">
            <div className="avatar-stack flex">
              <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2c3d34] border-[2px] border-[#dfff88] text-white text-[7px]">BA</span>
              <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2c3d34] border-[2px] border-[#dfff88] text-white text-[7px] -ml-[5px]">IS</span>
              <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-[#2c3d34] border-[2px] border-[#dfff88] text-white text-[7px] -ml-[5px]">JM</span>
            </div>
            <span>+{Math.min(totalPlayers, 23)} este mês</span>
          </div>
        </article>

        <article className="stat-card bg-[#fff] border-[#dcdedb] border p-[18px_19px_15px] min-h-[142px] overflow-hidden flex flex-col">
          <div className="stat-top flex items-center justify-between text-[#67716b] text-[11px] font-medium">
            <span>Em observação</span>
            <span className="metric-icon inline-block text-[#9aa29e]">{search}</span>
          </div>
          <div className="mt-[17px] mb-auto">
            <strong className="font-mono text-[31px] leading-1 tracking-[-1.5px] block">{monitorCount}</strong>
          </div>
          <div className="progress h-[4px] rounded-none bg-[#edf0ec] mt-auto mb-[9px] overflow-hidden w-full">
            <i className="h-full rounded-none bg-[#73974c] block" style={{ width: "64%" }} />
          </div>
          <div className="stat-foot flex items-center justify-between text-[#8b938e] text-[9px]">
            <span>64% da meta mensal</span>
            <b className="text-[#636c67]">50</b>
          </div>
        </article>

        <article className="stat-card bg-[#fff] border-[#dcdedb] border p-[18px_19px_15px] min-h-[142px] overflow-hidden flex flex-col">
          <div className="stat-top flex items-center justify-between text-[#67716b] text-[11px] font-medium">
            <span>Na shortlist</span>
            <span className="metric-icon inline-block text-[#9aa29e]"><Bookmark /></span>
          </div>
          <div className="mt-[17px] mb-auto">
            <strong className="font-mono text-[31px] leading-1 tracking[-1.5px] block">{priorityCount}</strong>
          </div>
          <div className="stat-foot flex items-center gap-[-2px] text-[#8b938e] text-[9px]">
            <span>4 com alta prioridade</span>
            <div className="mini-avatars flex">
              <i className="h-[19px] w-[19px] rounded-full bg-[#bdc7c0] border-[2px] border-[#fff] -ml-[5px]" />
              <i className="h-[19px] w-[19px] rounded-full bg-[#8d9b91] border-[2px] border-[#fff] -ml-[5px]" />
              <i className="h-[19px] w-[19px] rounded-full bg-[#c4ab8c] border-[2px] border-[#fff] -ml-[5px]" />
            </div>
          </div>
        </article>

        <article className="stat-card bg-[#fff] border-[#dcdedb] border p-[18px_19px_15px] min-h-[142px] overflow-hidden flex flex-col">
          <div className="stat-top flex items-center justify-between text-[#67716b] text-[11px] font-medium">
            <span>Nota média</span>
            <span className="trend-positive inline-block bg-transparent rounded-none text-[#4b8c60] font-mono px-0 py-0">↗ 0,4</span>
          </div>
          <div className="mt-[17px] mb-auto">
            <strong className="font-mono text-[31px] leading-1 tracking[-1.5px] block">{averageRating}</strong>
          </div>
          <div className="flex h-[32px] items-end gap-[0.5px] mt-auto">
            {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
              <div key={i} className="w-[1.5px] rounded-sm bg-[#3458D4]/40" style={{ height: `${h}%` }} />
            ))}
          </div>
        </article>
      </div>

      <div className="dashboard-grid grid gap-[16px] grid-cols-[minmax(0,1.65fr)_minmax(330px,0.75fr)]">
        <div className="lg:col-span-7">
          <section className="players-panel overflow-hidden p-[21px_0_0]">
            <div className="panel-heading flex items-center justify-between px-[22px] mb-[22px]">
              <div>
                <span className="eyebrow block mb-[4px] text-[9px] font-mono font-bold text-[#89918d] tracking-[1.25px]">LISTA DE TRABALHO</span>
                <h2 className="text-[18px] font-mono font-bold tracking[-0.6px]">Jogadores em destaque</h2>
              </div>
              <Link to="/jogadores" className="text-button flex items-center gap-[6px] rounded-none bg-transparent border-0 text-[#66716b] text-[10px] hover:bg-transparent">
                Ver todos
                <span className="flex h-4 w-4">{/* chevron */}</span>
              </Link>
            </div>
            <div className="filters flex gap-[15px] mb-[12px] mt-[22px]">
              <div className="search-field relative flex-1 bg-[#f7f8f5] border border-[#e6e9e4] rounded-none flex items-center gap-[8px] px-[10px] py-[8px] text-[#a1a8a4] max-w-[270px]">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Buscar jogador ou clube"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-0 text-[#354039] text-[11px] outline-none w-full min-w-0"
                />
              </div>
              <div className="filter-pills flex gap-[5px]">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`pill rounded-none border border-[#e4e7e3] text-[#858e89] text-[9px] px-[10px] py-[7px] transition-colors ${activeFilter === "all" ? "bg-[#25322c] border-[#25322c] text-[#fff]" : ""}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveFilter("priority")}
                  className={`pill rounded-none border border-[#e4e7e3] text-[#858e89] text-[9px] px-[10px] py-[7px] transition-colors ${activeFilter === "priority" ? "bg-[#25322c] border-[#25322c] text-[#fff]" : ""}`}
                >
                  Prioridade
                </button>
                <button
                  onClick={() => setActiveFilter("monitor")}
                  className={`pill rounded-none border border-[#e4e7e3] text-[#858e89] text-[9px] px-[10px] py-[7px] transition-colors ${activeFilter === "monitor" ? "bg-[#25322c] border-[#25322c] text-[#fff]" : ""}`}
                >
                  Monitorar
                </button>
              </div>
            </div>
            <div className="table-wrap overflow-x-auto">
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left">JOGADOR</th>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left">IDADE</th>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left">NOTA</th>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left">POTENCIAL</th>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left">STATUS</th>
                    <th className="bg-[#fafbf9] border-b border-[#eceeeb] border-t border-[#eceeeb] text-[#9aa19d] font-mono text-[8px] font-bold tracking-[0.6px] px-[12px] py-[10px] text-left"></th>
                  </tr>
                </thead>
                <tbody>
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
                        className={`flex w-full items-center gap-[11px] px-[14px] py-[13px] text-left transition-colors min-w-[170px] ${
                          isSelected
                            ? "bg-[#fbfcf8] border-l-[3px] border-[#a9d34c]"
                            : "hover:bg-[#fbfcf8]"
                        }`}
                      >
                        <td>
                          <div className="player-cell flex items-center gap-[11px] min-w-[170px]">
                            <div className={`flex h-[35px] w-[35px] items-center justify-center rounded-[9px] text-[10px] font-bold ${getAvatarColor(p.name)}`}>
                              {getInitials(p.name)}
                            </div>
                            <div className="flex flex-col">
                              <p className="truncate text-sm font-medium text-[#28332d]">{p.name}</p>
                              <p className="mt-[3px] text-[9px] text-[#969e99]">{p.club || "Sem clube"} · {p.player_type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-[#eef0ed] text-[#56615b] text-[11px] px-[12px]">{p.age ?? "—"}</td>
                        <td className="border-b border-[#eef0ed] text-[#38473f] font-semibold text-[11px] px-[12px]">{rating !== null ? rating.toFixed(1) : "—"}</td>
                        <td className="border-b border-[#eef0ed] px-[12px]">
                          <div className="potential flex items-center gap-[8px]">
                            <i className="h-[4px] rounded-none bg-[#edf0ec] overflow-hidden w-[58px] block" />
                            <b className="h-[4px] rounded-none bg-[#94bd54] overflow-hidden w-full block" style={{ width: `${rating !== null ? rating * 10 : 50}%` }} />
                            <span className="text-[#657069] text-[9px] font-semibold">{rating !== null ? Math.round(rating * 10) : 50}</span>
                          </div>
                        </td>
                        <td className="border-b border-[#eef0ed] px-[12px]">{getStatusBadge(status)}</td>
                        <td className="border-b border-[#eef0ed] px-[12px]">
                          <button className="row-arrow bg-transparent border-0 text-[#adb4b0] p-[4px]">
                            <span className="h-4 w-4">›</span>
                          </button>
                        </td>
                      </button>
                    );
                  })}
                  {filteredPlayersEmpty && (
                    <tr>
                      <td colSpan={6} className="border-b border-[#eef0ed] px-[12px] py-[40px] text-center text-[#8b948e] text-[12px]">
                        Nenhum jogador encontrado com esses filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="profile-panel p-[21px_21px_18px]">
          <div className="profile-header flex items-center justify-between">
            <span className="eyebrow mb-0 text-[9px] font-mono font-bold text-[#89918d] tracking-[1.25px]">RELATÓRIO DO JOGADOR</span>
            <button className="bg-transparent border-0 text-[#adb4b0] p-[4px]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="profile-identity flex items-center gap-[12px] mt-[18px] mb-[17px]">
            <div className={`avatar avatar-large rounded-[12px] h-[54px] w-[54px] text-[15px] flex items-center justify-center font-bold ${getAvatarColor(selectedPlayer?.name || "")}`}>
              {selectedPlayer ? getInitials(selectedPlayer.name) : "—"}
            </div>
            <div className="flex-1">
              <h2 className="text-[16px]">{selectedPlayer?.name || "—"}</h2>
              <p className="mt-[4px] text-[10px] text-[#89928d]">{selectedPlayer?.club || "Sem clube"} · {selectedPlayer?.player_type}</p>
            </div>
            <button className="bookmark-button flex items-center justify-center h-[33px] w-[33px] rounded-none bg-[#f5f7f3] border border-[#e5e8e3] text-[#829078]">
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
          <div className="profile-tabs flex gap-[23px] border-b border-[#e8ebe7]">
            {["Visão geral", "Métricas", "Histórico"].map((item) => (
              <button
                key={item}
                className={`rounded-none bg-transparent border-0 text-[#a0a7a3] text-[9px] pb-[10px] relative transition-colors ${item === "Visão geral" ? "text-[#36433c] font-bold" : ""}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="radar-wrap flex justify-center pt-[12px] pb-[2px]">
            <RadarChartSvg values={radarData.length ? radarData.map((d) => d.value) : [78, 82, 73, 84, 66, 78]} />
          </div>

          <div className="profile-numbers grid grid-cols-[repeat(3,1fr)] border-t border-[#e8ebe7] border-b border-[#e8ebe7] mt-0 p-[13px_0]">
            <div className="flex flex-col pl-[13px] border-l border-[#e9ebe8]">
              <span className="font-mono text-[7px] font-bold tracking-[0.5px] text-[#a0a8a3]">NOTA GERAL</span>
              <strong className="font-mono text-[17px] mt-[4px] mb-[1px]">{selectedRating !== null ? selectedRating.toFixed(1) : "—"}</strong>
              <small className="text-[#85908a] text-[7px]">Top 18%</small>
            </div>
            <div className="flex flex-col pl-[13px] border-l border-[#e9ebe8]">
              <span className="font-mono text-[7px] font-bold tracking-[0.5px] text-[#a0a8a3]">POTENCIAL</span>
              <strong className="font-mono text-[17px] mt-[4px] mb-[1px]">84</strong>
              <small className="text-[#85908a] text-[7px]">Acima da média</small>
            </div>
            <div className="flex flex-col pl-[13px] border-l border-[#e9ebe8]">
              <span className="font-mono text-[7px] font-bold tracking-[0.5px] text-[#a0a8a3]">IDADE</span>
              <strong className="font-mono text-[17px] mt-[4px] mb-[1px]">{selectedPlayer?.age ?? "—"}</strong>
              <small className="text-[#85908a] text-[7px]">{selectedPlayer?.age ? selectedPlayer.age + " cm" : "—"}</small>
            </div>
          </div>

          <div className="insight-card mt-[15px] rounded-[9px] bg-[#f4f7e9] border border-[#e5ebd1] p-[12px] flex gap-[10px]">
            <span className="spark-icon text-[#72933c] flex-none"><Search /></span>
            <div>
              <strong className="text-[#52613e] block text-[9px] mb-[3px]">Nota de observação</strong>
              <p className="text-[#818a78] text-[8px] leading-[1.5] m-0">Bom posicionamento defensivo. Necessita evoluir na saída de bola sob pressão.</p>
            </div>
          </div>

          <Button asChild className="w-full mt-[13px] rounded-none bg-[#25322c] border-0 text-white text-[10px] font-bold py-[10px] justify-center flex items-center gap-[6px]">
            <Link to="/jogador/$id" params={{ id: selectedPlayer?.id || "" }}>
              Abrir perfil completo
              <ArrowUpRight className="h-4 w-4 text-[#6c8cff]" />
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

const filteredPlayersEmpty = false;
