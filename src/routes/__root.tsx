// @ts-nocheck
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

/**
 * Select nativo de coluna usado no modal de mapeamento.
 * Fica no escopo do módulo (e não dentro de SidebarNav) para manter a mesma
 * identidade entre renders — evita que o <select> seja remontado a cada
 * mudança de estado do modal.
 */
function ImportColumnSelect({
  value,
  onChange,
  columns,
  disabledColumns,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  disabledColumns: Set<string>;
  placeholder: string;
  ariaLabel?: string;
}) {
  const available = columns.filter((c) => !disabledColumns.has(c) || c === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-[34px] w-full min-w-0 truncate border border-input rounded-none bg-surface px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="">{placeholder}</option>
      {available.map((c) => (
        <option key={c} value={c} disabled={disabledColumns.has(c) && c !== value}>
          {c}
        </option>
      ))}
    </select>
  );
}

/**
 * Template único de colunas das linhas de avaliação do modal.
 * Cabeçalho e linhas usam exatamente o mesmo template, então ficam sempre alinhados.
 * Abaixo de `md`: número + conteúdo empilhado. A partir de `md`: 4 colunas
 * (número | coluna da planilha | nome curto | menor é melhor).
 */
const METRIC_ROW_COLS =
  "gap-x-[12px] gap-y-[8px] px-[16px] grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,1fr)_120px]";

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

  // Contagem exibida no modal. Enquanto o perfil de posição não é informado, a
  // lista traz uma linha por coluna da planilha (sugestão automática) e não as
  // METRIC_SLOTS avaliações — nesse caso mostramos "colunas detectadas" em vez de
  // misturar a contagem de colunas com a de avaliações.
  const mappedCount = importMetrics.filter((m) => m.column).length;
  const metricsAreSlots = importMetrics.length <= METRIC_SLOTS;
  const mappedSummary = metricsAreSlots
    ? `${mappedCount} de ${METRIC_SLOTS} avaliações mapeadas`
    : `${importMetrics.length} colunas detectadas`;

  // Mantém o índice original de cada avaliação (os handlers editam importMetrics[i]).
  const visibleMetrics = importMetrics
    .map((slot, i) => ({ slot, i }))
    .filter(({ slot }) => {
      const term = normalize(metricSearch);
      return !term || normalize(slot.label).includes(term) || normalize(slot.column).includes(term);
    });

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
          <DialogContent className="flex min-w-0 max-h-[calc(100dvh-48px)] max-w-[min(960px,calc(100vw-48px))] flex-col gap-0 overflow-hidden rounded-[4px] border border-[#E3E1DA] bg-[#F3F2EE] p-0">
            {/* Cabeçalho fixo (pr-[56px] libera o botão de fechar nativo do Dialog) */}
            <div className="flex shrink-0 flex-col gap-[8px] border-b border-[#E3E1DA] bg-[#F3F2EE] py-[20px] pl-[24px] pr-[56px] sm:flex-row sm:items-start sm:justify-between sm:gap-[16px]">
              <div className="flex min-w-0 flex-col gap-[2px]">
                <DialogTitle className="text-[18px] font-semibold text-[#15171a] leading-tight">
                  Mapear colunas{importPlayerType ? ` · ${importPlayerType}` : ""}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-[#6F7379] font-sans leading-[1.4]">
                  Mapeie as colunas da planilha para os campos do sistema antes de importar.
                </DialogDescription>
              </div>
              {importStage === "mapping" && (
                <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-bold text-[#2F4BC0] sm:pt-[4px]">
                  {mappedSummary}
                </span>
              )}
            </div>

            {/* Corpo: único container com rolagem vertical */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              {/* Etapa 1: Escolher arquivo */}
              {importStage === "file" && (
                <div className="flex min-h-[300px] min-w-0 flex-col items-center justify-center p-[24px]">
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
                <div className="flex min-w-0 flex-col gap-[28px] p-[20px] sm:p-[24px]">
                  {/* Perfil de posição */}
                  <section className="flex min-w-0 flex-col gap-[8px]">
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
                  </section>

                  {/* Campos de identificação */}
                  <section className="flex min-w-0 flex-col gap-[12px]">
                    <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#6F7379]">
                      Campos de identificação
                    </h3>
                    <div className="grid grid-cols-1 gap-x-[16px] gap-y-[14px] sm:grid-cols-2 lg:grid-cols-3">
                      {ID_FIELDS.map((field) => (
                        <div key={field.key} className="flex min-w-0 flex-col gap-[6px]">
                          <div className="flex items-center gap-[6px]">
                            <span className="font-mono text-[11px] font-bold text-[#6F7379]">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="text-[10px] text-[#C2501F] font-bold">*</span>
                            )}
                          </div>
                          <ImportColumnSelect
                            value={importIdMap[field.key]}
                            onChange={(v) => setImportIdMap({ ...importIdMap, [field.key]: v })}
                            columns={importColumns}
                            disabledColumns={usedColumns}
                            placeholder="Selecionar coluna"
                            ariaLabel={field.label}
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Avaliações */}
                  <section className="flex min-w-0 flex-col gap-[12px]">
                    <div className="flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[4px]">
                      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#6F7379]">
                        As {METRIC_SLOTS} avaliações
                      </h3>
                      <span className="font-mono text-[11px] text-[#6F7379]">{mappedSummary}</span>
                    </div>
                    {!metricsAreSlots && (
                      <p className="font-sans text-[11px] leading-[1.4] text-[#6F7379]">
                        Informe o perfil de posição para configurar as {METRIC_SLOTS} avaliações.
                      </p>
                    )}

                    {/* Busca de colunas */}
                    <div className="relative min-w-0">
                      <Search className="pointer-events-none absolute left-[10px] top-[9px] h-4 w-4 text-[#6F7379]" />
                      <Input
                        placeholder="Pesquisar coluna..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        className="h-[34px] w-full pl-[32px] pr-[10px] py-[8px] border border-input rounded-none bg-surface text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="min-w-0 border border-[#E3E1DA]">
                      {/* Cabeçalho das colunas (mesmo template das linhas) */}
                      <div
                        className={`sticky top-0 z-[10] hidden border-b border-[#E3E1DA] bg-[#F3F2EE] py-[10px] md:grid ${METRIC_ROW_COLS}`}
                      >
                        <div className="text-center font-mono text-[11px] font-bold uppercase text-[#6F7379]">#</div>
                        <div className="font-mono text-[11px] font-bold uppercase text-[#6F7379]">Coluna</div>
                        <div className="font-mono text-[11px] font-bold uppercase text-[#6F7379]">Nome curto</div>
                        <div className="text-right font-mono text-[11px] font-bold uppercase text-[#6F7379]">
                          Menor é melhor
                        </div>
                      </div>

                      {visibleMetrics.length === 0 && (
                        <div className="px-[16px] py-[20px] text-center font-sans text-[12px] text-[#6F7379]">
                          Nenhuma avaliação encontrada.
                        </div>
                      )}

                      {visibleMetrics.map(({ slot, i }) => (
                        <div
                          key={i}
                          className={`grid min-h-[52px] items-center border-b border-[#E3E1DA] py-[10px] last:border-b-0 ${METRIC_ROW_COLS}`}
                        >
                          <div className="text-center font-mono text-[11px] font-bold text-[#6F7379]">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="min-w-0">
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
                              ariaLabel={`Coluna da avaliação ${i + 1}`}
                            />
                          </div>
                          <div className="col-start-2 min-w-0 md:col-start-auto">
                            <Input
                              value={slot.label}
                              onChange={(e) => {
                                const next = [...importMetrics];
                                next[i] = { ...next[i], label: e.target.value };
                                setImportMetrics(next);
                              }}
                              placeholder="Nome curto no card"
                              aria-label={`Nome curto da avaliação ${i + 1}`}
                              className="h-[34px] w-full min-w-0 border border-input rounded-none bg-surface px-[10px] py-[8px] text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <label className="col-start-2 flex cursor-pointer items-center gap-[8px] md:col-start-auto md:justify-self-end">
                            <input
                              type="checkbox"
                              checked={slot.invert}
                              onChange={(e) => {
                                const next = [...importMetrics];
                                next[i] = { ...next[i], invert: e.target.checked };
                                setImportMetrics(next);
                              }}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded-none border border-input text-primary focus:ring-primary"
                            />
                            <span className="whitespace-nowrap font-mono text-[10px] text-[#6F7379] md:sr-only">
                              Menor é melhor
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Rodapé fixo */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-[12px] border-t border-[#E3E1DA] bg-[#F3F2EE] px-[24px] py-[14px]">
              <div className="flex min-w-0 items-center gap-[16px]">
                <button
                  onClick={() => setImportDialogOpen(false)}
                  className="flex h-[36px] shrink-0 items-center justify-center gap-[8px] rounded-none border border-[#E3E1DA] px-[16px] py-[8px] text-[11px] font-mono font-bold text-[#6F7379] hover:bg-[#F7F6F2]"
                >
                  Cancelar
                </button>
                {importStage === "mapping" && (
                  <span className="hidden font-mono text-[11px] text-[#6F7379] sm:inline">{mappedSummary}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-[12px]">
                {importing ? (
                  <span className="font-mono text-[11px] text-[#6F7379]">Importando…</span>
                ) : (
                  <>
                    {!importPlayerType || !importIdMap.name ? (
                      <span className="font-mono text-[10px] text-[#C2501F]">
                        {!importPlayerType ? "Informe o perfil de posição" : "Informe o campo Jogador"}
                      </span>
                    ) : null}
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importing || !importPlayerType || !importIdMap.name}
                      className="flex h-[36px] shrink-0 items-center justify-center gap-[8px] rounded-none border-none px-[16px] py-[8px] bg-[#2F4BC0] text-white text-[11px] font-mono font-bold hover:bg-[#2F4BC0]/90"
                    >
                      Confirmar importação
                    </Button>
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
