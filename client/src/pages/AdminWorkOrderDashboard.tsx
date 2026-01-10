import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  ClipboardList,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminWorkOrderDashboard() {
  const { data: stats } = trpc.workOrders.metrics.getStats.useQuery();
  const { data: byStatus } = trpc.workOrders.metrics.getByStatus.useQuery();
  const { data: byType } = trpc.workOrders.metrics.getByType.useQuery();
  const { data: avgCompletionTime } = trpc.workOrders.metrics.getAverageCompletionTime.useQuery();
  const { data: financialStats } = trpc.workOrders.metrics.getFinancialStats.useQuery();
  const { data: byMonth } = trpc.workOrders.metrics.getByMonth.useQuery();
  const { data: completionRate } = trpc.workOrders.metrics.getCompletionRate.useQuery();
  const { data: delayed } = trpc.workOrders.metrics.getDelayed.useQuery();
  const { data: topClients } = trpc.workOrders.metrics.getTopClients.useQuery();
  const { data: materialsCost } = trpc.workOrders.metrics.getMaterialsCostByWorkOrder.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      aguardando_aprovacao: "Aguardando Aprovação",
      aprovada: "Aprovada",
      rejeitada: "Rejeitada",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      aguardando_pagamento: "Aguardando Pagamento",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rotina: "Rotina",
      emergencial: "Emergencial",
      orcamento: "Orçamento",
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Ordens de Serviço</h1>
          <p className="text-gray-600 mt-2">
            Visualize métricas, estatísticas e relatórios das OS
          </p>
        </div>

        {/* Cards de Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
              <ClipboardList className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats?.abertas || 0} abertas, {stats?.em_andamento || 0} em andamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completionRate?.completion_rate || 0}%
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {completionRate?.completed || 0} de {completionRate?.total || 0} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialStats?.total_actual || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Estimado: {formatCurrency(financialStats?.total_estimated || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo de Materiais</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialStats?.total_materials_cost || 0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Total gasto em materiais</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com Gráficos */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico: OS por Status */}
              <Card>
                <CardHeader>
                  <CardTitle>OS por Status</CardTitle>
                  <CardDescription>Distribuição de OS por status atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={byStatus?.map((item: any) => ({
                          name: getStatusLabel(item.status),
                          value: item.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {byStatus?.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico: OS por Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle>OS por Tipo</CardTitle>
                  <CardDescription>Distribuição de OS por tipo de serviço</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={byType?.map((item: any) => ({
                      name: getTypeLabel(item.type),
                      count: item.count,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#f97316" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico: OS por Mês */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>OS Criadas por Mês</CardTitle>
                  <CardDescription>Evolução de criação de OS nos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={byMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#f97316" name="OS Criadas" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Financeiro */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card: Resumo Financeiro */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                  <CardDescription>Valores estimados vs realizados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Valor Total Estimado</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(financialStats?.total_estimated || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Valor Total Realizado</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(financialStats?.total_actual || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Custo de Materiais</span>
                      <span className="text-lg font-bold text-orange-600">
                        {formatCurrency(financialStats?.total_materials_cost || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Média por OS (Estimado)</span>
                      <span className="text-md font-semibold">
                        {formatCurrency(financialStats?.avg_estimated || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium">Média por OS (Realizado)</span>
                      <span className="text-md font-semibold">
                        {formatCurrency(financialStats?.avg_actual || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico: Custo de Materiais por OS */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 OS por Custo de Materiais</CardTitle>
                  <CardDescription>OS com maior gasto em materiais</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={materialsCost} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="title" type="category" width={100} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="materials_cost" fill="#f97316" name="Custo" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Desempenho */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card: Tempo Médio de Conclusão */}
              <Card>
                <CardHeader>
                  <CardTitle>Tempo Médio de Conclusão</CardTitle>
                  <CardDescription>Por tipo de OS (em horas)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={avgCompletionTime?.map((item: any) => ({
                      name: getTypeLabel(item.type),
                      hours: Math.round(item.avg_hours || 0),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="#3b82f6" name="Horas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Card: OS Atrasadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    OS Atrasadas
                  </CardTitle>
                  <CardDescription>
                    OS com data agendada vencida e ainda não concluídas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {delayed && delayed.length > 0 ? (
                      delayed.map((os: any) => (
                        <div
                          key={os.id}
                          className="flex justify-between items-center p-2 border rounded hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{os.title}</p>
                            <p className="text-xs text-gray-600">
                              Agendada: {new Date(os.scheduledDate).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <Badge variant="destructive">{os.days_delayed} dias</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 text-center py-4">
                        Nenhuma OS atrasada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Clientes */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Top 10 Clientes por Número de OS
                </CardTitle>
                <CardDescription>Clientes com mais ordens de serviço</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="work_order_count" fill="#f97316" name="Número de OS" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
