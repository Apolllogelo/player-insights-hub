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
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Settings2,
  Bookmark,
  Database,
  User,
  Search,
  Upload,
} from "lucide-react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
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

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Visão geral", exact: true },
    { to: "/jogadores", icon: Users, label: "Jogadores", badge: "0" },
    { to: "/mapear", icon: Settings2, label: "Perfis de posição" },
    { to: "/shortlist", icon: Bookmark, label: "Shortlist", badge: "0" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[260px] flex-col bg-[#171B22] text-[#E5E7EB]">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3458D4] text-sm font-bold text-white">
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
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-[#1F242C] text-white"
                  : "text-[#9CA3AF] hover:bg-[#1F242C] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 justify-center rounded-full bg-[#2A2F37] px-1.5 text-xs text-[#9CA3AF]"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-3">
        <div className="rounded-lg border border-[#2A2F37] bg-[#1F242C] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2A2F37]">
              <Database className="h-4 w-4 text-[#9CA3AF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Base de dados</p>
              <p className="text-[11px] text-[#9CA3AF]">Conectada</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2F37]">
            <User className="h-4 w-4 text-[#9CA3AF]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Usuário</p>
            <p className="text-[11px] text-[#9CA3AF]">Scout</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  const getBreadcrumb = () => {
    if (pathname === "/") return ["SCOUTING", "VISÃO GERAL"];
    if (pathname.startsWith("/jogadores")) return ["SCOUTING", "JOGADORES"];
    if (pathname.startsWith("/mapear")) return ["SCOUTING", "PERFIS DE POSIÇÃO"];
    if (pathname.startsWith("/shortlist")) return ["SCOUTING", "SHORTLIST"];
    if (pathname.startsWith("/planejador")) return ["GESTÃO", "PLANEJADOR"];
    return ["SCOUTING", "VISÃO GERAL"];
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="fixed left-[260px] right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-2 text-xs">
        {breadcrumb.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className={
                index === breadcrumb.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {item}
            </span>
            {index < breadcrumb.length - 1 && <span className="text-muted-foreground">/</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-9 gap-2 bg-[#3458D4] text-white hover:bg-[#2A4BC4]"
        >
          <Upload className="h-4 w-4" />
          Importar planilha
        </Button>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#F3F4F1]">
        <SidebarNav />
        <TopHeader />
        <main className="ml-[260px] mt-16 min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
