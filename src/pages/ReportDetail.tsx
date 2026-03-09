import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ReportDetail() {
  const [, params] = useRoute("/admin/reports/:id");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const reportId = params?.id ? parseInt(params.id) : 0;
  
  const { data: report, isLoading } = trpc.reports.getById.useQuery(
    { id: reportId },
    { enabled: reportId > 0 }
  );

  const deleteMutation = trpc.reports.delete.useMutation({
    onSuccess: () => {
      toast.success("Relatório excluído com sucesso!");
      utils.reports.list.invalidate();
      setLocation("/admin");
    },
    onError: (error) => {
      toast.error("Erro ao excluir relatório: " + error.message);
    },
  });

  const handleDelete = () => {
    if (reportId > 0) {
      deleteMutation.mutate({ id: reportId });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Relatório não encontrado</p>
          <Button onClick={() => setLocation("/admin")} className="mt-4">
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabel = {
    draft: "Rascunho",
    completed: "Concluído",
    reviewed: "Revisado",
  }[report.status];

  const statusColor = {
    draft: "bg-gray-100 text-gray-700",
    completed: "bg-green-100 text-green-700",
    reviewed: "bg-blue-100 text-blue-700",
  }[report.status];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.info("Funcionalidade de edição em desenvolvimento")}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl">{report.title}</CardTitle>
                <CardDescription className="text-lg mt-2">{report.clientName}</CardDescription>
              </div>
              <span className={`text-sm px-3 py-1 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Tipo de Serviço</h3>
                <p className="text-lg">{report.serviceType}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Data do Serviço</h3>
                <p className="text-lg">{new Date(report.serviceDate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Local</h3>
              <p className="text-lg">{report.location}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Descrição do Serviço</h3>
              <p className="text-base whitespace-pre-wrap">{report.description}</p>
            </div>

            {report.equipmentDetails && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Detalhes dos Equipamentos</h3>
                <p className="text-base whitespace-pre-wrap">{report.equipmentDetails}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Trabalho Realizado</h3>
              <p className="text-base whitespace-pre-wrap">{report.workPerformed}</p>
            </div>

            {report.partsUsed && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Peças Utilizadas</h3>
                <p className="text-base whitespace-pre-wrap">{report.partsUsed}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Técnico Responsável</h3>
              <p className="text-lg">{report.technicianName}</p>
            </div>

            {report.observations && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Observações</h3>
                <p className="text-base whitespace-pre-wrap">{report.observations}</p>
              </div>
            )}

            <div className="pt-4 border-t text-sm text-muted-foreground">
              <p>Criado em: {new Date(report.createdAt).toLocaleString('pt-BR')}</p>
              <p>Última atualização: {new Date(report.updatedAt).toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
