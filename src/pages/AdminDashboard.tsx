import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Home, User, FileText, Users, Wrench, TrendingUp, MessageSquare } from "lucide-react";
import { APP_LOGO } from "@/const";
import { SolutegFooter } from "@/components/SolutegFooter";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    openWorkOrders: 0,
    totalDocuments: 0,
    activeClients: 0,
  });

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (!id) {
      setLocation("/admin/login");
      return;
    }
    loadMetrics(parseInt(id));
  }, []);

  const loadMetrics = async (id: number) => {
    try {
      const response = await fetch(`/api/admin-metrics?adminId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    }
  };

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("adminId");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminName");
      toast.success("Logout realizado com sucesso!");
      setLocation("/");
    },
    onError: (error: any) => {
      toast.error("Erro ao fazer logout: " + error.message);
    },
  });

  const handleLogout = async () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("adminName");
    await logoutMutation.mutateAsync();
  };

  const metricCards = [
    {
      label: "Total de Clientes",
      value: metrics.totalClients,
      sub: `${metrics.activeClients} ativos`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Ordens Abertas",
      value: metrics.openWorkOrders,
      sub: "Aguardando conclusão",
      icon: Wrench,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    {
      label: "Total de Documentos",
      value: metrics.totalDocuments,
      sub: "Enviados aos clientes",
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Taxa de Atividade",
      value: `${metrics.totalClients > 0 ? Math.round((metrics.activeClients / metrics.totalClients) * 100) : 0}%`,
      sub: "Clientes ativos",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
  ];

  const actionCards = [
    {
      title: "Ordens de Serviço",
      desc: "Gerencie atendimentos e orçamentos",
      action: () => setLocation("/admin/work-orders"),
      label: "Acessar",
      color: "bg-amber-600 hover:bg-amber-700",
      icon: Wrench,
    },
    {
      title: "Clientes",
      desc: "Criar e gerenciar clientes",
      action: () => setLocation("/admin/clientes"),
      label: "Acessar",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: Users,
    },
    {
      title: "Documentos",
      desc: "Editar, deletar e substituir documentos",
      action: () => setLocation("/admin/documentos"),
      label: "Acessar",
      color: "bg-green-600 hover:bg-green-700",
      icon: FileText,
    },
    {
      title: "Relatórios",
      desc: "Relatórios de inspeção de bombas",
      action: () => setLocation("/admin/relatorios"),
      label: "Acessar",
      color: "bg-purple-600 hover:bg-purple-700",
      icon: FileText,
    },
    {
      title: "Mensagens em Massa",
      desc: "Envie WhatsApp para grupos de clientes",
      action: () => setLocation("/admin/mensagens"),
      label: "Acessar",
      color: "bg-orange-500 hover:bg-orange-600",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="Soluteg" className="h-8 object-contain" />
            <div className="leading-tight hidden sm:block">
              <p className="font-bold text-sm text-white">Soluteg</p>
              <p className="text-[10px] text-slate-400">Painel Administrativo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/profile")}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 hidden sm:flex"
            >
              <User className="w-4 h-4" />
              Perfil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 hidden sm:flex"
            >
              <Home className="w-4 h-4" />
              Início
            </Button>
            <Button
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do sistema Soluteg</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className={`border ${m.border}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {m.label}
                  </CardTitle>
                  <div className={`h-8 w-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${m.color}`}>{m.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {["Sistema Operacional", "Banco de Dados", "API"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acesso rápido */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <CardTitle className="text-sm">{card.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">{card.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={card.action}
                      className={`w-full text-white text-xs h-8 ${card.color}`}
                    >
                      {card.label}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <SolutegFooter full={false} />
    </div>
  );
}
