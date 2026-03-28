import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LogOut, Download, FileText, Loader2, Search, AlertCircle,
  FileQuestion, Calendar, Droplet, ChevronDown, ClipboardList,
  Home, FolderOpen, Activity, User, ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Page = "home" | "documents";

interface Document {
  id: number;
  title: string;
  description?: string | null;
  documentType: string;
  fileUrl: string;
  uploadedAt: Date;
  month?: number | null;
  year?: number | null;
}

interface GroupedDocuments {
  [key: string]: Document[];
}

const MONTH_NAMES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES_FULL = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  aguardando_aprovacao: "Ag. Aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  aguardando_pagamento: "Ag. Pagamento",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-800",
  aguardando_aprovacao: "bg-yellow-100 text-yellow-800",
  aprovada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
  em_andamento: "bg-purple-100 text-purple-800",
  concluida: "bg-green-200 text-green-900",
  aguardando_pagamento: "bg-orange-100 text-orange-800",
  cancelada: "bg-gray-100 text-gray-800",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ClientPortal() {
  const [activePage, setActivePage] = useState<Page>("home");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [activeTab, setActiveTab] = useState("vistoria");

  // Dialog state
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [osType, setOsType] = useState<"emergencial" | "orcamento">("emergencial");
  const [osFormData, setOsFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    priority: "normal" as "critica" | "alta" | "normal",
  });
  const [osLoading, setOsLoading] = useState(false);

  // Per-tab search and month/year filters
  const [tabSearches, setTabSearches] = useState<Record<string, string>>({
    vistoria: "", visita: "", nota_fiscal: "", servico: "", orcamentos: "",
  });
  const [tabMonths, setTabMonths] = useState<Record<string, string>>({
    vistoria: "all", visita: "all", nota_fiscal: "all", servico: "all", orcamentos: "all",
  });
  const [tabYears, setTabYears] = useState<Record<string, string>>({
    vistoria: "all", visita: "all", nota_fiscal: "all", servico: "all", orcamentos: "all",
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
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const { data: sharedWorkOrders = [] } = trpc.workOrders.getSharedForPortal.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const exportPDFMutation = trpc.workOrders.exportPDF.useMutation({
    onSuccess: (data: any) => {
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso!");
    },
    onError: () => toast.error("Erro ao baixar PDF"),
  });

  // Available years derived from documents
  const availableYears = (() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    (documents as any[]).forEach((doc: any) => {
      const y = doc.year || new Date(doc.uploadedAt).getFullYear();
      yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  })();

  const getTabDocuments = (tabType: string) => {
    const search = tabSearches[tabType] || "";
    const month = tabMonths[tabType] || "all";
    const year = tabYears[tabType] || "all";

    const typeMap: Record<string, string[]> = {
      vistoria: ["vistoria"],
      visita: ["visita", "relatorio_visita", "rel_visita"],
      nota_fiscal: ["nota_fiscal", "nf"],
      servico: ["servico", "relatorio_servico", "rel_servico"],
    };

    const allowedTypes = typeMap[tabType] || [];

    return (documents as any[]).filter((doc: any) => {
      const matchesType = allowedTypes.includes(doc.documentType);
      const matchesSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase());
      const docYear = doc.year || new Date(doc.uploadedAt).getFullYear();
      const docMonth = doc.month || new Date(doc.uploadedAt).getMonth() + 1;
      const matchesYear = year === "all" || docYear === parseInt(year);
      const matchesMonth = month === "all" || docMonth === parseInt(month);
      return matchesType && matchesSearch && matchesYear && matchesMonth;
    });
  };

  const groupDocumentsByPeriod = (docs: Document[]): GroupedDocuments => {
    const grouped: GroupedDocuments = {};
    docs.forEach((doc) => {
      const y = doc.year || new Date(doc.uploadedAt).getFullYear();
      const m = doc.month || new Date(doc.uploadedAt).getMonth() + 1;
      const key = `${MONTH_NAMES[m]} ${y}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(doc);
    });
    return grouped;
  };

  const sortedPeriods = (grouped: GroupedDocuments): string[] => {
    return Object.keys(grouped).sort((a, b) => {
      const parse = (str: string) => {
        const [month, year] = str.split(" ");
        const monthMap: Record<string, number> = {
          Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
          Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
        };
        return new Date(parseInt(year), (monthMap[month] || 1) - 1);
      };
      return parse(b).getTime() - parse(a).getTime();
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
    if (!osFormData.title.trim()) { toast.error("Título da OS é obrigatório"); return; }
    setOsLoading(true);
    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId, type: osType, title: osFormData.title,
          description: osFormData.description, serviceType: osFormData.serviceType,
          priority: osFormData.priority,
        }),
      });
      if (!response.ok) throw new Error("Erro ao criar OS");
      toast.success("Solicitação enviada com sucesso!");
      setOsFormData({ title: "", description: "", serviceType: "", priority: "normal" });
      setIsOpenDialogOpen(false);
    } catch {
      toast.error("Erro ao criar OS");
    } finally {
      setOsLoading(false);
    }
  };

  // ─── Sub-components ─────────────────────────────────────────────────────────

  const WorkOrderCard = ({ wo }: { wo: typeof sharedWorkOrders[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <ClipboardList className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <span className="font-mono text-xs text-slate-500">{wo.osNumber}</span>
              <Badge className={`text-xs px-1.5 py-0 ${STATUS_COLOR[wo.status] || "bg-gray-100 text-gray-800"}`}>
                {STATUS_LABEL[wo.status] || wo.status}
              </Badge>
            </div>
            <p className="font-semibold text-sm truncate">{wo.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {wo.scheduledDate
                ? new Date(wo.scheduledDate).toLocaleDateString("pt-BR")
                : new Date(wo.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 flex-shrink-0"
            onClick={() => exportPDFMutation.mutate({ id: wo.id })}
            disabled={exportPDFMutation.isPending}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <p className="font-semibold text-sm truncate">{doc.title}</p>
            </div>
            {doc.description && (
              <p className="text-xs text-slate-500 line-clamp-1">{doc.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 flex-shrink-0"
            onClick={() => window.open(doc.fileUrl, "_blank")}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TabFilterBar = ({ tabKey }: { tabKey: string }) => (
    <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9 h-9"
          placeholder="Buscar..."
          value={tabSearches[tabKey] || ""}
          onChange={(e) => setTabSearches({ ...tabSearches, [tabKey]: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={tabMonths[tabKey] || "all"}
          onValueChange={(v) => setTabMonths({ ...tabMonths, [tabKey]: v })}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MONTH_NAMES_FULL.slice(1).map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tabYears[tabKey] || "all"}
          onValueChange={(v) => setTabYears({ ...tabYears, [tabKey]: v })}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const recentDocs = [...(documents as any[])]
    .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 4);

  const recentWorkOrders = [...(sharedWorkOrders as any[])].slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      {/* ── Header ── */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {getInitials(clientName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 leading-none">Olá,</p>
              <p className="font-semibold text-sm leading-tight truncate max-w-[160px]">{clientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 h-8 px-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Page: Home ── */}
      {activePage === "home" && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

          {/* Profile card */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {getInitials(clientName)}
                </div>
                <div>
                  <p className="text-orange-100 text-sm">Portal do Cliente</p>
                  <h2 className="text-xl font-bold leading-tight">{clientName}</h2>
                  <p className="text-orange-100 text-xs mt-1">JNC Elétrica &amp; Bombas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Solicitar</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setOsType("emergencial"); setIsOpenDialogOpen(true); }}
                className="flex flex-col items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-4 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-red-700 text-sm">Atendimento</p>
                  <p className="text-xs text-red-500">Emergencial</p>
                </div>
              </button>
              <button
                onClick={() => { setOsType("orcamento"); setIsOpenDialogOpen(true); }}
                className="flex flex-col items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-4 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <FileQuestion className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-orange-700 text-sm">Orçamento</p>
                  <p className="text-xs text-orange-500">Solicitar cotação</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick access */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Acesso Rápido</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActivePage("documents")}
                className="w-full flex items-center gap-3 bg-white rounded-xl p-4 border hover:border-orange-300 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Meus Documentos</p>
                  <p className="text-xs text-slate-500">{documents.length} documento{documents.length !== 1 ? "s" : ""} disponíveis</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => window.location.href = "/client/water-tank"}
                className="w-full flex items-center gap-3 bg-white rounded-xl p-4 border hover:border-orange-300 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Droplet className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Monitoramento</p>
                  <p className="text-xs text-slate-500">Controle de reservatórios</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Recent work orders */}
          {recentWorkOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">OS Recentes</h3>
                <button onClick={() => { setActivePage("documents"); setActiveTab("orcamentos"); }} className="text-xs text-orange-500 font-medium">
                  Ver todas
                </button>
              </div>
              <div className="space-y-2">
                {recentWorkOrders.map((wo) => <WorkOrderCard key={wo.id} wo={wo} />)}
              </div>
            </div>
          )}

          {/* Recent documents */}
          {recentDocs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Docs. Recentes</h3>
                <button onClick={() => setActivePage("documents")} className="text-xs text-orange-500 font-medium">
                  Ver todos
                </button>
              </div>
              <div className="space-y-2">
                {recentDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
              </div>
            </div>
          )}

          {recentDocs.length === 0 && recentWorkOrders.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum documento disponível ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Page: Documents ── */}
      {activePage === "documents" && (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h2 className="text-lg font-bold mb-4">Meus Documentos</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-4 px-4">
              <TabsList className="inline-flex w-auto min-w-full mb-4 h-9">
                <TabsTrigger value="vistoria" className="text-xs px-3">Vistoria</TabsTrigger>
                <TabsTrigger value="visita" className="text-xs px-3">Visita</TabsTrigger>
                <TabsTrigger value="nota_fiscal" className="text-xs px-3">NF</TabsTrigger>
                <TabsTrigger value="servico" className="text-xs px-3">Serviço</TabsTrigger>
                <TabsTrigger value="orcamentos" className="text-xs px-3">Orçamentos</TabsTrigger>
              </TabsList>
            </div>

            {/* Orcamentos tab */}
            <TabsContent value="orcamentos" className="space-y-3 mt-0">
              <TabFilterBar tabKey="orcamentos" />
              <div className="space-y-2">
                {(sharedWorkOrders as any[])
                  .filter((wo: any) => wo.portalTab === "orcamentos")
                  .filter((wo: any) =>
                    !tabSearches["orcamentos"] ||
                    wo.title.toLowerCase().includes(tabSearches["orcamentos"].toLowerCase()) ||
                    wo.osNumber.toLowerCase().includes(tabSearches["orcamentos"].toLowerCase())
                  )
                  .length > 0 ? (
                  (sharedWorkOrders as any[])
                    .filter((wo: any) => wo.portalTab === "orcamentos")
                    .filter((wo: any) =>
                      !tabSearches["orcamentos"] ||
                      wo.title.toLowerCase().includes(tabSearches["orcamentos"].toLowerCase()) ||
                      wo.osNumber.toLowerCase().includes(tabSearches["orcamentos"].toLowerCase())
                    )
                    .map((wo: any) => <WorkOrderCard key={wo.id} wo={wo} />)
                ) : (
                  <p className="text-center py-10 text-slate-400 text-sm">Nenhum orçamento disponível.</p>
                )}
              </div>
            </TabsContent>

            {/* Document tabs */}
            {(["vistoria", "visita", "nota_fiscal", "servico"] as const).map((tab) => {
              const tabDocs = getTabDocuments(tab);
              const grouped = groupDocumentsByPeriod(tabDocs);
              const periods = sortedPeriods(grouped);
              const tabWorkOrders = (sharedWorkOrders as any[]).filter((wo: any) => wo.portalTab === tab);

              return (
                <TabsContent key={tab} value={tab} className="space-y-3 mt-0">
                  <TabFilterBar tabKey={tab} />

                  <div className="space-y-2">
                    {/* Shared work orders for this tab */}
                    {tabWorkOrders.map((wo) => (
                      <WorkOrderCard key={`wo-${wo.id}`} wo={wo} />
                    ))}

                    {/* Grouped documents */}
                    {periods.length > 0 ? (
                      periods.map((period) => (
                        <Collapsible key={period} defaultOpen={true}>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                            <ChevronDown className="w-4 h-4 transition-transform flex-shrink-0" />
                            <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="font-semibold text-sm text-slate-900">{period}</span>
                            <span className="ml-auto text-xs text-slate-500">
                              {grouped[period].length} doc{grouped[period].length !== 1 ? "s" : ""}
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2 pl-4 space-y-2">
                            {grouped[period].map((doc) => (
                              <DocumentCard key={doc.id} doc={doc} />
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    ) : tabWorkOrders.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 text-sm">Nenhum documento encontrado.</p>
                    ) : null}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActivePage("home")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activePage === "home" ? "text-orange-500" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Home className={`w-5 h-5 ${activePage === "home" ? "text-orange-500" : ""}`} />
            <span>Início</span>
          </button>
          <button
            onClick={() => setActivePage("documents")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              activePage === "documents" ? "text-orange-500" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FolderOpen className={`w-5 h-5 ${activePage === "documents" ? "text-orange-500" : ""}`} />
            <span>Documentos</span>
          </button>
          <button
            onClick={() => window.location.href = "/client/water-tank"}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span>Monitoramento</span>
          </button>
        </div>
      </nav>

      {/* ── Dialog: Create Work Order ── */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>
              {osType === "emergencial" ? "Solicitar Atendimento" : "Solicitar Orçamento"}
            </DialogTitle>
            <DialogDescription>Preencha os dados abaixo para sua solicitação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkOrder} className="space-y-3">
            <Input
              placeholder="Título *"
              value={osFormData.title}
              onChange={(e) => setOsFormData({ ...osFormData, title: e.target.value })}
              required
            />
            <Input
              placeholder="Tipo de serviço"
              value={osFormData.serviceType}
              onChange={(e) => setOsFormData({ ...osFormData, serviceType: e.target.value })}
            />
            <Select
              value={osFormData.priority}
              onValueChange={(value: any) => setOsFormData({ ...osFormData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Prioridade Normal</SelectItem>
                <SelectItem value="alta">Prioridade Alta</SelectItem>
                <SelectItem value="critica">Prioridade Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Descrição..."
              value={osFormData.description}
              onChange={(e) => setOsFormData({ ...osFormData, description: e.target.value })}
              rows={3}
            />
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={osLoading}>
              {osLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar Solicitação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
