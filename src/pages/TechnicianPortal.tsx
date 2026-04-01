import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_LOGO } from "@/const";
import {
  HardHat,
  LogOut,
  ChevronRight,
  Calendar,
  User,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TechnicianPortal() {
  const [, setLocation] = useLocation();
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [technicianName, setTechnicianName] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("technicianId");
    const name = localStorage.getItem("technicianName");
    if (!id) {
      window.location.href = "/technician/login";
      return;
    }
    setTechnicianId(parseInt(id));
    setTechnicianName(name ?? "Técnico");
  }, []);

  const { data: workOrders = [], isLoading, refetch } = (trpc as any).technicianPortal.getMyWorkOrders.useQuery(
    { technicianId: technicianId! },
    { enabled: !!technicianId }
  );

  function handleLogout() {
    localStorage.removeItem("technicianId");
    localStorage.removeItem("technicianName");
    localStorage.removeItem("technicianToken");
    window.location.href = "/technician/login";
  }

  const total = workOrders.length;
  const pendentes = (workOrders as any[]).filter(o => ["aberta", "aprovada", "aguardando_aprovacao"].includes(o.status)).length;
  const emAndamento = (workOrders as any[]).filter(o => o.status === "em_andamento").length;
  const concluidas = (workOrders as any[]).filter(o => o.status === "concluida").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt="JNC Logo" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Portal do Técnico</p>
              <p className="font-semibold text-sm">{technicianName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => refetch()} title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleLogout} className="gap-1">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
            <p className="text-xs text-muted-foreground mt-1">Em Andamento</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{concluidas}</p>
            <p className="text-xs text-muted-foreground mt-1">Concluídas</p>
          </div>
        </div>

        {/* Lista de OS */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">Minhas Ordens de Serviço</h2>
            <Badge variant="secondary" className="ml-auto">{total}</Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : workOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-8 text-center">
              <HardHat className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma OS atribuída a você.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(workOrders as any[]).map((os) => (
                <button
                  key={os.id}
                  onClick={() => setLocation(`/technician/work-orders/${os.id}`)}
                  className="w-full bg-white dark:bg-gray-900 rounded-lg border p-4 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{os.osNumber}</span>
                        <StatusBadge status={os.status} />
                        <PriorityBadge priority={os.priority} />
                      </div>
                      <p className="font-semibold truncate">{os.title}</p>
                      {os.clientName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {os.clientName}
                        </p>
                      )}
                      {os.scheduledDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(os.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
