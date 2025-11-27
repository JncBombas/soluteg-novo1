import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Download, FileText, Trash2, Loader2, User } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  title: string;
  description?: string;
  documentType: "relatorio_servico" | "relatorio_visita" | "nota_fiscal" | "outro";
  fileUrl: string;
  uploadedAt: Date;
}

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("relatorio_servico");

  useEffect(() => {
    // Verificar se cliente está logado
    const token = localStorage.getItem("clientToken");
    const id = localStorage.getItem("clientId");
    const name = localStorage.getItem("clientName");

    if (!token || !id) {
      setLocation("/client/login");
      return;
    }

    setClientId(parseInt(id));
    setClientName(name || "Cliente");
    loadDocuments(parseInt(id));
  }, [setLocation]);

  const loadDocuments = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client-documents?clientId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("clientName");
    setLocation("/client/login");
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;

    try {
      const response = await fetch(`/api/client-documents/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(documents.filter((d) => d.id !== docId));
      }
    } catch (error) {
      console.error("Erro ao deletar documento:", error);
    }
  };

  const getDocumentsByType = (type: string) => {
    return documents.filter((d) => d.documentType === type);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteDocument(doc.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
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
            <Button
              variant="outline"
              onClick={() => setLocation("/client/profile")}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Perfil
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="relatorio_servico">
              Serviços
            </TabsTrigger>
            <TabsTrigger value="relatorio_visita">
              Visitas
            </TabsTrigger>
            <TabsTrigger value="nota_fiscal">
              Notas Fiscais
            </TabsTrigger>
          </TabsList>

          {["relatorio_servico", "relatorio_visita", "nota_fiscal"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {getTypeLabel(type)}
                </h2>
                {getDocumentsByType(type).length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600">
                        Nenhum documento disponível nesta categoria
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {getDocumentsByType(type).map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
