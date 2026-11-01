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
  DialogTrigger,
} from "@/components/ui/dialog";
import { MappingFields } from "@/components/mapping-fields";
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
  const [capturing, setCapturing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importIdMap, setImportIdMap] = useState<IdMap>(emptyIdMap);
  const [importMetrics, setImportMetrics] = useState<Metric[]>([]);
  const [importPlayerType, setImportPlayerType] = useState("");

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Visão geral", exact: true },
    { to: "/jogadores", icon: Users, label: "Jogadores", badge: "0" },
    { to: "/mapear", icon: Settings2, label: "Perfis de posição" },
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
      setImportIdMap(emptyIdMap);
      setImportMetrics(Array.from({ length: METRIC_SLOTS }, () => ({ column: "", label: "", invert: false })));
      setImportPlayerType("");
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

    // Verificar se o campo obrigatório 'name' está mapeado
    if (!importIdMap.name) {
      toast.error("O campo 'Nome do jogador' é obrigatório.");
      return;
    }

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
            if (String(el.style.getPropertyValue(prop)).includes("oklab") || String(el.style.getPropertyValue(prop)).includes("oklch")) {
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
                  cssRule.style.cssText = cssText.replace(/oklab\([^)]*\)/g, "").replace(/oklch\([^)]*\)/g, "");
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
        filter: (node) => !(node instanceof HTMLElement && (node.classList?.contains("toaster") || node.getAttribute("role") === "status" || node.getAttribute("data-sonner-toaster") === "true")),
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

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl sm:max-w-[600px] p-0">
            <DialogHeader>
              <DialogTitle>Importar planilha</DialogTitle>
              <DialogDescription>
                Mapeie as colunas da planilha para os campos do sistema e selecione o perfil de posição.
              </DialogDescription>
            </DialogHeader>
            <DialogContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-[0.06em]">
                  Perfil de posição
                </label>
                <Input
                  placeholder="Ex: Goleiro, Zagueiro, Atacante..."
                  value={importPlayerType}
                  onChange={(e) => setImportPlayerType(e.target.value)}
                />
              </div>
              <MappingFields
                columns={importColumns}
                idMap={importIdMap}
                metrics={importMetrics}
                onIdMapChange={setImportIdMap}
                onMetricsChange={setImportMetrics}
              />
            </DialogContent>
            <DialogFooter>
              <Button onClick={() => setImportDialogOpen(false)} variant="outline">
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importing || !importPlayerType}
              >
                {importing ? "Importando..." : "Confirmar importação"}
              </Button>
            </DialogFooter>
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
