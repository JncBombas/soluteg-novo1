import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, FileText, Loader2, User, Search, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: "relatorio_servico" | "relatorio_visita" | "nota_fiscal" | "outro";
  fileUrl: string;
  uploadedAt: Date;
}

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");

  useEffect(() => {
    // Verificar se cliente está logado
    const token = localStorage.getItem("clientToken");
    const id = localStorage.getItem("clientId");
    const name = localStorage.getItem("clientName");

    if (!token || !id) {
      window.location.href = "/client/login";
      return;
    }

    setClientId(parseInt(id));
    setClientName(name || "Cliente");
  }, []);

  // Query com filtros ativos
  const { data: documents = [], isLoading, refetch } = trpc.documents.list.useQuery(
    {
      clientId: clientId || 0,
      search: activeSearch || undefined,
      documentType: activeTypeFilter !== "all" ? (activeTypeFilter as any) : undefined,
    },
    {
      enabled: !!clientId,
    }
  );

  const handleFilter = () => {
    setActiveSearch(searchTerm);
    setActiveTypeFilter(documentTypeFilter);
  };

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("clientName");
    window.location.href = "/";
  };

  const handleVoltar = () => {
    window.location.href = "/";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: "Todos os Tipos",
      relatorio_servico: "Relatórios de Serviço",
      relatorio_visita: "Relatórios de Visita",
      nota_fiscal: "Notas Fiscais",
      outro: "Outros Documentos",
    };
    return labels[type] || type;
  };

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <h3 className="font-semibold truncate">{doc.title}</h3>
            </div>
            {doc.description && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                {doc.description}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(doc.fileUrl, "_blank")}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Baixar</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando seus documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portal do Cliente</h1>
            <p className="text-slate-600">Bem-vindo, {clientName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleVoltar}>
              Voltar
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription>Busque e filtre seus documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Botão de Filtrar */}
              <div className="flex justify-end">
                <Button onClick={handleFilter} className="bg-orange-500 hover:bg-orange-600">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>

            {/* Indicador de resultados */}
            <div className="mt-4 text-sm text-slate-600">
              {documents.length} documento(s) encontrado(s)
            </div>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Documentos</CardTitle>
            <CardDescription>
              Acesse e faça download dos seus documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                <p className="text-sm text-slate-500">
                  {searchTerm || documentTypeFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Seus documentos aparecerão aqui quando forem enviados"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => (
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
