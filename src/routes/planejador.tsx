import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Loader2,
  Upload,
  Save,
  GripVertical,
  Check,
  Trash2,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseSpreadsheet, type ParsedWorkbook } from "@/lib/spreadsheet";
import { toNumber, formatValue } from "@/lib/scout-types";
import { PlayerFace } from "@/components/player-face";
import { loadPlanejadorData } from "@/lib/planilha.server";

export const Route = createFileRoute("/planejador")({
  head: () => ({
    meta: [
      { title: "Scoutboard — Planejador" },
      {
        name: "description",
        content:
          "Aba de planejamento do elenco com elenco atual, promessas e contratações do Football Manager 26.",
      },
      { property: "og:title", content: "Planejador — Scout Board" },
      {
        property: "og:description",
        content:
          "Visualize e edite a planilha de Planejamento de Elenco com elenco atual, promessas e contratações futuras.",
      },
    ],
  }),
  component: PlanejadorPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl px-4 py-16 text-sm text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Nada por aqui.</div>,
});

type PlayerStatus =
  "" | "Intocável" | "Jovem Promessa" | "Pensar em vender" | "Emprestar" | "Dispensar";

type SquadPlayer = {
  position: string;
  name: string;
  uid: string;
  salary: number | null;
  nationality: string;
  rating: number | null;
  number: string | number;
  status: PlayerStatus;
};

type ReservePlayer = {
  position: string;
  name: string;
  uid: string;
  salary: number | null;
  nationality: string;
  number: string | number;
  status: PlayerStatus;
};

type PromisePlayer = {
  position: string;
  name: string;
  uid: string;
  salary: number | null;
  nationality: string;
  rating: number | null;
  status: PlayerStatus;
};

type ForSalePlayer = {
  name: string;
  salary: number | null;
  reason: string;
};

type LoanPlayer = {
  name: string;
  salary: number | null;
  usageValue: number | null;
  duration: string | number;
  cost: number | null;
};

type OutgoingPlayer = {
  name: string;
  salary: number | null;
};

type RowMatrix = unknown[][];

function rowsToMatrix(rows: unknown[]): RowMatrix {
  if (rows.length > 0 && Array.isArray(rows[0])) {
    return rows as RowMatrix;
  }
  return rows as unknown as RowMatrix;
}

function formatBrlCurrency(value: number | null): string {
  if (value === null) return "—";
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatEurCurrency(value: number | null): string {
  if (value === null) return "—";
  return `€ ${value.toLocaleString("pt-BR")}`;
}

const STATUS_OPTIONS: { value: PlayerStatus; label: string; color: string }[] = [
  { value: "Intocável", label: "Intocável", color: "text-emerald-500" },
  { value: "Jovem Promessa", label: "Jovem Promessa", color: "text-blue-500" },
  { value: "Pensar em vender", label: "Pensar em vender", color: "text-amber-500" },
  { value: "Emprestar", label: "Emprestar", color: "text-purple-500" },
  { value: "Dispensar", label: "Dispensar", color: "text-destructive" },
];

function StatusSelect({
  value,
  onChange,
}: {
  value: PlayerStatus;
  onChange: (value: PlayerStatus) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-[160px] text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              <Check className={`h-3.5 w-3.5 ${opt.color}`} /> {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DragHandle() {
  return (
    <Button variant="ghost" size="icon" className="h-5 w-5 cursor-grab">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

function PlanejadorPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["planejador"],
    queryFn: async () => {
      const result = await loadPlanejadorData();
      if (!result.ok) {
        throw new Error(result.reason);
      }
      return result;
    },
  });

  const elencoSheet = data?.elenco ?? null;

  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeTab, setActiveTab] = useState<"default" | "uploaded">("default");
  const [prioritiesLocal, setPrioritiesLocal] = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveRows: RowMatrix = useMemo(() => {
    if (activeTab === "uploaded" && workbook) {
      const sheet = workbook.sheets.find((s) => s.name === "Elenco");
      if (sheet) return rowsToMatrix(sheet.rows as unknown[]);
    }
    if (elencoSheet) return rowsToMatrix(elencoSheet.rows);
    return [];
  }, [activeTab, workbook, elencoSheet]);

  const squadPlayers = useMemo((): SquadPlayer[] => {
    const players: SquadPlayer[] = [];
    for (let i = 2; i <= 12; i++) {
      const row = effectiveRows[i];
      if (!row || row.every((c) => (c ?? "").toString().trim() === "")) continue;
      players.push({
        position: String(row[0] ?? "").trim(),
        name: String(row[1] ?? "").trim(),
        uid: String(row[2] ?? "").trim(),
        salary: toNumber(row[3]) ?? null,
        nationality: String(row[4] ?? "").trim(),
        rating: toNumber(row[6]) ?? null,
        number: (row[8] ?? i - 1) as string | number,
        status: "",
      });
    }
    return players;
  }, [effectiveRows]);

  const forSalePlayers = useMemo((): ForSalePlayer[] => {
    const players: ForSalePlayer[] = [];
    for (let i = 2; i <= 12; i++) {
      const row = effectiveRows[i];
      if (!row) continue;
      const name = String(row[9] ?? "").trim();
      if (!name || name === "-") continue;
      players.push({
        name,
        salary: toNumber(row[10]) ?? null,
        reason: String(row[11] ?? "").trim(),
      });
    }
    return players;
  }, [effectiveRows]);

  const loanPlayers = useMemo((): LoanPlayer[] => {
    const players: LoanPlayer[] = [];
    for (let i = 2; i <= 12; i++) {
      const row = effectiveRows[i];
      if (!row) continue;
      const name = String(row[13] ?? "").trim();
      if (!name || name === "-") continue;
      const duration = (row[16] ?? "").toString().trim();
      if (!duration) continue;
      players.push({
        name,
        salary: toNumber(row[14]) ?? null,
        usageValue: toNumber(row[15]) ?? null,
        duration: (row[16] ?? "") as string | number,
        cost: toNumber(row[17]) ?? null,
      });
    }
    return players;
  }, [effectiveRows]);

  const outgoingPlayers = useMemo((): OutgoingPlayer[] => {
    const players: OutgoingPlayer[] = [];
    for (let i = 2; i <= 12; i++) {
      const row = effectiveRows[i];
      if (!row) continue;
      const name = String(row[19] ?? "").trim();
      if (!name || name === "-") continue;
      players.push({
        name,
        salary: toNumber(row[20]) ?? null,
      });
    }
    return players;
  }, [effectiveRows]);

  const reservePlayers = useMemo((): ReservePlayer[] => {
    const players: ReservePlayer[] = [];
    for (let i = 17; i <= 28; i++) {
      const row = effectiveRows[i];
      if (!row || row.every((c) => (c ?? "").toString().trim() === "")) continue;
      players.push({
        position: String(row[0] ?? "").trim(),
        name: String(row[1] ?? "").trim(),
        uid: String(row[2] ?? "").trim(),
        salary: toNumber(row[3]) ?? null,
        nationality: String(row[4] ?? "").trim(),
        number: (row[8] ?? i - 16) as string | number,
        status: "",
      });
    }
    return players;
  }, [effectiveRows]);

  const recruitmentPriorities = useMemo(() => {
    const priority: string[] = [];
    for (let i = 32; i <= 39; i++) {
      const row = effectiveRows[i];
      if (!row) continue;
      const val = String(row[0] ?? "").trim();
      if (val) priority.push(val);
    }
    return priority;
  }, [effectiveRows]);

  const [squadPlayersLocal, setSquadPlayersLocal] = useState<SquadPlayer[]>([]);
  const [forSaleLocal, setForSaleLocal] = useState<ForSalePlayer[]>([]);
  const [loanLocal, setLoanLocal] = useState<LoanPlayer[]>([]);
  const [outgoingLocal, setOutgoingLocal] = useState<OutgoingPlayer[]>([]);
  const [reservePlayersLocal, setReservePlayersLocal] = useState<ReservePlayer[]>([]);
  const [promisesLocal, setPromisesLocal] = useState<PromisePlayer[]>([]);

  const [newPromisingName, setNewPromisingName] = useState("");
  const [newPromisingUid, setNewPromisingUid] = useState("");
  const [newPromisingPosition, setNewPromisingPosition] = useState("");
  const [newPromisingSalary, setNewPromisingSalary] = useState("");
  const [newPromisingNationality, setNewPromisingNationality] = useState("");

  useMemo(() => {
    setSquadPlayersLocal(squadPlayers);
    setForSaleLocal(forSalePlayers);
    setLoanLocal(loanPlayers);
    setOutgoingLocal(outgoingPlayers);
    setReservePlayersLocal(reservePlayers);
    setPrioritiesLocal(recruitmentPriorities);
  }, [
    squadPlayers,
    forSalePlayers,
    loanPlayers,
    outgoingPlayers,
    reservePlayers,
    recruitmentPriorities,
  ]);

  async function handleFile(file: File) {
    try {
      const parsed = await parseSpreadsheet(file);
      if (!parsed.sheets.length) {
        toast.error("Não encontrei colunas nessa planilha.");
        return;
      }
      const hasElenco = parsed.sheets.some((s) => s.name.toLowerCase().includes("elenco"));
      if (!hasElenco) {
        toast.error("Planilha não contém a aba 'Elenco'.");
        return;
      }
      setWorkbook(parsed);
      setActiveTab("uploaded");
      toast.success(`${parsed.sheets.length} aba(s) lidas.`);
    } catch {
      toast.error("Não consegui ler o arquivo. Use CSV ou Excel (.xlsx).");
    }
  }

  function addPromisingPlayer() {
    if (!newPromisingName.trim() || !newPromisingUid.trim()) {
      toast.error("Nome e UID são obrigatórios.");
      return;
    }
    const newPlayer: PromisePlayer = {
      position: newPromisingPosition.trim(),
      name: newPromisingName.trim(),
      uid: newPromisingUid.trim(),
      salary: toNumber(newPromisingSalary) ?? null,
      nationality: newPromisingNationality.trim(),
      rating: null,
      status: "",
    };
    setPromisesLocal((prev) => [...prev, newPlayer]);
    setNewPromisingName("");
    setNewPromisingUid("");
    setNewPromisingPosition("");
    setNewPromisingSalary("");
    setNewPromisingNationality("");
    toast.success("Promessa adicionada.");
  }

  function deletePromisingPlayer(idx: number) {
    setPromisesLocal((prev) => prev.filter((_, i) => i !== idx));
    toast.success("Promessa removida.");
  }

  function updatePromise(idx: number, patch: Partial<PromisePlayer>) {
    setPromisesLocal((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch } as PromisePlayer;
      return next;
    });
  }

  function savePriority(idx: number) {
    setPrioritiesLocal((prev) => {
      const next = [...prev];
      next[idx] = prev[idx]?.trim() ?? "";
      return next;
    });
    toast.success("Prioridade atualizada.");
  }

  function updatePriority(idx: number, value: string) {
    setPrioritiesLocal((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function addPriority() {
    setPrioritiesLocal((prev) => [...prev, ""]);
  }

  function deletePriority(idx: number) {
    setPrioritiesLocal((prev) => prev.filter((_, i) => i !== idx));
    toast.success("Prioridade removida.");
  }

  function handleSaveAll() {
    toast.success("Dados do planejador salvos localmente. (Persistência no servidor em breve)");
  }

  function handleReload() {
    refetch();
    toast.success("Dados recarregados da planilha.");
  }

  function handleStatusChange(
    idx: number,
    setter:
      | React.Dispatch<React.SetStateAction<SquadPlayer[]>>
      | React.Dispatch<React.SetStateAction<ReservePlayer[]>>
      | React.Dispatch<React.SetStateAction<PromisePlayer[]>>,
    value: PlayerStatus,
  ) {
    (
      setter as React.Dispatch<
        React.SetStateAction<SquadPlayer[] | ReservePlayer[] | PromisePlayer[]>
      >
    )((prev) => {
      const next = [...(prev as SquadPlayer[] | ReservePlayer[] | PromisePlayer[])];
      (next[idx] as SquadPlayer | ReservePlayer | PromisePlayer).status = value;
      return next as SquadPlayer[] | ReservePlayer[] | PromisePlayer[];
    });
  }

  function onDragStart(
    e: React.DragEvent<HTMLTableRowElement>,
    idx: number,
    setter:
      | React.Dispatch<React.SetStateAction<SquadPlayer[]>>
      | React.Dispatch<React.SetStateAction<ReservePlayer[]>>,
  ) {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(
    e: React.DragEvent<HTMLTableRowElement>,
    dropIdx: number,
    setter:
      | React.Dispatch<React.SetStateAction<SquadPlayer[]>>
      | React.Dispatch<React.SetStateAction<ReservePlayer[]>>,
  ) {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData("text/plain");
    if (!fromStr) return;
    const fromIdx = Number(fromStr);
    if (fromIdx === dropIdx) return;
    (setter as React.Dispatch<React.SetStateAction<SquadPlayer[] | ReservePlayer[]>>)((prev) => {
      const next = [...(prev as SquadPlayer[] | ReservePlayer[])];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(dropIdx, 0, moved as SquadPlayer | ReservePlayer);
      return next as SquadPlayer[] | ReservePlayer[];
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              Planejador de Elenco
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {activeTab === "default"
                ? "Dados carregados da planilha salva na sua pasta do OneDrive."
                : "Dados carregados da planilha enviada abaixo."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="text-xs"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Importar planilha
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void refetch()} className="text-xs">
              <Loader2 className="mr-1.5 h-3.5 w-3.5" />
              Recarregar
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveAll} className="text-xs">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Salvar alterações
            </Button>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando planejador…
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 py-8 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar a planilha: {error instanceof Error ? error.message : String(error)}</span>
        </div>
      )}

      {!isLoading && !isError && (
        <Accordion
          type="multiple"
          defaultValue={["squad", "reserve", "promises", "sale", "loan", "outgoing", "priorities"]}
          className="space-y-4"
        >
          {/* Elenco Titular */}
          <AccordionItem value="squad" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Elenco Titular
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4">
                <Card className="border-border/70 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Nacionalidade</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {squadPlayersLocal.map((p, idx) => (
                        <TableRow
                          key={idx}
                          draggable
                          onDragStart={(e) => onDragStart(e, idx, setSquadPlayersLocal)}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, idx, setSquadPlayersLocal)}
                        >
                          <TableCell>
                            <DragHandle />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PlayerFace uid={p.uid || undefined} size="xs" />
                              {p.name || "—"}
                            </div>
                          </TableCell>
                          <TableCell>{p.number ?? "—"}</TableCell>
                          <TableCell>{p.position || "—"}</TableCell>
                          <TableCell>
                            <StatusSelect
                              value={p.status}
                              onChange={(value) =>
                                handleStatusChange(idx, setSquadPlayersLocal, value)
                              }
                            />
                          </TableCell>
                          <TableCell>{formatBrlCurrency(p.salary)}</TableCell>
                          <TableCell>
                            {p.nationality ? (
                              <Badge variant="secondary" className="text-xs">
                                {p.nationality}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {p.rating != null ? (
                              <span className="text-xs font-medium">{formatValue(p.rating)}</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Elenco Reserva */}
          <AccordionItem value="reserve" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Elenco Reserva
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4">
                <Card className="border-border/70 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Jogador</TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Nacionalidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservePlayersLocal.map((p, idx) => (
                        <TableRow
                          key={idx}
                          draggable
                          onDragStart={(e) => onDragStart(e, idx, setReservePlayersLocal)}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, idx, setReservePlayersLocal)}
                        >
                          <TableCell>
                            <DragHandle />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PlayerFace uid={p.uid || undefined} size="xs" />
                              {p.name || "—"}
                            </div>
                          </TableCell>
                          <TableCell>{p.number ?? "—"}</TableCell>
                          <TableCell>{p.position || "—"}</TableCell>
                          <TableCell>
                            <StatusSelect
                              value={p.status}
                              onChange={(value) =>
                                handleStatusChange(idx, setReservePlayersLocal, value)
                              }
                            />
                          </TableCell>
                          <TableCell>{formatBrlCurrency(p.salary)}</TableCell>
                          <TableCell>
                            {p.nationality ? (
                              <Badge variant="secondary" className="text-xs">
                                {p.nationality}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Promessas */}
          <AccordionItem value="promises" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Promessas
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <Input
                    placeholder="Nome"
                    value={newPromisingName}
                    onChange={(e) => setNewPromisingName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="UID"
                    value={newPromisingUid}
                    onChange={(e) => setNewPromisingUid(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Posição"
                    value={newPromisingPosition}
                    onChange={(e) => setNewPromisingPosition(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Salário"
                    value={newPromisingSalary}
                    onChange={(e) => setNewPromisingSalary(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Nacionalidade"
                    value={newPromisingNationality}
                    onChange={(e) => setNewPromisingNationality(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-end">
                    <Button size="sm" onClick={addPromisingPlayer} className="w-full text-xs">
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {promisesLocal.length > 0 ? (
                  <Card className="border-border/70 bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead>Jogador</TableHead>
                          <TableHead>UID</TableHead>
                          <TableHead>Posição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Salário</TableHead>
                          <TableHead>Nacionalidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {promisesLocal.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => deletePromisingPlayer(idx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PlayerFace uid={p.uid || undefined} size="xs" />
                                {p.name || "—"}
                              </div>
                            </TableCell>
                            <TableCell>{p.uid || "—"}</TableCell>
                            <TableCell>
                              <Input
                                value={p.position}
                                onChange={(e) => updatePromise(idx, { position: e.target.value })}
                                className="h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <StatusSelect
                                value={p.status}
                                onChange={(value) =>
                                  handleStatusChange(idx, setPromisesLocal, value)
                                }
                              />
                            </TableCell>
                            <TableCell>{formatBrlCurrency(p.salary)}</TableCell>
                            <TableCell>
                              <Input
                                value={p.nationality}
                                onChange={(e) =>
                                  updatePromise(idx, { nationality: e.target.value })
                                }
                                className="h-7 text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Adicione jogadores promissores usando o formulário acima.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Jogadores a Vender / Dispensar */}
          <AccordionItem value="sale" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Jogadores a Vender / Dispensar
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4">
                <Card className="border-border/70 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Salário (€)</TableHead>
                        <TableHead>Motivo / Valor de venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forSaleLocal.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{formatEurCurrency(p.salary)}</TableCell>
                          <TableCell>{p.reason && p.reason !== "-" ? p.reason : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Jogadores em Empréstimo */}
          <AccordionItem value="loan" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Jogadores em Empréstimo
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4">
                <Card className="border-border/70 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Salário (€)</TableHead>
                        <TableHead>Valor de Uso</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Custo (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanLocal.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{formatEurCurrency(p.salary)}</TableCell>
                          <TableCell>{formatEurCurrency(p.usageValue)}</TableCell>
                          <TableCell>{p.duration || "—"}</TableCell>
                          <TableCell>{formatEurCurrency(p.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Saídas para a próxima temporada */}
          <AccordionItem value="outgoing" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Saídas para a próxima temporada
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4">
                <Card className="border-border/70 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Salário (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outgoingLocal.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{formatEurCurrency(p.salary)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Prioridades de Contratação */}
          <AccordionItem value="priorities" className="border-border/70">
            <AccordionTrigger className="px-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              Prioridades de Contratação
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 px-4 pb-4">
                {prioritiesLocal.map((prio, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {idx + 1}
                    </div>
                    <Input
                      value={prio}
                      onChange={(e) => updatePriority(idx, e.target.value)}
                      onBlur={() => savePriority(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePriority(idx);
                      }}
                      className="h-7 flex-1 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deletePriority(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPriority} className="text-xs">
                  + Adicionar
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Resumo */}
      {!isLoading && !isError && (
        <section className="mt-10 border-t border-border/70 pt-6">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Elenco titular: {squadPlayersLocal.length} jogadores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Elenco reserva: {reservePlayersLocal.length} jogadores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Promessas: {promisesLocal.length} jogadores</span>
            </div>
            {forSaleLocal.length > 0 && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>À venda: {forSaleLocal.length} jogadores</span>
              </div>
            )}
            {loanLocal.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Empréstimos: {loanLocal.length} jogadores</span>
              </div>
            )}
            {outgoingLocal.length > 0 && (
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Saídas: {outgoingLocal.length} jogadores</span>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
