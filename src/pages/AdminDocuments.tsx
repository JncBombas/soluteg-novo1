import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronRight, FileText, Download, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Document {
  id: number;
  title: string;
  description?: string;
  documentType: string;
  month: number;
  year: number;
  fileName: string;
  mimeType: string;
  createdAt: string;
  fileUrl?: string;
}

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DOC_TYPE_LABELS: Record<string, string> = {
  vistoria: "Vistoria",
  visita: "Relatório de Visita",
  nota_fiscal: "Nota Fiscal",
  servico: "Relatório de Serviço",
  outro: "Outro",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  vistoria: "bg-blue-100 text-blue-700",
  visita: "bg-purple-100 text-purple-700",
  nota_fiscal: "bg-green-100 text-green-700",
  servico: "bg-yellow-100 text-yellow-700",
  outro: "bg-slate-100 text-slate-700",
};

export default function AdminDocuments() {
  const [, navigate] = useLocation();
  const [adminId, setAdminId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [clientDocuments, setClientDocuments] = useState<Record<number, Document[]>>({});
  const [loadingDocs, setLoadingDocs] = useState<Record<number, boolean>>({});
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    documentType: "vistoria",
    file: null as File | null,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) {
      setAdminId(parseInt(id));
      loadClients(parseInt(id));
    }
  }, []);

  const loadClients = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clients?adminId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setError("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const loadClientDocuments = async (clientId: number) => {
    if (clientDocuments[clientId]) return; // already loaded
    try {
      setLoadingDocs((prev) => ({ ...prev, [clientId]: true }));
      const response = await fetch(`/api/admin-documents?clientId=${clientId}&adminId=${adminId}`);
      if (response.ok) {
        const data = await response.json();
        setClientDocuments((prev) => ({ ...prev, [clientId]: data }));
      } else {
        setClientDocuments((prev) => ({ ...prev, [clientId]: [] }));
      }
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      setClientDocuments((prev) => ({ ...prev, [clientId]: [] }));
    } finally {
      setLoadingDocs((prev) => ({ ...prev, [clientId]: false }));
    }
  };

  const handleToggleClient = (clientId: number) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
    } else {
      setExpandedClientId(clientId);
      loadClientDocuments(clientId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!adminId || !selectedClientId || !formData.file || !formData.title) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setUploading(true);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileBase64 = event.target?.result as string;
          const base64Data = fileBase64.split(",")[1];
          const file = formData.file!;

          const response = await fetch("/api/admin-documents/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: parseInt(selectedClientId),
              adminId,
              title: formData.title,
              description: formData.description,
              documentType: formData.documentType,
              month: formData.month,
              year: formData.year,
              fileBase64: base64Data,
              fileName: file.name,
              mimeType: file.type,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Erro ao fazer upload");
          }

          const result = await response.json();

          setSuccess("Documento enviado com sucesso!");
          setFormData({
            title: "",
            description: "",
            documentType: "vistoria",
            file: null,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          });

          const clientId = parseInt(selectedClientId);

          // Refresh documents for that client
          setClientDocuments((prev) => {
            const updated = { ...prev };
            delete updated[clientId];
            return updated;
          });

          // If client is expanded, reload its docs
          if (expandedClientId === clientId) {
            loadClientDocuments(clientId);
          }

          setSelectedClientId("");
          setIsOpen(false);

          const fileInput = document.getElementById("file-input") as HTMLInputElement;
          if (fileInput) fileInput.value = "";

          setTimeout(() => setSuccess(""), 4000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao fazer upload");
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Erro ao ler o arquivo");
        setUploading(false);
      };

      reader.readAsDataURL(formData.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="w-8 h-8 text-orange-500" />
            Enviar Documentos
          </h1>
          <p className="text-slate-600 mt-1">
            Faça upload de relatórios, notas fiscais e outros documentos para seus clientes
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Upload className="w-4 h-4" />
              Enviar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                Selecione um cliente e faça upload do documento
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Documento</label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vistoria">Vistoria</SelectItem>
                    <SelectItem value="visita">Relatório de Visita</SelectItem>
                    <SelectItem value="servico">Relatório de Serviço</SelectItem>
                    <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Título do Documento</label>
                <Input
                  placeholder="Ex: Manutenção Bomba - Dezembro 2024"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Input
                  placeholder="Detalhes adicionais sobre o documento"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mês de Referência</label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.slice(1).map((name, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano de Referência</label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo</label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                  onChange={handleFileChange}
                  required
                  disabled={uploading}
                />
                {formData.file && (
                  <p className="text-sm text-slate-500">
                    {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Enviar Documento</>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success toast */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Clients list */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Clique em um cliente para ver os documentos enviados a ele
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <FileUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum cliente cadastrado</p>
              <p className="text-sm text-slate-500">Crie clientes na seção de Gerenciamento de Clientes</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                const docs = clientDocuments[client.id] ?? [];
                const isLoadingDocs = loadingDocs[client.id];

                return (
                  <div key={client.id}>
                    {/* Client row */}
                    <div
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleToggleClient(client.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{client.name}</h3>
                          <p className="text-sm text-slate-500">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 gap-1"
                          title="Enviar Documento"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id.toString());
                            setIsOpen(true);
                          }}
                        >
                          <FileUp className="w-4 h-4" />
                          Enviar
                        </Button>
                        {isExpanded
                          ? <ChevronDown className="w-5 h-5 text-slate-400" />
                          : <ChevronRight className="w-5 h-5 text-slate-400" />
                        }
                      </div>
                    </div>

                    {/* Documents panel */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                        {isLoadingDocs ? (
                          <div className="flex items-center gap-2 py-4 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Carregando documentos...</span>
                          </div>
                        ) : docs.length === 0 ? (
                          <div className="text-center py-6">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Nenhum documento enviado para este cliente ainda.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                              onClick={() => {
                                setSelectedClientId(client.id.toString());
                                setIsOpen(true);
                              }}
                            >
                              <Upload className="w-3 h-3" />
                              Enviar primeiro documento
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                              {docs.length} documento{docs.length !== 1 ? "s" : ""}
                            </p>
                            {docs.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3 hover:border-orange-200 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOC_TYPE_COLORS[doc.documentType] ?? DOC_TYPE_COLORS.outro}`}>
                                        {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {MONTH_NAMES[doc.month]}/{doc.year}
                                      </span>
                                      {doc.description && (
                                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                          · {doc.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {doc.fileUrl && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="w-8 h-8 text-slate-400 hover:text-blue-600"
                                        title="Visualizar"
                                        onClick={() => window.open(doc.fileUrl, "_blank")}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="w-8 h-8 text-slate-400 hover:text-green-600"
                                        title="Baixar"
                                        onClick={() => {
                                          const a = document.createElement("a");
                                          a.href = doc.fileUrl!;
                                          a.download = doc.fileName;
                                          a.click();
                                        }}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
    </DashboardLayout>
  );
}
