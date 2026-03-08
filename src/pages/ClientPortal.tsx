import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, FileText, Loader2, Search, Filter, AlertCircle, FileQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: string;
  fileUrl: string;
  uploadedAt: Date;
}

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("all");
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [osType, setOsType] = useState<"emergencial" | "orcamento">("emergencial");
  const [osFormData, setOsFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    priority: "normal" as "critica" | "alta" | "normal",
  });
  const [osLoading, setOsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("vistoria");
  const [tabSearches, setTabSearches] = useState<Record<string, string>>({
    vistoria: "",
    visita: "",
    nota_fiscal: "",
    servico: "",
  });

  useEffect(() => {
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

  const { data: documents = [], isLoading } = trpc.documents.list.useQuery(
    {
      clientId: clientId || 0,
      search: activeSearch || undefined,
      documentType: activeTypeFilter !== "all" ? (activeTypeFilter as any) : undefined,
    },
    { enabled: !!clientId }
  );

  const handleTabSearch = (tabName: string, value: string) => {
    setTabSearches({ ...tabSearches, [tabName]: value });
  };

  const handleTabFilter = (tabName: string) => {
    setActiveSearch(tabSearches[tabName]);
  };

  const getTabDocuments = (tabType: string) => {
    const search = tabSearches[tabType];
    const typeMap: Record<string, string[]> = {
      vistoria: ["vistoria"],
      visita: ["visita", "relatorio_visita"],
      nota_fiscal: ["nota_fiscal"],
      servico: ["servico", "relatorio_servico"]
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

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osFormData.title.trim()) {
      toast.error("Titulo da OS é obrigatório");
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
          priority: osFormData.priority,
        }),
      });

      if (!response.ok) throw new Error("Erro ao criar OS");

      toast.success("Solicitação enviada com sucesso!");
      setOsFormData({ title: "", description: "", serviceType: "", priority: "normal" });
      setIsOpenDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao criar OS");
    } finally {
      setOsLoading(false);
    }
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
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{doc.description}</p>
            )}
            <p className="text-xs text-slate-500">
              {new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.open(doc.fileUrl, "_blank")}>
            <Download className="w-4 h-4 mr-1" /> Baixar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portal do Cliente</h1>
            <p className="text-slate-600">Bem-vindo, {clientName}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setOsType("emergencial"); setIsOpenDialogOpen(true); }} className="bg-red-500 hover:bg-red-600" size="sm">
              <AlertCircle className="w-4 h-4 mr-1" /> Atendimento
            </Button>
            <Button onClick={() => { setOsType("orcamento"); setIsOpenDialogOpen(true); }} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <FileQuestion className="w-4 h-4 mr-1" /> Orçamento
            </Button>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{osType === "emergencial" ? "Solicitar Atendimento" : "Solicitar Orçamento"}</DialogTitle>
            <DialogDescription>Preencha os dados abaixo para sua solicitação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkOrder} className="space-y-4">
            <Input placeholder="Título da OS" value={osFormData.title} onChange={(e) => setOsFormData({ ...osFormData, title: e.target.value })} required />
            <Input placeholder="Tipo de Serviço" value={osFormData.serviceType} onChange={(e) => setOsFormData({ ...osFormData, serviceType: e.target.value })} />
            <Select value={osFormData.priority} onValueChange={(value: any) => setOsFormData({ ...osFormData, priority: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Descrição..." value={osFormData.description} onChange={(e) => setOsFormData({ ...osFormData, description: e.target.value })} rows={4} />
            <Button type="submit" className="w-full bg-orange-500" disabled={osLoading}>{osLoading ? "Enviando..." : "Enviar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Seus Documentos</CardTitle>
            <CardDescription>Acesse seus documentos por categoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="vistoria">Vistoria</TabsTrigger>
                <TabsTrigger value="visita">Visita</TabsTrigger>
                <TabsTrigger value="nota_fiscal">NF</TabsTrigger>
                <TabsTrigger value="servico">Serviço</TabsTrigger>
              </TabsList>

              {["vistoria", "visita", "nota_fiscal", "servico"].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  <div className="flex gap-2 bg-slate-50 p-4 rounded-lg">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        className="pl-10" 
                        placeholder="Buscar..." 
                        value={tabSearches[tab]} 
                        onChange={(e) => handleTabSearch(tab, e.target.value)}
                      />
                    </div>
                    <Button onClick={() => handleTabFilter(tab)} className="bg-orange-500">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    {getTabDocuments(tab).length > 0 ? (
                      getTabDocuments(tab).map(doc => <DocumentCard key={doc.id} doc={doc} />)
                    ) : (
                      <p className="text-center py-10 text-slate-500">Nenhum documento encontrado.</p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
