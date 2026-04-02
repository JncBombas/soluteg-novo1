// ============================================================
// DashboardLayout.tsx
// Este arquivo define o "esqueleto" do painel administrativo.
// Ele monta a sidebar (menu lateral), o header (barra do topo)
// e a área central onde cada página aparece.
// ============================================================

// --- IMPORTAÇÕES ---
// Pense nas importações como pegar ferramentas da caixa antes de trabalhar.
// Cada linha traz algo pronto para usar neste arquivo.

// Hook personalizado que retorna os dados do usuário logado (nome, email, etc.)
import { useAuth } from "@/_core/hooks/useAuth";

// Componentes visuais prontos — como peças de LEGO para montar a tela
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,          // O menu que aparece ao clicar (ex: "Meu Perfil / Sair")
  DropdownMenuContent,   // A caixinha com os itens do menu
  DropdownMenuItem,      // Cada item clicável dentro do menu
  DropdownMenuSeparator, // Uma linha divisória entre itens
  DropdownMenuTrigger,   // O botão que abre/fecha o menu
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,           // O container da barra lateral
  SidebarContent,    // A área do meio da sidebar (onde ficam os links)
  SidebarFooter,     // A parte de baixo da sidebar (perfil do usuário)
  SidebarGroup,      // Um grupo de itens (ex: "Visão Geral", "Clientes")
  SidebarGroupLabel, // O título de cada grupo
  SidebarHeader,     // A parte de cima da sidebar (logo + nome)
  SidebarInset,      // A área de conteúdo principal (ao lado da sidebar)
  SidebarMenu,       // A lista de itens de navegação
  SidebarMenuButton, // O botão clicável de cada item do menu
  SidebarMenuItem,   // O container de cada item do menu
  SidebarProvider,   // Contexto que controla o estado aberto/fechado da sidebar
  SidebarTrigger,    // Botão para abrir/fechar a sidebar (usado no mobile)
  useSidebar,        // Hook que dá acesso ao estado atual da sidebar
} from "@/components/ui/sidebar";

// Constantes globais do app: logo, título e URL de login
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

// Hook que detecta se o usuário está em um celular
import { useIsMobile } from "@/hooks/useMobile";

// Ícones da biblioteca Lucide — são imagens vetoriais (SVG) prontas para usar
import {
  LayoutDashboard, // ícone de grade/dashboard
  LogOut,          // ícone de porta de saída
  PanelLeft,       // ícone de painel/sidebar
  Users,           // ícone de pessoas
  FileText,        // ícone de documento
  Wrench,          // ícone de chave de fenda
  ClipboardList,   // ícone de prancheta
  BarChart2,       // ícone de gráfico de barras
  KanbanSquare,    // ícone de quadro kanban
  Upload,          // ícone de upload/enviar
  Tag,             // ícone de etiqueta
  ChevronDown,     // ícone de seta para baixo (▼)
  Home,            // ícone de casa
  User,            // ícone de pessoa
  MessageSquare,   // ícone de balão de mensagem
  HardHat,         // ícone de capacete de obra
} from "lucide-react";

// Ferramentas do React:
// - CSSProperties: tipo para estilos CSS em linha
// - useEffect: executa código quando algo muda
// - useRef: guarda uma referência a um elemento HTML
// - useState: guarda um valor que pode mudar (e re-renderiza a tela)
import { CSSProperties, useEffect, useRef, useState } from "react";

// useLocation: retorna a URL atual e permite navegar
// Link: cria links de navegação sem recarregar a página
import { useLocation, Link } from "wouter";

// Tela de carregamento que aparece enquanto verifica o login
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

// Componente de botão pronto
import { Button } from "./ui/button";

// Rodapé da Soluteg
import { SolutegFooter } from "./SolutegFooter";

// ============================================================
// DEFINIÇÃO DO MENU DE NAVEGAÇÃO
// navMain é um array (lista) que contém todos os grupos e
// itens do menu lateral. Cada item tem:
//   - icon: o ícone que aparece ao lado do texto
//   - label: o texto visível no menu
//   - path: a URL para onde o item leva ao ser clicado
// ============================================================
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
      { icon: ClipboardList, label: "Orçamentos", path: "/admin/orcamentos" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { icon: Users, label: "Clientes", path: "/admin/clientes" },
      { icon: Upload, label: "Enviar Documentos", path: "/admin/documentos/enviar" },
      { icon: MessageSquare, label: "Mensagens em Massa", path: "/admin/mensagens" },
      { icon: FileText, label: "Gerenciar Documentos", path: "/admin/documentos" },      
    ],
  },
  {
    label: "Equipe",
    items: [
      { icon: HardHat, label: "Técnicos", path: "/admin/tecnicos" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { icon: Tag, label: "Labels Personalizadas", path: "/admin/edit-custom-label" },
    ],
  },
];

// ============================================================
// CONSTANTES DE TAMANHO DA SIDEBAR
// O usuário pode arrastar a borda da sidebar para redimensioná-la.
// Estas constantes definem os limites permitidos.
// ============================================================
const SIDEBAR_WIDTH_KEY = "sidebar-width"; // chave usada para salvar no navegador
const DEFAULT_WIDTH = 260; // largura padrão em pixels
const MIN_WIDTH = 200;     // largura mínima permitida
const MAX_WIDTH = 420;     // largura máxima permitida

// ============================================================
// COMPONENTE PRINCIPAL: DashboardLayout
// Este é o "portão de entrada" do layout. Ele recebe {children}
// que representa o conteúdo da página atual (ex: lista de clientes).
// ============================================================
export default function DashboardLayout({
  children, // tudo que for colocado dentro de <DashboardLayout>...</DashboardLayout>
}: {
  children: React.ReactNode; // tipo: qualquer elemento React válido
}) {
  // useState guarda a largura atual da sidebar.
  // A função passada para useState só roda uma vez (na inicialização):
  //   - tenta ler a largura salva no localStorage (memória do navegador)
  //   - se não encontrar, usa o valor padrão de 260px
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  // Pega os dados do usuário logado e se ainda está carregando
  const { loading, user } = useAuth();

  // Verifica se existe um admin logado via usuário/senha (sem OAuth)
  // !! converte o valor para boolean: se existir = true, se não = false
  const hasLocalAdmin = !!localStorage.getItem("adminId");

  // useEffect executa código como "efeito colateral".
  // Este aqui salva a largura no localStorage toda vez que ela muda.
  // O array [sidebarWidth] diz: "rode isso sempre que sidebarWidth mudar".
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Se ainda está verificando o login, mostra a tela de carregamento
  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  // Se não há usuário logado (nem por OAuth nem por usuário/senha),
  // mostra a tela de "Área Restrita" com botão de login
  if (!user && !hasLocalAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full text-center">
          {/* Logo do app */}
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
          {/* Botão que redireciona para a página de login */}
          <Button
            onClick={() => {
              window.location.href = getLoginUrl(); // redireciona o navegador
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

  // Se chegou até aqui, o usuário está logado.
  // Renderiza o layout completo com sidebar + conteúdo.
  // SidebarProvider é um "contexto" que compartilha o estado da sidebar
  // (aberta/fechada) com todos os componentes filhos.
  return (
    <SidebarProvider
      style={
        {
          // Define a largura da sidebar via variável CSS customizada.
          // A variável "--sidebar-width" é usada internamente pelo componente Sidebar.
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      {/* Passa a função de atualizar largura para o componente interno */}
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ============================================================
// TIPO DAS PROPS DO COMPONENTE INTERNO
// TypeScript exige que definamos o "formato" dos dados recebidos.
// Este tipo diz: o componente recebe children (conteúdo visual)
// e setSidebarWidth (função para atualizar a largura).
// ============================================================
type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void; // função que recebe um número
};

// ============================================================
// COMPONENTE INTERNO: DashboardLayoutContent
// Este componente monta toda a estrutura visual:
//   - Sidebar com menu, cabeçalho e rodapé
//   - Header fixo no topo
//   - Área de conteúdo central
//   - Rodapé da página
// ============================================================
function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  // Pega o usuário logado e a função de logout
  const { user, logout } = useAuth();

  // location = URL atual (ex: "/admin/clientes")
  // setLocation = função para navegar para outra URL
  const [location, setLocation] = useLocation();

  // state = "expanded" ou "collapsed" (sidebar aberta ou fechada)
  // toggleSidebar = função que alterna entre os dois estados
  const { state, toggleSidebar } = useSidebar();

  // true se a sidebar estiver recolhida
  const isCollapsed = state === "collapsed";

  // Controla se o usuário está arrastando a borda da sidebar para redimensionar
  const [isResizing, setIsResizing] = useState(false);

  // Referência ao elemento <div> da sidebar no HTML.
  // Permite ler sua posição na tela (getBoundingClientRect).
  const sidebarRef = useRef<HTMLDivElement>(null);

  // true se a tela for mobile (celular)
  const isMobile = useIsMobile();

  // Nome e email para exibir na interface.
  // Tenta várias fontes em ordem: OAuth → localStorage → valor padrão.
  // O operador || significa "ou": usa o primeiro valor que não for vazio/nulo.
  const displayName = user?.name || localStorage.getItem("adminName") || localStorage.getItem("adminEmail") || "Admin";
  const displayEmail = user?.email || localStorage.getItem("adminEmail") || "";

  // Encontra qual item do menu corresponde à URL atual.
  // flatMap transforma a lista de grupos em uma lista plana de itens,
  // depois find busca o item cujo path é igual à URL atual.
  const activeItem = navMain
    .flatMap((g) => g.items)
    .find((item) => item.path === location);

  // Quando a sidebar é recolhida, cancela qualquer redimensionamento em andamento
  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  // Lógica de redimensionamento da sidebar ao arrastar com o mouse
  useEffect(() => {
    // Função chamada enquanto o mouse se move (durante o arrasto)
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return; // sai se não estiver redimensionando

      // Pega a posição esquerda da sidebar na tela
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;

      // A nova largura é: posição do mouse - posição esquerda da sidebar
      const newWidth = e.clientX - sidebarLeft;

      // Só atualiza se a nova largura estiver dentro dos limites permitidos
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    // Função chamada quando o botão do mouse é solto — encerra o redimensionamento
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      // Registra os ouvintes de evento no documento inteiro
      // (não só na sidebar, para capturar movimentos rápidos fora dela)
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Muda o cursor do mouse para indicar redimensionamento horizontal
      document.body.style.cursor = "col-resize";

      // Evita que o texto da página seja selecionado acidentalmente durante o arrasto
      document.body.style.userSelect = "none";
    }

    // Função de limpeza: remove os ouvintes quando o componente desmontar
    // ou quando isResizing mudar para false. Evita "vazamentos de memória".
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]); // re-executa quando isResizing ou setSidebarWidth mudar

  // Gera as iniciais do nome para o Avatar (ex: "Thiago Bombas" → "TB")
  // split(" ")      → divide o nome em palavras: ["Thiago", "Bombas"]
  // slice(0, 2)     → pega no máximo as 2 primeiras: ["Thiago", "Bombas"]
  // map(n => n[0])  → pega a primeira letra de cada: ["T", "B"]
  // join("")        → junta sem espaço: "TB"
  // toUpperCase()   → garante maiúsculas: "TB"
  // || "A"          → usa "A" como fallback se o nome estiver vazio
  const userInitials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "A";

  return (
    <>
      {/* ── SIDEBAR (MENU LATERAL) ───────────────────────── */}
      {/* div relativa para posicionar a alça de redimensionamento */}
      <div className="relative" ref={sidebarRef}>

        {/* Sidebar principal. collapsible="icon" = quando recolhida, mostra só ícones */}
        {/* disableTransition evita animação durante o arrasto (ficaria travado) */}
        <Sidebar collapsible="icon" disableTransition={isResizing}>

          {/* ── CABEÇALHO DA SIDEBAR ── */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">

              {/* Se a sidebar estiver recolhida: mostra só o logo como botão */}
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
                  {/* Overlay com ícone de painel que aparece ao passar o mouse (hover) */}
                  <span className="absolute inset-0 flex items-center justify-center bg-sidebar-accent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
                  </span>
                </button>
              ) : (
                // Se a sidebar estiver expandida: mostra logo + nome + botão de recolher
                <>
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                    alt="Soluteg"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Nome do sistema */}
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">
                      Soluteg
                    </p>
                    {/* Subtítulo */}
                    <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">
                      Painel Administrativo
                    </p>
                  </div>
                  {/* Botão para recolher a sidebar */}
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

          {/* ── NAVEGAÇÃO (LISTA DE LINKS) ── */}
          <SidebarContent className="py-2">
            {/* Percorre cada grupo do menu (ex: "Visão Geral", "Clientes"...) */}
            {navMain.map((group) => (
              <SidebarGroup key={group.label} className="px-2 py-2 mt-4 first:mt-0 relative"> {/* Adiciona margem se não for o primeiro grupo*/}

                {/* Título do grupo em letras maiúsculas pequenas */}
                {/* relative z-10 garante que a label fique na frente dos itens do grupo anterior */}
                <SidebarGroupLabel 
                  className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest mb-1 mt-2">
                  {group.label}
                </SidebarGroupLabel>

                <SidebarMenu>
                  {/* Percorre cada item dentro do grupo */}
                  {group.items.map((item) => {
                    // Verifica se este item corresponde à página atual
                    // startsWith cobre sub-rotas (ex: /admin/clientes/123)
                    const isActive = location === item.path || location.startsWith(item.path + "/");

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild        // repassa os estilos para o filho (Link)
                          isActive={isActive} // destaca visualmente se for a página ativa
                          tooltip={item.label} // texto que aparece ao passar o mouse (quando recolhida)
                          className="h-9 gap-2.5 text-sm font-normal rounded-lg transition-all"
                        >
                          {/* Link de navegação — não recarrega a página */}
                          <Link href={item.path}>
                            {/* Ícone: azul se ativo, cinza se não */}
                            <item.icon
                              className={`h-4 w-4 shrink-0 ${
                                isActive
                                  ? "text-primary"
                                  : "text-sidebar-foreground/60"
                              }`}
                            />
                            {/* Texto: negrito se ativo, normal se não */}
                            <span className={`truncate ${isActive ? "font-medium" : ""}`}>
                              {item.label}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* ── RODAPÉ DA SIDEBAR — PERFIL DO USUÁRIO ── */}
          <SidebarFooter className="border-t border-sidebar-border p-3">
            {/* Menu suspenso que abre ao clicar no perfil */}
            <DropdownMenu>

              {/* O botão que dispara o menu — mostra avatar + nome + seta */}
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  {/* Avatar circular com as iniciais do usuário */}
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Nome e email (some quando a sidebar está recolhida) */}
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                      {displayName}
                    </p>
                    {/* Se não houver email, mostra "-" */}
                    <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                      {displayEmail || "-"}
                    </p>
                  </div>
                  {/* Seta para baixo (some quando recolhida) */}
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>

              {/* Conteúdo do menu suspenso */}
              <DropdownMenuContent align="end" className="w-52">
                {/* Cabeçalho do menu: nome e email do usuário */}
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
                <DropdownMenuSeparator />
                {/* Item "Meu Perfil" — navega para a página de perfil */}
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/profile")}
                  className="cursor-pointer gap-2"
                >
                  <User className="h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Item "Sair" — chama a função de logout (vermelho para indicar perigo) */}
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

        {/* ── ALÇA DE REDIMENSIONAMENTO ──
            Faixa invisível de 4px colada na borda direita da sidebar.
            Só aparece quando a sidebar está expandida.
            Ao passar o mouse: cursor vira ↔
            Ao clicar e arrastar: redimensiona a sidebar */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors"
            style={{ zIndex: 50 }} // fica na frente de outros elementos
            onMouseDown={() => setIsResizing(true)} // inicia o redimensionamento
          />
        )}
      </div>

      {/* ── ÁREA DE CONTEÚDO PRINCIPAL ──────────────────── */}
      {/* SidebarInset ocupa todo o espaço restante ao lado da sidebar */}
      <SidebarInset className="flex flex-col min-h-screen">

        {/* ── HEADER FIXO NO TOPO ──
            sticky top-0 = fica "grudado" no topo ao rolar a página
            z-40 = fica na frente de outros elementos (exceto modais)
            backdrop-blur = efeito de desfoque no fundo (estilo "vidro fosco") */}
        <header className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">

          {/* Lado esquerdo: botão mobile + breadcrumb de navegação */}
          <div className="flex items-center gap-3">

            {/* Botão de abrir/fechar sidebar — só aparece em telas pequenas (mobile) */}
            {isMobile && (
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
            )}

            {/* Link "Início" que leva para a home do site */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              {/* hidden sm:inline = oculto no mobile, visível a partir de telas médias */}
              <span className="hidden sm:inline">Início</span>
            </Link>

            {/* Breadcrumb: mostra o nome da página atual depois de "Início /"
                Só aparece se o item ativo foi encontrado na lista de navegação */}
            {activeItem && (
              <>
                <span className="text-muted-foreground/40 text-xs">/</span>
                <span className="text-sm font-medium text-foreground">
                  {activeItem.label}
                </span>
              </>
            )}
          </div>

          {/* Lado direito: avatar do usuário com menu suspenso
              Funciona igual ao rodapé da sidebar, mas fica no header */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors focus:outline-none">
                {/* Avatar menor (7x7) para o header */}
                <Avatar className="h-7 w-7 border">
                  <AvatarFallback className="text-[11px] font-semibold bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {/* Nome do usuário — oculto em mobile, visível em telas maiores */}
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
                  {displayName}
                </span>
                {/* Seta ▼ — oculta em mobile */}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Item "Meu Perfil" */}
              <DropdownMenuItem
                onClick={() => setLocation("/admin/profile")}
                className="cursor-pointer gap-2"
              >
                <User className="h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Item "Sair" em vermelho */}
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

        {/* ── ÁREA DE CONTEÚDO DAS PÁGINAS ──
            flex-1 = ocupa todo o espaço vertical disponível
            p-3/5/6 = padding (espaço interno) que aumenta conforme a tela fica maior
            {children} = aqui é onde a página atual (Dashboard, Clientes, etc.) aparece */}
        <main className="flex-1 p-3 sm:p-5 md:p-6">{children}</main>

        {/* ── RODAPÉ DA PÁGINA ──
            full={false} = versão compacta do rodapé */}
        <SolutegFooter full={false} />
      </SidebarInset>
    </>
  );
}
