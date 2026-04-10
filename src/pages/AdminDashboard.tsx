import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { FileText, Users, Wrench, TrendingUp, MessageSquare, ClipboardList, HardHat } from "lucide-react";
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
    if (!id) {
      setLocation("/gestor/login");
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

  const metricCards = [
    {
      label: "Total de Clientes",
      value: metrics.totalClients,
      sub: `${metrics.activeClients} ativos`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      href: "/gestor/clientes",
    },
    {
      label: "Ordens Abertas",
      value: metrics.openWorkOrders,
      sub: "Aguardando conclusão",
      icon: Wrench,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      href: "/gestor/work-orders",
    },
    {
      label: "Total de Documentos",
      value: metrics.totalDocuments,
      sub: "Enviados aos clientes",
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      href: "/gestor/documentos",
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
      desc: "Gerencie atendimentos e serviços",
      action: () => setLocation("/gestor/work-orders"),
      label: "Acessar",
      color: "bg-amber-600 hover:bg-amber-700",
      icon: Wrench,
    },
    {
      title: "Orçamentos",
      desc: "Propostas, aprovações e geração de OS",
      action: () => setLocation("/gestor/orcamentos"),
      label: "Acessar",
      color: "bg-indigo-600 hover:bg-indigo-700",
      icon: ClipboardList,
    },
    {
      title: "Clientes",
      desc: "Criar e gerenciar clientes",
      action: () => setLocation("/gestor/clientes"),
      label: "Acessar",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: Users,
    },
    {
      title: "Documentos",
      desc: "Editar, deletar e substituir documentos",
      action: () => setLocation("/gestor/documentos"),
      label: "Acessar",
      color: "bg-green-600 hover:bg-green-700",
      icon: FileText,
    },
    {
      title: "Mensagens em Massa",
      desc: "Envie WhatsApp para grupos de clientes",
      action: () => setLocation("/gestor/mensagens"),
      label: "Acessar",
      color: "bg-orange-500 hover:bg-orange-600",
      icon: MessageSquare,
    },
    {
      title: "Técnicos",
      desc: "Gerencie técnicos e seus acessos",
      action: () => setLocation("/gestor/tecnicos"),
      label: "Acessar",
      color: "bg-cyan-600 hover:bg-cyan-700",
      icon: HardHat,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto w-full space-y-6">
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
              <Card
                key={m.label}
                className={`border ${m.border} transition-shadow ${m.href ? "cursor-pointer hover:shadow-md" : ""}`}
                onClick={() => m.href && setLocation(m.href)}
              >
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
      </div>
    </DashboardLayout>
  );
}
