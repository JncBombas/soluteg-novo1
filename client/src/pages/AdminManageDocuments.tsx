import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Download, Trash2, FileText, Loader2, CheckCircle, Eye, Receipt, Wrench, BarChart3, ClipboardList } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: "vistoria" | "visita" | "nota_fiscal" | "servico" | "relatorio_servico" | "relatorio_visita";
  fileUrl: string;
  uploadedAt: Date;
  clientId: number;
  clientName: string;
  clientEmail: string;
}

export default function AdminManageDocuments() {
  const [, setLocation] = useLocation();
  const [adminId, setAdminId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeClientFilter, setActiveClientFilter] = useState<string>("all");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) {
      setAdminId(parseInt(id));
    } else {
      setLocation("/admin/login");
    }
  }, []);

  // Query de clientes para o filtro
  const { data: clients = [] } = trpc.clients.list.useQuery(
    { adminId: adminId || 0 },
    { enabled: !!adminId }
  );

  // Query de documentos com filtros ativos
  const { data: documents = [], isLoading, refetch } = trpc.documents.listAll.useQuery(
    {
      adminId: adminId || 0,
      search: activeSearch || undefined,
      clientId: activeClientFilter !== "all" ? parseInt(activeClientFilter) : undefined,
      documentType: activeTypeFilter !== "all" ? (activeTypeFilter as any) : undefined,
    },
    {
      enabled: !!adminId,
    }
  );

  const handleFilter = () => {
    setActiveSearch(searchTerm);
    setActiveClientFilter(clientFilter);
    setActiveTypeFilter(documentTypeFilter);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setClientFilter("all");
    setDocumentTypeFilter("all");
    setActiveSearch("");
    setActiveClientFilter("all");
    setActiveTypeFilter("all");
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  const hasActiveFilters = activeSearch || activeClientFilter !== "all" || activeTypeFilter !== "all";

  // Mutation para deletar documento
  const deleteDocumentMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento deletado com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar documento: ${error.message}`);
    },
  });

  const handleDelete = async (docId: number) => {
    if (confirm("Tem certeza que deseja deletar este documento?")) {
      deleteDocumentMutation.mutate({ id: docId });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: "Todos os Tipos",
      vistoria: "Vistoria",
      visita: "Visita",
      relatorio_servico: "Relatorios de Servico",
      relatorio_visita: "Relatorios de Visita",
      nota_fiscal: "Notas Fiscais",
      servico: "Servico",
      outro: "Outros Documentos",
    };
    return labels[type] || type;
  };

  const getDocumentIcon = (type: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      vistoria: { icon: <Eye className="w-5 h-5" />, color: "text-blue-500" },
      visita: { icon: <CheckCircle className="w-5 h-5" />, color: "text-green-500" },
      relatorio_servico: { icon: <BarChart3 className="w-5 h-5" />, color: "text-purple-500" },
      relatorio_visita: { icon: <ClipboardList className="w-5 h-5" />, color: "text-indigo-500" },
      nota_fiscal: { icon: <Receipt className="w-5 h-5" />, color: "text-orange-500" },
      servico: { icon: <Wrench className="w-5 h-5" />, color: "text-red-500" },
    };
    return iconMap[type] || { icon: <FileText className="w-5 h-5" />, color: "text-slate-500" };
  };

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const { icon, color } = getDocumentIcon(doc.documentType);
    return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${color} flex-shrink-0`}>{icon}</div>
              <h3 className="font-semibold truncate">{doc.title}</h3>
            </div>
            {doc.description && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                {doc.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-1 rounded">
                Cliente: {doc.clientName}
              </span>
              <span className="bg-slate-100 px-2 py-1 rounded">
                {getTypeLabel(doc.documentType)}
              </span>
              <span className="bg-slate-100 px-2 py-1 rounded">
                {new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(doc.fileUrl, "_blank")}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(doc.id)}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Documentos</h1>
            <p className="text-slate-600">Visualize, filtre e gerencie documentos dos clientes</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription>Busque e filtre documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Busca por nome */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar por nome</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Digite o nome do documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filtro por cliente */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Clientes</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de documento</label>
                  <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="relatorio_servico">Relatórios de Serviço</SelectItem>
                      <SelectItem value="relatorio_visita">Relatórios de Visita</SelectItem>
                      <SelectItem value="nota_fiscal">Notas Fiscais</SelectItem>
                      <SelectItem value="outro">Outros Documentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2">
                {hasActiveFilters && (
                  <Button onClick={handleClearFilters} variant="outline">
                    Limpar Filtros
                  </Button>
                )}
                <Button onClick={handleFilter} className="bg-orange-500 hover:bg-orange-600">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>

            {/* Indicador de resultados */}
            <div className="mt-4 text-sm text-slate-600">
              {documents.length} documento(s) encontrado(s)
              {hasActiveFilters && (
                <span className="ml-2 text-orange-600 font-medium">
                  (com filtros aplicados)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  Gerencie todos os documentos dos clientes
                </CardDescription>
              </div>
              <Button onClick={() => setLocation("/admin/documentos/enviar")}>
                Enviar Novo Documento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                <p className="text-sm text-slate-500">
                  {searchTerm || clientFilter !== "all" || documentTypeFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Envie documentos para os clientes para começar"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedDocuments.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
