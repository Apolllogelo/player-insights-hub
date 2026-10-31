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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { resetPlayers } from "../lib/scout-api";

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

  async function handleCapture() {
    if (capturing) return;
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
        backgroundColor: "#f2f2ef",
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
      <aside className="fixed left-0 top-0 z-30 flex h-screen flex-col bg-[#171b22] text-[#d7dcd9] w-[230px] p-[24px_16px_18px]">
        <div className="flex items-center gap-[11px] font-sans text-[16px] font-semibold mb-[38px] mx-[8px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center bg-[#fff] text-[#171b22] text-[11px] font-mono font-medium">
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
                className={`relative flex items-center gap-[13px] rounded-none border-l-[2px] border-transparent px-[12px] py-[11px] text-xs font-medium text-[#9197a1] transition-colors ${
                  isActive
                    ? "bg-[#222832] text-white border-l-[#6c8cff]"
                    : "hover:bg-transparent hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[6px] bg-[#6c8cff]" />
                )}
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto flex h-[16px] w-[16px] items-center justify-center rounded-[12px] bg-[#292e37] text-[10px] font-mono text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-[10px] border-t border-[#2a3530] pt-[18px] px-[7px]">
          <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full bg-[#262c35] text-[11px] font-medium text-white">
            MA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#edf0ee] truncate">Marcos Almeida</p>
            <p className="text-[10px] text-[#7f8c86]">Head Scout</p>
          </div>
        </div>
      </aside>

      <header className="fixed left-[230px] right-0 top-0 z-20 flex h-[64px] items-center justify-between border-b border-[#e1e4df] bg-[#f2f2ef]/0.94 backdrop-blur-[14px] px-[32px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.8px] text-[#6f7379]">
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
          <Button variant="ghost" size="icon" className="h-[38px] w-[38px] rounded-none text-[#68716c] hover:bg-transparent">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-[38px] gap-2 bg-[#3155c6] text-white hover:bg-[#2f4da8] rounded-none px-[14px] font-[600] text-[12px]"
          >
            <Upload className="h-4 w-4" />
            <span>Importar planilha</span>
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
