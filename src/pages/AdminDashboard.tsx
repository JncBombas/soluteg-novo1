import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { FileText, Users, Wrench, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

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
    if (id) loadMetrics(parseInt(id));
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
      label: "Acessar Ordens",
      colorClass: "bg-amber-600 hover:bg-amber-700",
      icon: Wrench,
    },
    {
      title: "Clientes",
      desc: "Criar e gerenciar clientes",
      action: () => setLocation("/admin/clientes"),
      label: "Acessar Clientes",
      colorClass: "bg-blue-600 hover:bg-blue-700",
      icon: Users,
    },
    {
      title: "Documentos",
      desc: "Editar, deletar e substituir documentos",
      action: () => setLocation("/admin/documentos"),
      label: "Gerenciar Documentos",
      colorClass: "bg-green-600 hover:bg-green-700",
      icon: FileText,
    },
    {
      title: "Relatórios",
      desc: "Relatórios de inspeção de bombas",
      action: () => setLocation("/admin/relatorios"),
      label: "Acessar Relatórios",
      colorClass: "bg-purple-600 hover:bg-purple-700",
      icon: FileText,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Cabeçalho da página */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do sistema Soluteg
          </p>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className={`border ${m.border}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {m.label}
                  </CardTitle>
                  <div className={`h-8 w-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${m.color}`}>{m.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Status do sistema */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status do Sistema</CardTitle>
            <CardDescription>Monitoramento em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {["Sistema Operacional", "Banco de Dados", "API"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.title} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">{card.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">{card.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={card.action}
                      className={`w-full text-white text-xs h-8 gap-1.5 ${card.colorClass}`}
                    >
                      {card.label}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
