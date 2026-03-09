import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Plus } from "lucide-react";
import { Link } from "wouter";
import AdminDashboard from "./AdminDashboard";

export default function Admin() {
  const { data: reports, isLoading } = trpc.reports.list.useQuery();
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'reports'>('dashboard');

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Relatórios
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <AdminDashboard />
        )}

        {activeTab === 'reports' && (
          <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Relatórios Técnicos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie seus relatórios de serviço</p>
          </div>
          <Link href="/admin/reports/new" className="w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Relatório</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando relatórios...</p>
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Link key={report.id} href={`/admin/reports/${report.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-primary" />
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        report.status === 'completed' ? 'bg-green-100 text-green-700' :
                        report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {report.status === 'completed' ? 'Concluído' :
                         report.status === 'reviewed' ? 'Revisado' : 'Rascunho'}
                      </span>
                    </div>
                    <CardTitle className="mt-4">{report.title}</CardTitle>
                    <CardDescription>{report.clientName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Tipo:</strong> {report.serviceType}</p>
                      <p><strong>Data:</strong> {new Date(report.serviceDate).toLocaleDateString('pt-BR')}</p>
                      <p><strong>Técnico:</strong> {report.technicianName}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
              <p className="text-muted-foreground mb-4">Comece criando seu primeiro relatório técnico</p>
              <Link href="/admin/reports/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Relatório
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
