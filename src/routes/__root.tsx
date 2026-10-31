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
import html2canvas from "html2canvas";

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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8F6] px-4">
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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8F6] px-4">
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
            className="inline-flex items-center justify-center rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
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
    let originalGetComputedStyle = window.getComputedStyle.bind(window);
    try {
      const element = document.querySelector("main");
      if (!element) {
        toast.error("Não foi possível encontrar a área principal para captura.", { id: toastId });
        return;
      }

      // html2canvas lê getComputedStyle, que pode retornar oklab; intercepta e filtra antes de capturar
      window.getComputedStyle = ((el: Element, pseudoElt?: string | null) => {
        const computed = originalGetComputedStyle(el, pseudoElt);
        return new Proxy(computed, {
          get(target: any, prop: string | symbol) {
            const value = target[prop];
            if (typeof value === "string" && value.includes("oklab")) {
              return value.replace(/oklab\([^)]*\)/g, "rgb(247, 248, 246)");
            }
            return value;
          },
        }) as unknown as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#F7F8F6",
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) => {
          return (
            el.classList?.contains("toaster") ||
            el.getAttribute("role") === "status" ||
            el.getAttribute("data-sonner-toaster") === "true"
          );
        },
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.querySelector("main");
          if (el) {
            el.style.margin = "0";
            el.style.padding = "24px";
            el.style.backgroundColor = "#F7F8F6";
            el.style.minHeight = "100vh";
          }

          // Backup: remove cores oklab de estilos inline no clone
          const walker = clonedDoc.createTreeWalker(clonedDoc, NodeFilter.SHOW_ELEMENT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const el = node as HTMLElement;
            for (const prop of Object.keys(el.style)) {
              if (String(el.style.getPropertyValue(prop)).includes("oklab")) {
                el.style.removeProperty(prop);
              }
            }
          }
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
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
      window.getComputedStyle = originalGetComputedStyle;
      setCapturing(false);
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[260px] flex-col bg-[#0F1015] text-[#D1D5DB]">
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-[#0F1015]">
            SB
          </div>
          <span className="text-base font-semibold text-white">Scoutboard</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[#16181D] text-white"
                    : "text-[#9CA3AF] hover:bg-[#16181D] hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-[#3458D4]" />
                )}
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs tabular-nums text-[#6B7280]">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 p-3">
          <div className="rounded-lg border border-[#1F2127] bg-[#16181D] p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1F2127]">
                <Database className="h-4 w-4 text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">Base FM 2026</p>
                <p className="text-[11px] text-[#6B7280]">Atualizada hoje</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#6B7280] hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setResetDialogOpen(true)} className="text-xs">
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Resetar planilha
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3458D4]/20 text-xs font-medium text-[#3458D4]">
              HS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Head Scout</p>
              <p className="text-[11px] text-[#6B7280]">Scout</p>
            </div>
          </div>
        </div>
      </aside>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar planilha</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá apagar todos os jogadores e datasets importados. Os perfis de posição serão mantidos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetando..." : "Resetar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="fixed left-[260px] right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280]">
          {getBreadcrumb()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            disabled={capturing}
            onClick={handleCapture}
          >
            <Camera className="h-4 w-4" />
            {capturing ? "Salvando..." : "Salvar tela"}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#6B7280]">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 bg-[#3458D4] text-white hover:bg-[#2A4BC4]"
          >
            <Upload className="h-4 w-4" />
            Importar planilha
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
      <div className="min-h-screen bg-[#F7F8F6]">
        <SidebarNav />
        <main className="ml-[260px] mt-16 min-h-[calc(100vh-64px)] bg-[#F7F8F6]">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
