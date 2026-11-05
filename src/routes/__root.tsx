import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Settings2,
  Bookmark,
  Database,
  User,
  Search,
  Upload,
  MoreHorizontal,
  RotateCcw,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetPlayers, importDataset } from "../lib/scout-api";
import { emptyIdMap, METRIC_SLOTS, type IdMap, type Metric } from "../lib/scout-types";
import * as XLSX from "xlsx";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar recarregar ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Scoutboard — Análise e Gestão de Jogadores" },
      {
        name: "description",
        content: "Plataforma de scouting e análise de jogadores para gestão esportiva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SidebarNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const router = useRouter();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<"file" | "mapping" | "confirm">("file");
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importPlayerType, setImportPlayerType] = useState("");
  const [importIdMap, setImportIdMap] = useState<IdMap>(emptyIdMap);
  const [importMetrics, setImportMetrics] = useState<Metric[]>([]);
  const [metricSearch, setMetricSearch] = useState("");
  const [usedColumns, setUsedColumns] = useState<Set<string>>(new Set());

  // Persistência: carregar mapeamento salvo por perfil de posição
  const [savedMapping, setSavedMapping] = useState<{ idMap: IdMap; metrics: Metric[] } | null>(null);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Visão geral", exact: true },
    { to: "/jogadores", icon: Users, label: "Jogadores", badge: "0" },
    { to: "/mapear", icon: Settings2, label: "Perfis de posição", badge: "0" },
    { to: "/shortlist", icon: Bookmark, label: "Shortlist", badge: "0" },
  ];

  const getBreadcrumb = () => {
    if (pathname === "/") return "Scoutboard / Visão geral";
    if (pathname.startsWith("/jogadores")) return "Scoutboard / Jogadores";
    if (pathname.startsWith("/mapear")) return "Scoutboard / Perfis de posição";
    if (pathname.startsWith("/shortlist")) return "Scoutboard / Shortlist";
    if (pathname.startsWith("/planejador")) return "Scoutboard / Planejador";
    return "Scoutboard / Visão geral";
  };

  // Helpers de normalização para auto-match
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const autoMapIdMap = (headers: string[]): IdMap => {
    const next: Partial<IdMap> = { ...emptyIdMap };
    const fields: Array<keyof IdMap & string> = [
      "name", "club", "position", "age", "foot", "nationality", "height", "salary", "rating", "fullGames", "uid",
    ];
    const aliases: Record<string, string[]> = {
      name: ["nome", "jogador", "player", "player_name"],
      club: ["clube", "club", "time"],
      position: ["posicao", "posição", "position"],
      age: ["idade", "age"],
      foot: ["pe", "pé", "foot"],
      nationality: ["nacionalidade", "nationality", "nation"],
      height: ["altura", "height"],
      salary: ["salario", "salário", "salary"],
      rating: ["nota", "nota_media", "rating"],
      fullGames: ["jogos_completos", "full_games", "jogos"],
      uid: ["uid", "foto"],
    };
    fields.forEach((field) => {
      const candidates = aliases[field] ?? [field];
      const match = headers.find((h) => candidates.includes(normalize(h)));
      if (match) next[field as keyof IdMap] = match;
    });
    return next as IdMap;
  };

  const autoMapMetrics = (headers: string[]): Metric[] => {
    const defaultsInvert = new Set(["falhas", "diferenca_defesas_esperadas", "diferença defesas esperadas"]);
    return headers.map((h) => ({
      column: h,
      label: h,
      invert: defaultsInvert.has(normalize(h)),
    }));
  };

  const loadSavedMapping = (playerType: string) => {
    try {
      const raw = localStorage.getItem(`scout_import_mapping_${playerType}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setImportIdMap(parsed.idMap ?? emptyIdMap);
        setImportMetrics(parsed.metrics ?? []);
        setSavedMapping({ idMap: parsed.idMap ?? emptyIdMap, metrics: parsed.metrics ?? [] });
      } else {
        setImportIdMap(emptyIdMap);
        setImportMetrics(Array.from({ length: METRIC_SLOTS }, () => ({ column: "", label: "", invert: false })));
        setSavedMapping(null);
      }
    } catch {
      setImportIdMap(emptyIdMap);
      setImportMetrics(Array.from({ length: METRIC_SLOTS }, () => ({ column: "", label: "", invert: false })));
      setSavedMapping(null);
    }
  };

  const saveMapping = () => {
    if (!importPlayerType) return;
    try {
      localStorage.setItem(
        `scout_import_mapping_${importPlayerType}`,
        JSON.stringify({ idMap: importIdMap, metrics: importMetrics }),
      );
    } catch {}
  };

  async function handleReset() {
    setResetting(true);
    try {
      await resetPlayers();
      toast.success("Planilha resetada com sucesso.");
      router.invalidate();
      setResetDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao resetar planilha.");
    } finally {
      setResetting(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      let headers: string[];
      let rows: Record<string, unknown>[];

      const ext = file.name.toLowerCase().split(".").pop();

      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length === 0) throw new Error("Arquivo vazio");

        headers = lines[0].split(",").map((h) => h.trim());
        rows = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] ?? "";
          });
          return obj;
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        if (!data || data.length === 0) throw new Error("Arquivo vazio");

        headers = data[0] as string[];
        rows = data.slice(1).map((row: any[]) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] ?? "";
          });
          return obj;
        });
      } else {
        throw new Error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }

      if (rows.length === 0) throw new Error("Nenhuma linha de dados encontrada");

      setImportColumns(headers);
      setImportRows(rows);
      setImportFileName(file.name.replace(/\.[^/.]+$/, ""));
      setImportPlayerType("");
      setImportIdMap(autoMapIdMap(headers));
      setImportMetrics(autoMapMetrics(headers));
      setUsedColumns(new Set());
      setImportStage("mapping");
      setImportDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ler a planilha.");
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmImport() {
    if (!importPlayerType) {
      toast.error("Selecione um perfil de posição antes de importar.");
      return;
    }
    if (!importIdMap.name) {
      toast.error("O campo 'Nome do jogador' é obrigatório.");
      return;
    }

    saveMapping();

    setImporting(true);
    try {
      await importDataset({
        name: importFileName,
        player_type: importPlayerType,
        columns: importColumns,
        rows: importRows,
        id_map: importIdMap,
        metrics: importMetrics.filter((m) => m.column),
      });

      toast.success(`Planilha "${importFileName}" importada com ${importRows.length} jogadores.`);
      setImportDialogOpen(false);
      setImportStage("file");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar planilha.");
    } finally {
      setImporting(false);
    }
  }

  function handleImportClick() {
    const input = document.getElementById("import-file-input") as HTMLInputElement | null;
    if (input) input.click();
  }

  async function handleCapture() {
    setCapturing(true);
    const toastId = toast.loading("Capturando tela...");
    try {
      const element = document.querySelector("main");
      if (!element) {
        toast.error("Não foi possível encontrar a área principal para captura.", { id: toastId });
        return;
      }

      await document.fonts.ready;

      const stripOklab = (doc: Document) => {
        const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const el = n as HTMLElement;
          for (const prop of Object.keys(el.style)) {
            if (
              String(el.style.getPropertyValue(prop)).includes("oklab") ||
              String(el.style.getPropertyValue(prop)).includes("oklch")
            ) {
              el.style.removeProperty(prop);
            }
          }
        }
        for (const sheet of Array.from(doc.styleSheets)) {
          try {
            const rules = Array.from((sheet as CSSStyleSheet).cssRules || []);
            for (const rule of rules) {
              const cssRule = rule as CSSStyleRule;
              if (cssRule.style) {
                const cssText = String(cssRule.style.cssText);
                if (cssText.includes("oklab") || cssText.includes("oklch")) {
                  cssRule.style.cssText = cssText
                    .replace(/oklab\([^)]*\)/g, "")
                    .replace(/oklch\([^)]*\)/g, "");
                }
              }
            }
          } catch {
            // cross-origin sheet: ignora
          }
        }
      };
      stripOklab(document);

      const { toPng } = await import("html-to-image");

      const dataUrl = await toPng(element as HTMLElement, {
        backgroundColor: "#F3F2EE",
        cacheBust: true,
        canvasHeight: element.scrollHeight * 2,
        canvasWidth: element.scrollWidth * 2,
        filter:
          (node) =>
            !(node instanceof HTMLElement && (node.classList?.contains("toaster") || node.getAttribute("role") === "status" || node.getAttribute("data-sonner-toaster") === "true")),
        height: element.scrollHeight,
        pixelRatio: 2,
        width: element.scrollWidth,
      });

      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      link.download = `scoutboard-${timestamp}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Screenshot salva com sucesso!", { id: toastId });
    } catch (e) {
      console.error("Falha ao salvar screenshot:", e);
      toast.error(
        e instanceof Error ? `Falha ao salvar screenshot: ${e.message}` : "Falha ao salvar screenshot.",
        { id: toastId },
      );
    } finally {
      setCapturing(false);
    }
  }

  // Componentes do modal de importação
  const ImportColumnSelect = ({
    value,
    onChange,
    columns,
    disabledColumns,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    columns: string[];
    disabledColumns: Set<string>;
    placeholder: string;
  }) => {
    const available = columns.filter((c) => !disabledColumns.has(c) || c === value);
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-input rounded-none bg-surface px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">{placeholder}</option>
        {available.map((c) => (
          <option key={c} value={c} disabled={disabledColumns.has(c) && c !== value}>
            {c}
          </option>
        ))}
      </select>
    );
  };

  const ID_FIELDS: Array<{ key: keyof IdMap; label: string; required?: boolean }> = [
    { key: "name", label: "Jogador", required: true },
    { key: "club", label: "Clube", required: true },
    { key: "position", label: "Posição", required: true },
    { key: "age", label: "Idade" },
    { key: "foot", label: "Pé preferido" },
    { key: "nationality", label: "Nacionalidade" },
    { key: "height", label: "Altura" },
    { key: "salary", label: "Salário" },
    { key: "rating", label: "Nota média" },
    { key: "fullGames", label: "Jogos completos" },
    { key: "uid", label: "UID (foto do jogador)" },
  ];

  const metricLabels: Record<string, string> = {
    "def_dif": "% Def Difíceis",
    "defesas_90": "Defesas / 90",
    "bolas_dificeis": "Bolas difíceis",
    "xg_defendidos_90": "xG defendidos / 90",
    "xgp": "Expected Goals Prevented",
    "indice_impacto": "Índice de impacto",
    "def_seguras": "% Def Seguras",
    "acerto_goleiro": "% Acerto do goleiro",
    "diferenca_defesas_esperadas": "Diferença defesas esperadas – feitas",
    "saidas_sucesso_90": "Saídas do gol com sucesso / 90",
    "acerto_saidas": "% Acerto nas saídas do gol",
    "passes_certos": "% Passes certos",
    "jogos_sem_sofrer_gol": "% jogos sem sofrer gol",
    "falhas": "Falhas",
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 flex h-screen flex-col bg-sidebar text-sidebar-foreground w-[230px] p-[24px_16px_18px]">
        <div className="flex items-center gap-[11px] font-sans text-[16px] font-semibold mb-[38px] mx-[8px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center bg-surface text-sidebar text-[11px] font-mono font-medium">
            SB
          </div>
          <span>Scoutboard</span>
        </div>

        <nav className="flex-1 space-y-[3px]">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-[13px] rounded-none border-l-[2px] border-transparent px-[12px] py-[11px] text-xs font-medium text-muted-foreground transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-white border-l-primary"
                    : "hover:bg-transparent hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[6px] bg-primary" />
                )}
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto flex h-[16px] w-[16px] items-center justify-center rounded-[12px] bg-sidebar-accent text-[10px] font-mono text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-[10px] border-t border-sidebar-border pt-[18px] px-[7px]">
          <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-medium text-sidebar-foreground">
            MA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">Marcos Almeida</p>
            <p className="text-[10px] text-muted-foreground">Head Scout</p>
          </div>
        </div>

        <input
          id="import-file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
          }}
        />

        <Dialog open={importDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setImportStage("file");
            setImportColumns([]);
            setImportRows([]);
            setImportFileName("");
            setImportPlayerType("");
            setImportIdMap(emptyIdMap);
            setImportMetrics(Array.from({ length: METRIC_SLOTS }, () => ({ column: "", label: "", invert: false })));
            setUsedColumns(new Set());
          }
          setImportDialogOpen(open);
        }}>
          <DialogContent className="p-0 max-w-[min(960px,calc(100vw-48px))] max-h-[calc(100vh-48px)] rounded-[4px] border border-[#E3E1DA] bg-[#F3F2EE] overflow-hidden flex flex-col min-w-0">
            {/* Cabeçalho fixo */}
            <div className="flex items-center justify-between border-b border-[#E3E1DA] px-[24px] py-[20px] bg-[#F3F2EE] shrink-0 min-w-0">
              <div className="min-w-0 flex flex-col gap-[2px]">
                <DialogTitle className="text-[18px] font-semibold text-[#15171a] leading-tight">
                  Mapear colunas · {importPlayerType}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-[#6F7379] font-sans leading-[1.4]">
                  Mapeie as colunas da planilha para os campos do sistema antes de importar.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-[8px] shrink-0 min-w-0">
                <span className="font-mono text-[11px] font-bold text-[#2F4BC0] shrink-0">
                  {importMetrics.filter((m) => m.column).length} de {METRIC_SLOTS} avaliações mapeadas
                </span>
                <button
                  onClick={() => setImportDialogOpen(false)}
                  className="flex h-[8px] w-[8px] items-center justify-center rounded-full border border-[#E3E1DA] text-[#6F7379] hover:bg-[#2A3530] hover:text-white shrink-0"
                  aria-label="Fechar"
                >
                  <span className="text-[10px]">✕</span>
                </button>
              </div>
            </div>

            {/* Corpo com rolagem */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 shrink-0">
              {/* Etapa 1: Escolher arquivo */}
              {importStage === "file" && (
                <div className="p-[24px] flex flex-col items-center justify-center min-h-[300px] min-w-0">
                  <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#E8ECFA] text-[#2F4BC0] text-[24px] shrink-0 mb-[16px]">
                    <Upload className="h-[28px] w-[28px]" />
                  </div>
                  <h2 className="text-[20px] font-semibold text-[#15171a] mb-[8px]">Escolha a planilha</h2>
                  <p className="text-[12px] text-[#6F7379] font-sans text-center mb-[20px] max-w-[360px]">
                    Selecione um arquivo .csv, .xlsx ou .xls com os dados dos jogadores.
                  </p>
                  <Button
                    onClick={handleImportClick}
                    disabled={importing}
                    className="h-[40px] px-[24px] bg-[#2F4BC0] text-white rounded-none text-[11px] font-mono font-bold hover:bg-[#2F4BC0]/90 shrink-0"
                  >
                    Selecionar arquivo
                  </Button>
                </div>
              )}

              {/* Etapa 2: Mapear colunas */}
              {importStage === "mapping" && (
                <div className="p-[20px] overflow-y-auto min-h-[400px] min-w-0 shrink-0">
                  <div className="space-y-4 min-w-0">
                    {/* Perfil de posição */}
                    <div className="space-y-2 min-w-0">
                      <label className="text-[11px] font-mono font-bold text-[#6F7379] uppercase tracking-[0.06em]">
                        Perfil de posição
                      </label>
                      <Input
                        placeholder="Ex: Goleiro, Zagueiro, Atacante..."
                        value={importPlayerType}
                        onChange={(e) => {
                          setImportPlayerType(e.target.value);
                          loadSavedMapping(e.target.value);
                        }}
                        className="w-full border border-input rounded-none bg-surface px-[12px] py-[10px] text-[12px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Busca de colunas */}
                    <div className="relative min-w-0 shrink-0">
                      <Search className="absolute left-[10px] top-[9px] h-4 w-4 text-[#6F7379] shrink-0" />
                      <Input
                        placeholder="Pesquisar coluna..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        className="w-full pl-[28px] pr-[10px] py-[8px] border border-input rounded-none bg-surface text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Cabeçalho da tabela de mapeamento */}
                    <div className="grid grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-[12px] border-b border-[#E3E1DA] bg-[#F3F2EE] px-[16px] py-[10px] sticky top-[160px] z-[10] min-w-0 shrink-0">
                      <div className="font-mono text-[11px] font-bold text-[#6F7379] uppercase text-center shrink-0">#</div>
                      <div className="font-mono text-[11px] font-bold text-[#6F7379] uppercase shrink-0">COLUNA</div>
                      <div className="font-mono text-[11px] font-bold text-[#6F7379] uppercase shrink-0">NOME CURTO</div>
                      <div className="font-mono text-[11px] font-bold text-[#6F7379] uppercase shrink-0">MENOR É MELHOR</div>
                    </div>

                    {/* Campos de identificação */}
                    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[16px] mb-[24px] min-w-0 shrink-0">
                      {ID_FIELDS.map((field) => {
                        const currentValue = importIdMap[field.key];
                        const isUsedElsewhere =
                          importMetrics.some((m) => m.column === currentValue && currentValue !== "") ||
                          Object.values(importIdMap).some((v, idx) => v === currentValue && Object.keys(importIdMap)[idx] !== field.key);
                        return (
                          <div key={field.key} className="space-y-[6px] min-w-0 shrink-0">
                            <div className="flex items-center gap-[6px] min-w-0 shrink-0">
                              <span className="font-mono text-[11px] font-bold text-[#6F7379] shrink-0">
                                {field.label}
                              </span>
                              {field.required && (
                                <span className="text-[10px] text-[#C2501F] font-bold shrink-0">*</span>
                              )}
                            </div>
                            <ImportColumnSelect
                              value={currentValue}
                              onChange={(v) => setImportIdMap({ ...importIdMap, [field.key]: v })}
                              columns={importColumns}
                              disabledColumns={usedColumns}
                              placeholder="Selecionar coluna"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 14 Avaliações */}
                    <div className="space-y-[24px] min-w-0 shrink-0">
                      <div className="flex items-center justify-between mb-[12px] min-w-0 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-[#6F7379] uppercase tracking-[0.06em]">
                          As 14 avaliações
                        </span>
                        <span className="font-mono text-[11px] text-[#6F7379] shrink-0">
                          {importMetrics.filter((m) => m.column).length} mapeadas
                        </span>
                      </div>
                      <div className="grid grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-[12px] min-w-0 shrink-0">
                        {importMetrics
                          .filter((m) => {
                            const term = normalize(metricSearch);
                            return (
                              !term ||
                              normalize(m.label).includes(term) ||
                              normalize(m.column).includes(term)
                            );
                          })
                          .map((slot, i) => {
                            const isUsedElsewhere =
                              importIdMap.name === slot.column ||
                              importIdMap.club === slot.column ||
                              importIdMap.position === slot.column ||
                              importIdMap.age === slot.column ||
                              importIdMap.foot === slot.column ||
                              importIdMap.nationality === slot.column ||
                              importIdMap.height === slot.column ||
                              importIdMap.salary === slot.column ||
                              importIdMap.rating === slot.column ||
                              importIdMap.fullGames === slot.column ||
                              importIdMap.uid === slot.column ||
                              importMetrics.some(
                                (m, j) => j !== i && m.column === slot.column,
                              );
                            const displayLabel = slot.label || metricLabels[slot.column] || slot.column;
                            return (
                              <div
                                key={i}
                                className="grid grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-[12px] items-center border-b border-[#E3E1DA] px-[16px] py-[13px] min-w-0 shrink-0 h-[52px]"
                              >
                                <div className="font-mono text-[11px] font-bold text-[#6F7379] text-center shrink-0">
                                  {i + 1}
                                </div>
                                <div className="relative min-w-0 shrink-0">
                                  <ImportColumnSelect
                                    value={slot.column}
                                    onChange={(v) => {
                                      const next = [...importMetrics];
                                      next[i] = { ...next[i], column: v, label: v ? slot.label || v : "" };
                                      setImportMetrics(next);
                                    }}
                                    columns={importColumns}
                                    disabledColumns={usedColumns}
                                    placeholder="Selecionar coluna"
                                  />
                                </div>
                                <div className="flex min-w-0 shrink-0">
                                  <Input
                                    value={slot.label}
                                    onChange={(e) => {
                                      const next = [...importMetrics];
                                      next[i] = { ...next[i], label: e.target.value };
                                      setImportMetrics(next);
                                    }}
                                    placeholder="Nome curto no card"
                                    className="w-full border border-input rounded-none bg-surface px-[10px] py-[8px] text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary shrink-0"
                                  />
                                </div>
                                <div className="flex items-center gap-[6px] min-w-0 shrink-0">
                                  <label className="flex items-center gap-[2px] cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={slot.invert}
                                      onChange={(e) => {
                                        const next = [...importMetrics];
                                        next[i] = { ...next[i], invert: e.target.checked };
                                        setImportMetrics(next);
                                      }}
                                      className="w-4 h-4 rounded-none border border-input text-primary focus:ring-primary"
                                      readOnly
                                      onClick={(e) => e.preventDefault()}
                                    />
                                    <span className="text-[10px] text-[#6F7379] font-mono shrink-0 whitespace-nowrap">
                                      Menor é melhor
                                    </span>
                                  </label>
                                </div>
                                <div className="absolute inset-0 z-[20] opacity-0" />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé fixo */}
            <div className="border-t border-[#E3E1DA] px-[24px] py-[16px] bg-[#F3F2EE] flex items-center justify-between gap-[12px] shrink-0 min-w-0">
              <button
                onClick={() => setImportDialogOpen(false)}
                className="flex h-[36px] items-center justify-center gap-[8px] rounded-none border border-[#E3E1DA] px-[16px] py-[8px] text-[11px] font-mono font-bold text-[#6F7379] hover:bg-[#F7F6F2] shrink-0"
              >
                Cancelar
              </button>
              <div className="flex items-center gap-[8px] shrink-0">
                {importing ? (
                  <span className="font-mono text-[11px] text-[#6F7379] shrink-0">Importando…</span>
                ) : (
                  <>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importing || !importPlayerType || !importIdMap.name}
                      className="flex h-[36px] items-center justify-center gap-[8px] rounded-none border-none px-[16px] py-[8px] bg-[#2F4BC0] text-white text-[11px] font-mono font-bold hover:bg-[#2F4BC0]/90 shrink-0"
                    >
                      Confirmar importação
                    </Button>
                    {!importPlayerType || !importIdMap.name ? (
                      <span className="text-[10px] text-[#C2501F] font-mono shrink-0 whitespace-nowrap">
                        {!importPlayerType ? "Informe o perfil de posição" : "Informe o campo Jogador"}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </aside>

      <header className="fixed left-[230px] right-0 top-0 z-20 flex h-[64px] items-center justify-between border-b border-border bg-background/0.94 backdrop-blur-[14px] px-[32px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.8px] text-muted-foreground">
          {getBreadcrumb()}
        </div>
        <div className="flex items-center gap-[10px]">
          <Button
            variant="outline"
            size="sm"
            className="h-[38px] w-[38px] gap-2 rounded-none"
            disabled={capturing}
            onClick={handleCapture}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-[38px] w-[38px] rounded-none text-muted-foreground hover:bg-transparent">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-[38px] gap-2 bg-primary text-white hover:bg-primary/90 rounded-none px-[14px] font-[600] text-[12px]"
            onClick={handleImportClick}
            disabled={importing}
          >
            <Upload className="h-4 w-4" />
            <span>Importar planilha</span>
          </Button>
          <Button
            size="sm"
            className="h-[38px] gap-2 bg-[#E0663A] text-white hover:bg-[#C2501F] rounded-none px-[14px] font-[600] text-[12px]"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Resetar base</span>
          </Button>
        </div>
      </header>
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-canvas">
        <SidebarNav />
        <main className="ml-[230px] mt-[64px] min-h-[calc(100vh-64px)] bg-canvas">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
