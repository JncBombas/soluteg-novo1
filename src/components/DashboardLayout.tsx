import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  FileText,
  Wrench,
  ClipboardList,
  BarChart2,
  KanbanSquare,
  Upload,
  Tag,
  ChevronDown,
  Home,
  User,
  MessageSquare,
  HardHat,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { SolutegFooter } from "./SolutegFooter";

const navMain = [
  {
    label: "Visão Geral",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: BarChart2, label: "Métricas de OS", path: "/admin/work-orders/dashboard" },
    ],
  },
  {
    label: "Ordens de Serviço",
    items: [
      { icon: Wrench, label: "Painel de Ordens", path: "/admin/work-orders" },
      { icon: KanbanSquare, label: "Kanban", path: "/admin/work-orders/kanban" },
    ],
  },
  {
    label: "Clientes & Documentos",
    items: [
      { icon: Users, label: "Clientes", path: "/admin/clientes" },
      { icon: Upload, label: "Enviar Documentos", path: "/admin/documentos/enviar" },
      { icon: FileText, label: "Gerenciar Documentos", path: "/admin/documentos" },
      { icon: MessageSquare, label: "Mensagens em Massa", path: "/admin/mensagens" },
    ],
  },
  {
    label: "Equipe",
    items: [
      { icon: HardHat, label: "Técnicos", path: "/admin/tecnicos" },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { icon: ClipboardList, label: "Relatórios de Inspeção", path: "/admin/relatorios" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { icon: Tag, label: "Labels Personalizadas", path: "/admin/edit-custom-label" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full text-center">
          <img
            src={APP_LOGO}
            alt={APP_TITLE}
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Área Restrita</h1>
            <p className="text-sm text-muted-foreground">
              Faça login para acessar o painel administrativo.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeItem = navMain
    .flatMap((g) => g.items)
    .find((item) => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <>
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" disableTransition={isResizing}>
          {/* Cabeçalho da sidebar */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">
              {isCollapsed ? (
                <button
                  onClick={toggleSidebar}
                  className="relative h-8 w-8 shrink-0 group"
                  title="Expandir menu"
                >
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-lg object-cover"
                    alt="Soluteg"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-sidebar-accent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
                  </span>
                </button>
              ) : (
                <>
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                    alt="Soluteg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">
                      Soluteg
                    </p>
                    <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">
                      Painel Administrativo
                    </p>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="h-7 w-7 flex items-center justify-center hover:bg-sidebar-accent rounded-md transition-colors shrink-0"
                    title="Recolher menu"
                  >
                    <PanelLeft className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                  </button>
                </>
              )}
            </div>
          </SidebarHeader>

          {/* Navegação */}
          <SidebarContent className="py-2">
            {navMain.map((group) => (
              <SidebarGroup key={group.label} className="px-2 py-1">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-2 mb-1">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location === item.path || location.startsWith(item.path + "/");
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 gap-2.5 text-sm font-normal rounded-lg transition-all"
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? "text-primary"
                                : "text-sidebar-foreground/60"
                            }`}
                          />
                          <span className={isActive ? "font-medium" : ""}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* Rodapé da sidebar — perfil do usuário */}
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/profile")}
                  className="cursor-pointer gap-2"
                >
                  <User className="h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Alça de redimensionamento */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* ── CONTEÚDO PRINCIPAL ──────────────────────────── */}
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header fixo */}
        <header className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isMobile && (
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
            )}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </Link>
            {activeItem && (
              <>
                <span className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-sm font-medium text-foreground">
                  {activeItem.label}
                </span>
              </>
            )}
          </div>

          {/* Perfil no header (mobile/tablet) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors focus:outline-none">
                <Avatar className="h-7 w-7 border">
                  <AvatarFallback className="text-[11px] font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
                  {user?.name || "Usuário"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setLocation("/admin/profile")}
                className="cursor-pointer gap-2"
              >
                <User className="h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Área de conteúdo */}
        <main className="flex-1 p-3 sm:p-5 md:p-6">{children}</main>

        {/* Rodapé compacto */}
        <SolutegFooter full={false} />
      </SidebarInset>
    </>
  );
}
