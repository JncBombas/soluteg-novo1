import { useState } from "react";
import { useLocation } from "wouter";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_LOGO } from "@/const";
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Download,
  Loader2,
  LogOut,
  ArrowLeft,
} from "lucide-react";
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

export default function TecnicoLaudos() {
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  const { data: laudos = [], isLoading } = (trpc as any).laudos.listTecnico.useQuery({
    tipo: tipoFilter !== "all" ? tipoFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
  });

  const generatePdfMutation = (trpc as any).laudos.generatePdf.useMutation({
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

  function handleLogout() {
    fetch("/api/technician-logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("technicianId");
    localStorage.removeItem("technicianName");
    localStorage.removeItem("technicianToken");
    window.location.href = "/technician/login";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/technician/portal")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={APP_LOGO} alt="JNC Logo" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Portal do Técnico</p>
              <p className="font-semibold text-sm">Laudos Técnicos</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleLogout} className="gap-1">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5 max-w-5xl">
        {/* Cabeçalho da seção */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Meus Laudos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Laudos criados ou atribuídos a você
            </p>
          </div>
          <Button onClick={() => navigate("/technician/laudos/novo")} className="gap-2">
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
              <Button variant="outline" size="sm" onClick={() => navigate("/technician/laudos/novo")}>
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
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(laudos as any[]).map((l: any) => (
                  <TableRow key={l.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">{l.numero}</TableCell>
                    <TableCell className="text-sm">{TIPO_LABELS[l.tipo] ?? l.tipo}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.titulo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.clienteNome ?? "—"}</TableCell>
                    <TableCell><StatusBadgeLaudo status={l.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(l.dataInspecao)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Editar"
                          onClick={() => navigate(`/technician/laudos/${l.id}`)}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {laudos.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {laudos.length} laudo{laudos.length !== 1 ? "s" : ""} encontrado{laudos.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}
