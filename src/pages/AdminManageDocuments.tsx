import { useState, useEffect } from "react";
import { useLocation } from "wouter";
// UI COMPONENTS: Componentes de interface para layout e botões
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ICONS: Ícones para identificar visualmente os tipos de documentos e ações
import {
  Search, Filter, Download, Trash2, FileText,
  Loader2, CheckCircle, Eye, Receipt, Wrench, BarChart3, ClipboardList
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

// DEFINIÇÃO DO OBJETO DOCUMENTO: O que compõe um documento no sistema
interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: "vistoria" | "visita" | "nota_fiscal" | "servico" | "relatorio_servico" | "relatorio_visita";
  fileUrl: string;
  uploadedAt: Date;
  clientId: number;
  clientName: string;
  clientEmail: string | null;
}

export default function AdminManageDocuments() {
  const [, navigate] = useLocation();
  
  // --- ESTADOS (STATES) ---
  const [adminId, setAdminId] = useState<number | null>(null);
  
  // Estados dos inputs (o que o usuário digita antes de clicar em filtrar)
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");

  // Estados ativos (o que realmente está sendo usado na busca do banco de dados)
  const [activeSearch, setActiveSearch] = useState("");
  const [activeClientFilter, setActiveClientFilter] = useState<string>("all");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");

  // --- AUTENTICAÇÃO ---
  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) {
      setAdminId(parseInt(id));
    } else {
      navigate("/gestor/login"); // Se não houver ID de admin, expulsa para o login
    }
  }, []);

  // --- BUSCA DE DADOS (QUERIES) ---
  
  // Busca a lista de clientes para preencher o seletor (Select) de filtro
  const { data: clients = [] } = trpc.clients.list.useQuery(
    { adminId: adminId || 0 },
    { enabled: !!adminId }
  );

  // Busca os documentos aplicando os filtros que estão "ativos"
  const { data: documents = [], isLoading, refetch } = trpc.documents.listAll.useQuery(
    {
      adminId: adminId || 0,
      search: activeSearch || undefined,
      clientId: activeClientFilter !== "all" ? parseInt(activeClientFilter) : undefined,
      documentType: activeTypeFilter !== "all" ? (activeTypeFilter as any) : undefined,
    },
    { enabled: !!adminId }
  );

  // --- FUNÇÕES DE FILTRO ---
  
  // Quando clica no botão "Filtrar", os valores dos inputs viram "filtros ativos"
  const handleFilter = () => {
    setActiveSearch(searchTerm);
    setActiveClientFilter(clientFilter);
    setActiveTypeFilter(documentTypeFilter);
  };

  // Reseta todos os campos para o estado original
  const handleClearFilters = () => {
    setSearchTerm("");
    setClientFilter("all");
    setDocumentTypeFilter("all");
    setActiveSearch("");
    setActiveClientFilter("all");
    setActiveTypeFilter("all");
  };

  // Ordenação manual: Os documentos mais recentes (uploadedAt) aparecem primeiro
  const sortedDocuments = [...documents].sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  const hasActiveFilters = activeSearch || activeClientFilter !== "all" || activeTypeFilter !== "all";

  // --- AÇÕES (MUTATIONS) ---
  
  const deleteDocumentMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento deletado com sucesso");
      refetch(); // Atualiza a lista após deletar
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

  // --- AUXILIARES VISUAIS ---
  
  // Converte o nome técnico do banco (ex: "nota_fiscal") para texto legível
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: "Todos os Tipos",
      vistoria: "Vistoria",
      visita: "Visita",
      relatorio_servico: "Relatórios de Serviço",
      relatorio_visita: "Relatórios de Visita",
      nota_fiscal: "Notas Fiscais",
      servico: "Serviço",
      outro: "Outros Documentos",
    };
    return labels[type] || type;
  };

  // Retorna um ícone e uma cor específica para cada tipo de arquivo
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

  // COMPONENTE INTERNO: O "Card" de cada documento individual
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
              {/* Etiquetas com informações do arquivo */}
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-1 rounded">Cliente: {doc.clientName}</span>
                <span className="bg-slate-100 px-2 py-1 rounded">{getTypeLabel(doc.documentType)}</span>
                <span className="bg-slate-100 px-2 py-1 rounded">
                  {new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
            {/* Botões de Ação do Card */}
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // TELA DE CARREGAMENTO
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  // --- ESTRUTURA VISUAL PRINCIPAL ---
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* SEÇÃO DE FILTROS */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Input de Texto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar por nome</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Nome do arquivo..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                  />
                </div>
              </div>

              {/* Seletor de Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos os Clientes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Tipo de Documento */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de documento</label>
                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
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

            <div className="flex justify-end gap-2 mt-4">
              {hasActiveFilters && (
                <Button onClick={handleClearFilters} variant="outline">Limpar</Button>
              )}
              <Button onClick={handleFilter}>
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LISTAGEM DE DOCUMENTOS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos Encontrados ({documents.length})</CardTitle>
              <Button onClick={() => navigate("/gestor/documentos/enviar")}>
                Enviar Novo Documento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600">Nenhum documento encontrado.</p>
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
    </DashboardLayout>
  );
}