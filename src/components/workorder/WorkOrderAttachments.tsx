import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Trash2, Download, ExternalLink, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface WorkOrderAttachmentsProps {
  workOrderId: number;
}

export default function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");

  const { data: attachments, refetch } = trpc.workOrders.attachments.list.useQuery({
    workOrderId,
    category: selectedCategory as any,
  });

  const deleteAttachmentMutation = trpc.workOrders.attachments.delete.useMutation({
    onSuccess: () => {
      toast.success("Anexo removido com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover anexo: ${error.message}`);
    },
  });

  const updateAttachmentMutation = trpc.workOrders.attachments.update.useMutation({
    onSuccess: () => {
      toast.success("Legenda atualizada com sucesso");
      refetch();
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar legenda: ${error.message}`);
    },
  });

  const handleDeleteAttachment = (attachmentId: number) => {
    if (confirm("Tem certeza que deseja remover este anexo?")) {
      deleteAttachmentMutation.mutate({ id: attachmentId });
    }
  };

  const handleEditCaption = (attachmentId: number, currentDescription: string) => {
    setEditingId(attachmentId);
    setEditDescription(currentDescription || "");
  };

  const handleSaveCaption = (attachmentId: number) => {
    updateAttachmentMutation.mutate({
      id: attachmentId,
      description: editDescription,
    });
  };

  const handleFileUpload = async (category: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    // TODO: Implementar upload para S3
    toast.info("Upload de arquivos será implementado na próxima fase");
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      before: "Antes",
      during: "Durante",
      after: "Depois",
      document: "Documentos",
      other: "Outros",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      before: "bg-blue-100 text-blue-800",
      during: "bg-yellow-100 text-yellow-800",
      after: "bg-green-100 text-green-800",
      document: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const isImage = (fileType?: string | null) => {
    if (!fileType) return false;
    return fileType.startsWith("image/");
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anexos e Fotos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" onClick={() => setSelectedCategory(undefined)}>
              Todos
            </TabsTrigger>
            <TabsTrigger value="before" onClick={() => setSelectedCategory("before")}>
              Antes
            </TabsTrigger>
            <TabsTrigger value="during" onClick={() => setSelectedCategory("during")}>
              Durante
            </TabsTrigger>
            <TabsTrigger value="after" onClick={() => setSelectedCategory("after")}>
              Depois
            </TabsTrigger>
            <TabsTrigger value="document" onClick={() => setSelectedCategory("document")}>
              Docs
            </TabsTrigger>
            <TabsTrigger value="other" onClick={() => setSelectedCategory("other")}>
              Outros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" className="relative">
                <Upload className="mr-2 h-4 w-4" />
                Upload de Arquivo
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleFileUpload("other", e.target.files)}
                />
              </Button>
            </div>

            {attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                  >
                    {isImage(attachment.fileType) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                        <FileText className="h-16 w-16 text-gray-400" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate flex-1">
                          {attachment.fileName}
                        </p>
                        <Badge className={getCategoryColor(attachment.category)}>
                          {getCategoryLabel(attachment.category)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <span>
                          {new Date(attachment.uploadedAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      {/* SEÇÃO DE LEGENDA - NOVA! */}
                      {editingId === attachment.id ? (
                        <div className="space-y-2 bg-blue-50 p-3 rounded">
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Adicione uma legenda para esta foto..."
                            className="w-full p-2 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveCaption(attachment.id)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1"
                              disabled={updateAttachmentMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1"
                            >
                              <X className="h-4 w-4" />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-700 mb-2">
                            <span className="font-semibold">Legenda:</span>{" "}
                            {attachment.description || <span className="italic text-gray-500">Sem legenda</span>}
                          </p>
                          <button
                            onClick={() => handleEditCaption(attachment.id, attachment.description || "")}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                          >
                            <Edit2 className="h-3 w-3" />
                            Editar legenda
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum anexo adicionado ainda</p>
                <p className="text-sm mt-1">
                  Faça upload de fotos e documentos relacionados a esta OS
                </p>
              </div>
            )}
          </TabsContent>

          {/* Outros tabs terão o mesmo conteúdo filtrado */}
          <TabsContent value="before">
            <p className="text-sm text-muted-foreground mb-4">
              Fotos e documentos do estado inicial antes do serviço
            </p>
          </TabsContent>

          <TabsContent value="during">
            <p className="text-sm text-muted-foreground mb-4">
              Fotos e documentos durante a execução do serviço
            </p>
          </TabsContent>

          <TabsContent value="after">
            <p className="text-sm text-muted-foreground mb-4">
              Fotos e documentos do resultado final após o serviço
            </p>
          </TabsContent>

          <TabsContent value="document">
            <p className="text-sm text-muted-foreground mb-4">
              Documentos técnicos, manuais, especificações
            </p>
          </TabsContent>

          <TabsContent value="other">
            <p className="text-sm text-muted-foreground mb-4">
              Outros arquivos relacionados à OS
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}