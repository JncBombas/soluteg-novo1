import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileUp, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Client {
  id: number;
  name: string;
  email: string;
}

export default function AdminDocuments() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
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

          console.log("Enviando documento:", {
            clientId: parseInt(selectedClientId),
            adminId,
            title: formData.title,
            documentType: formData.documentType,
            month: formData.month,
            year: formData.year,
          });

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
            console.error("Erro na resposta:", data);
            throw new Error(data.message || "Erro ao fazer upload");
          }

          const result = await response.json();
          console.log("Upload bem-sucedido:", result);

          setSuccess("Documento enviado com sucesso!");
          setFormData({
            title: "",
            description: "",
            documentType: "vistoria",
            file: null,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          });
          setSelectedClientId("");
          setIsOpen(false);

          const fileInput = document.getElementById("file-input") as HTMLInputElement;
          if (fileInput) fileInput.value = "";

          setTimeout(() => {
            setSuccess("");
          }, 3000);
        } catch (err) {
          console.error("Erro no upload:", err);
          setError(err instanceof Error ? err.message : "Erro ao fazer upload");
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        console.error("Erro ao ler arquivo");
        setError("Erro ao ler o arquivo");
        setUploading(false);
      };

      reader.readAsDataURL(formData.file);
    } catch (err) {
      console.error("Erro geral:", err);
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      setUploading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vistoria: "Vistoria",
      visita: "Relatório de Visita",
      nota_fiscal: "Nota Fiscal",
      servico: "Relatório de Serviço",
      outro: "Outro",
    };
    return labels[type] || type;
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
    <div className="space-y-6">
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
                <Select value={formData.documentType} onValueChange={(value) => setFormData({ ...formData, documentType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <Select value={formData.month.toString()} onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janeiro</SelectItem>
                      <SelectItem value="2">Fevereiro</SelectItem>
                      <SelectItem value="3">Março</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Maio</SelectItem>
                      <SelectItem value="6">Junho</SelectItem>
                      <SelectItem value="7">Julho</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano de Referência</label>
                  <Select value={formData.year.toString()} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo PDF</label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                  onChange={handleFileChange}
                  required
                  disabled={uploading}
                />
                {formData.file && (
                  <p className="text-sm text-slate-600">
                    Arquivo: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Documento
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clientes Disponíveis</CardTitle>
          <CardDescription>
            Total de {clients.length} cliente{clients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <FileUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum cliente cadastrado</p>
              <p className="text-sm text-slate-500">Crie clientes na seção de Gerenciamento de Clientes</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between py-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{client.name}</h3>
                      <p className="text-sm text-slate-500">{client.email}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                    title="Enviar Documento"
                    onClick={() => {
                      setSelectedClientId(client.id.toString());
                      setIsOpen(true);
                    }}
                  >
                    <FileUp className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
