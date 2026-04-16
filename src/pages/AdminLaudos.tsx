import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Eye, Edit2, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "../hooks/useDebounce";

const TIPO_LABELS: Record<string, string> = {
  instalacao_eletrica: "Instalação Elétrica",
  inspecao_predial: "Inspeção Predial",
  nr10_nr12: "NR-10 / NR-12",
  grupo_gerador: "Grupo Gerador",
  adequacoes: "Adequações",
};

function StatusBadgeLaudo({ status }: { status: string }) {
  if (status === "rascunho") return <Badge variant="secondary">Rascunho</Badge>;
  if (status === "finalizado") return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Finalizado</Badge>;
  if (status === "enviado") return <Badge className="bg-green-600 text-white hover:bg-green-700">Enviado</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminLaudos() {
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  const { data: laudos = [], isLoading, refetch } = trpc.laudos.list.useQuery({
    tipo: tipoFilter !== "all" ? tipoFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const deleteMutation = trpc.laudos.delete.useMutation({
    onSuccess: () => {
      toast.success("Laudo excluído");
      setDeleteId(null);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePdfMutation = trpc.laudos.generatePdf.useMutation({
    onSuccess: (data: any) => {
      const bytes = atob(data.pdf);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
    },
    onError: (e: any) => toast.error(`Erro ao gerar PDF: ${e.message}`),
    onSettled: () => setPdfLoading(null),
  });

  function handleGeneratePdf(id: number) {
    setPdfLoading(id);
    generatePdfMutation.mutate({ id });
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laudos Técnicos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie laudos de inspeção e relatórios técnicos
            </p>
          </div>
          <Button onClick={() => navigate("/gestor/laudos/novo")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Laudo
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TIPO_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tabela */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : laudos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum laudo encontrado</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/gestor/laudos/novo")}>
                Criar primeiro laudo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Número</TableHead>
                  <TableHead className="w-44">Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-32">Data Inspeção</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(laudos as any[]).map((l: any) => (
                  <TableRow key={l.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">{l.numero}</TableCell>
                    <TableCell className="text-sm">{TIPO_LABELS[l.tipo] ?? l.tipo}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">{l.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.clienteNome ?? "—"}</TableCell>
                    <TableCell><StatusBadgeLaudo status={l.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(l.dataInspecao)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Ver / Editar"
                          onClick={() => navigate(`/gestor/laudos/${l.id}`)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Gerar PDF"
                          disabled={pdfLoading === l.id}
                          onClick={() => handleGeneratePdf(l.id)}
                        >
                          {pdfLoading === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />
                          }
                        </Button>
                        {l.status === "rascunho" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => setDeleteId(l.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Contador */}
        {laudos.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {laudos.length} laudo{laudos.length !== 1 ? "s" : ""} encontrado{laudos.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir laudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O laudo e todos os seus registros serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
