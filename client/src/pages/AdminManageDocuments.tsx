import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Trash2, Edit2, Download, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Document {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  description: string | null;
  documentType: "relatorio_servico" | "relatorio_visita" | "nota_fiscal" | "outro";
  fileUrl: string;
  createdAt: Date;
}

export default function AdminManageDocuments() {
  const [, setLocation] = useLocation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<"relatorio_servico" | "relatorio_visita" | "nota_fiscal" | "outro">("relatorio_servico");

  const adminId = localStorage.getItem("adminId");

  const { data: documentsData, isLoading, isError } = trpc.adminDocuments.list.useQuery(
    { adminId: adminId ? parseInt(adminId) : 0 },
    { enabled: !!adminId }
  );

  useEffect(() => {
    if (!adminId) {
      setLocation("/admin/login");
      return;
    }

    if (documentsData && Array.isArray(documentsData)) {
      setDocuments(documentsData);
      setFilteredDocuments(documentsData);
    }
  }, [adminId, setLocation, documentsData]);

  useEffect(() => {
    let filtered = documents;

    if (selectedClient) {
      filtered = filtered.filter((doc) => doc.clientId.toString() === selectedClient);
    }

    if (selectedType) {
      filtered = filtered.filter((doc) => doc.documentType === selectedType);
    }

    setFilteredDocuments(filtered);
  }, [selectedClient, selectedType, documents]);

  const deleteDocMutation = trpc.adminDocuments.delete.useMutation();
  const updateDocMutation = trpc.adminDocuments.update.useMutation();

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;

    try {
      await deleteDocMutation.mutateAsync({ id });
      setDocuments(documents.filter((doc) => doc.id !== id));
      alert("Documento deletado com sucesso!");
    } catch (err) {
      alert("Erro ao deletar documento");
      console.error(err);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
    setEditType(doc.documentType);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      await updateDocMutation.mutateAsync({
        id: editingId,
        title: editTitle,
        description: editDescription,
        documentType: editType,
      });

      setDocuments(
        documents.map((doc) =>
          doc.id === editingId
            ? { ...doc, title: editTitle, description: editDescription, documentType: editType }
            : doc
        )
      );
      setEditingId(null);
      alert("Documento atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar documento");
      console.error(err);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      relatorio_servico: "Relatório de Serviço",
      relatorio_visita: "Relatório de Visita",
      nota_fiscal: "Nota Fiscal",
      outro: "Outro",
    };
    return types[type] || type;
  };

  const uniqueClients = Array.from(
    new Map(documents.map((doc) => [doc.clientId, doc.clientName])).entries()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando documentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Documentos</h1>
        </div>

        {isError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">Erro ao carregar documentos</p>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos os clientes</option>
                  {uniqueClients.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos os tipos</option>
                  <option value="relatorio_servico">Relatório de Serviço</option>
                  <option value="relatorio_visita">Relatório de Visita</option>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Documentos */}
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">Nenhum documento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Cliente
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Título
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Tipo
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Data
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{doc.clientName}</td>
                        <td className="py-3 px-4">
                          {editingId === doc.id ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-gray-900">{doc.title}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingId === doc.id ? (
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as any)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="relatorio_servico">Relatório de Serviço</option>
                              <option value="relatorio_visita">Relatório de Visita</option>
                              <option value="nota_fiscal">Nota Fiscal</option>
                              <option value="outro">Outro</option>
                            </select>
                          ) : (
                            <span className="text-gray-600">
                              {getTypeLabel(doc.documentType)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {editingId === doc.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(doc)}
                                  className="gap-1"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(doc.fileUrl, "_blank")}
                                  className="gap-1"
                                >
                                  <Download className="w-4 h-4" />
                                  Baixar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(doc.id)}
                                  className="gap-1 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Deletar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
