import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, FileText, Loader2, User, Search, Filter, Plus, AlertCircle, FileQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: "vistoria" | "visita" | "nota_fiscal" | "servico" | "relatorio_servico" | "relatorio_visita";
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
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [osType, setOsType] = useState<"emergencial" | "orcamento">("emergencial");
  const [osFormData, setOsFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
  });
  const [osLoading, setOsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("vistoria");
  const [tabSearches, setTabSearches] = useState<Record<string, string>>({
    vistoria: "",
    visita: "",
    nota_fiscal: "",
    servico: "",
    rel_servico: "",
    rel_visita: ""
  });

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

  const handleTabSearch = (tabName: string, value: string) => {
    setTabSearches({ ...tabSearches, [tabName]: value });
  };

  const handleTabFilter = (tabName: string) => {
    setActiveSearch(tabSearches[tabName]);
    setActiveTypeFilter(tabName);
  };

  const getTabDocuments = (tabType: string) => {
    const search = tabSearches[tabType];
    const typeMap: Record<string, string[]> = {
      vistoria: ["vistoria"],
      visita: ["visita"],
      nota_fiscal: ["nota_fiscal"],
      servico: ["servico"],
      rel_servico: ["relatorio_servico"],
      rel_visita: ["relatorio_visita"]
    };
    
    const allowedTypes = typeMap[tabType] || [];
    
    return documents.filter(doc => {
      const matchesType = allowedTypes.includes(doc.documentType);
      const matchesSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
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

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!osFormData.title.trim()) {
      toast.error("Titulo da OS eh obrigatorio");
      return;
    }
    
    setOsLoading(true);
    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          type: osType,
          title: osFormData.title,
          description: osFormData.description,
          serviceType: osFormData.serviceType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao criar OS");
      }

      const successMsg = osType === "emergencial" 
        ? "Solicitação de atendimento enviada com sucesso!" 
        : "Solicitação de orçamento enviada com sucesso!";
      toast.success(successMsg);
      setOsFormData({ title: "", description: "", serviceType: "" });
      setIsOpenDialogOpen(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao criar OS";
      toast.error(errorMsg);
    } finally {
      setOsLoading(false);
    }
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
            <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
              <div className="flex gap-2">
                <Button 
                  onClick={() => { setOsType("emergencial"); setIsOpenDialogOpen(true); }}
                  className="gap-2 bg-red-500 hover:bg-red-600"
                >
                  <AlertCircle className="w-4 h-4" />
                  Solicitar Atendimento
                </Button>
                <Button 
                  onClick={() => { setOsType("orcamento"); setIsOpenDialogOpen(true); }}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <FileQuestion className="w-4 h-4" />
                  Solicitar Orçamento
                </Button>
              </div>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {osType === "emergencial" ? "Solicitar Atendimento" : "Solicitar Orçamento"}
                  </DialogTitle>
                  <DialogDescription>
                    {osType === "emergencial" 
                      ? "Descreva o problema para atendimento emergencial" 
                      : "Descreva o serviço desejado para receber um orçamento"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titulo da OS *</label>
                    <Input
                      placeholder="Ex: Manutencao de bomba"
                      value={osFormData.title}
                      onChange={(e) => setOsFormData({ ...osFormData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Servico</label>
                    <Input
                      placeholder="Ex: Manutencao preventiva"
                      value={osFormData.serviceType}
                      onChange={(e) => setOsFormData({ ...osFormData, serviceType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descricao</label>
                    <Textarea
                      placeholder="Descreva o problema ou servico necessario..."
                      value={osFormData.description}
                      onChange={(e) => setOsFormData({ ...osFormData, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={osLoading}>
                    {osLoading ? "Criando..." : "Abrir OS"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
        {/* Abas de Documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Documentos</CardTitle>
            <CardDescription>
              Acesse e faca download dos seus documentos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
                <TabsTrigger value="vistoria" className="text-xs md:text-sm">Vistoria</TabsTrigger>
                <TabsTrigger value="visita" className="text-xs md:text-sm">Visita</TabsTrigger>
                <TabsTrigger value="nota_fiscal" className="text-xs md:text-sm">NF</TabsTrigger>
                <TabsTrigger value="servico" className="text-xs md:text-sm">Servico</TabsTrigger>
                <TabsTrigger value="rel_servico" className="text-xs md:text-sm">Rel. Serv</TabsTrigger>
                <TabsTrigger value="rel_visita" className="text-xs md:text-sm">Rel. Vis</TabsTrigger>
              </TabsList>

              <TabsContent value="vistoria" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar documentos de vistoria</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.vistoria}
                        onChange={(e) => handleTabSearch("vistoria", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("vistoria")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("vistoria")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("vistoria").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("vistoria").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="visita" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar documentos de visita</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.visita}
                        onChange={(e) => handleTabSearch("visita", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("visita")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("visita")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("visita").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("visita").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="nota_fiscal" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar notas fiscais</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.nota_fiscal}
                        onChange={(e) => handleTabSearch("nota_fiscal", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("nota_fiscal")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("nota_fiscal")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("nota_fiscal").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("nota_fiscal").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="servico" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar documentos de servico</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.servico}
                        onChange={(e) => handleTabSearch("servico", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("servico")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("servico")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("servico").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("servico").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rel_servico" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar relatorios de servico</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.rel_servico}
                        onChange={(e) => handleTabSearch("rel_servico", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("rel_servico")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("rel_servico")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("rel_servico").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("rel_servico").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rel_visita" className="space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <label className="text-sm font-medium">Buscar relatorios de visita</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Digite o nome do documento..."
                        value={tabSearches.rel_visita}
                        onChange={(e) => handleTabSearch("rel_visita", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTabFilter("rel_visita")}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => handleTabFilter("rel_visita")} className="bg-orange-500 hover:bg-orange-600">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {getTabDocuments("rel_visita").length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-2">Nenhum documento encontrado</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTabDocuments("rel_visita").map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
