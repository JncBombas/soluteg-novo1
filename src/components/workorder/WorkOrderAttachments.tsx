import { useState } from "react";
import { trpc } from "@/lib/trpc"; // 📞 Comunicação oficial com o Banco de Dados
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Trash2, ExternalLink, Loader2 } from "lucide-react"; // ✨ Ícones bonitos
import { toast } from "sonner"; // 🔔 Aquelas mensagens de aviso no canto da tela

// Define que este componente precisa receber o ID da Ordem de Serviço para funcionar
interface WorkOrderAttachmentsProps {
  workOrderId: number;
}

export default function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  // 📍 ESTADOS (Variáveis que o React "vigia" para atualizar a tela)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined); // Qual aba (Antes/Depois) está clicada
  const [isUploading, setIsUploading] = useState(false); // Avisa se o sistema está "trabalhando" no upload agora

  // 📡 BUSCA DE DADOS: Pede ao servidor a lista de fotos desta OS
  const { data: attachments, refetch } = trpc.workOrders.attachments.list.useQuery({
    workOrderId,
    category: selectedCategory as any,
  });

  // 💾 SALVAR NO BANCO: Comando para registrar o link da foto que veio do Cloudinary
  const createAttachmentMutation = trpc.workOrders.attachments.create.useMutation({
    onSuccess: () => {
      toast.success("Foto salva com sucesso na OS!");
      refetch(); // Atualiza a lista na tela para a foto nova aparecer
    },
  });

  // 🗑️ DELETAR: Comando para apagar um anexo
  const deleteAttachmentMutation = trpc.workOrders.attachments.delete.useMutation({
    onSuccess: () => {
      toast.success("Anexo removido com sucesso");
      refetch(); // Atualiza a lista para a foto sumir da tela
    },
    onError: (error) => {
      toast.error(`Erro ao remover anexo: ${error.message}`);
    },
  });

  // Função disparada ao clicar no ícone de lixeira
  const handleDeleteAttachment = (attachmentId: number) => {
    if (confirm("Tem certeza que deseja remover este anexo?")) {
      deleteAttachmentMutation.mutate({ id: attachmentId });
    }
  };

  // 🔥 FUNÇÃO PRINCIPAL: Faz o envio real do arquivo
  const handleFileUpload = async (category: string, files: FileList | null) => {
  // 🚧 CHECK DE SEGURANÇA: Se o técnico clicou mas não escolheu foto, para tudo.
  if (!files || files.length === 0) return;

  setIsUploading(true); // Trava o botão na tela (fica cinza) para não clicar duas vezes
  const toastId = toast.loading("Enviando foto para a nuvem...");

  try {
    const file = files[0]; // Pega o primeiro arquivo da lista
    const formData = new FormData(); // Cria um "envelope" vazio
    formData.append("file", file);   // Coloca a foto dentro do envelope

    // 1️⃣ ROTA DE FUGA: Envia o envelope para o nosso servidor na VPS
    // O fetch busca o endereço que criamos no backend/server/index.ts
    const response = await fetch("/api/work-orders/upload", {
      method: "POST",
      body: formData, // Envia o envelope com a imagem
    });

    // Se o servidor da VPS estiver fora ou der erro, avisa aqui
    if (!response.ok) throw new Error("Falha no servidor de upload");

    // O servidor responde com o link que o Cloudinary gerou
    const result = await response.json();

    // 2️⃣ REGISTRO NO BANCO DA JNC:
    // Se o upload para a nuvem deu certo (success), agora salvamos o rastro no banco
    if (result.success && result.url) {
      createAttachmentMutation.mutate({
        workOrderId, // ID da Ordem de Serviço (ex: OS 105)
        fileName: result.fileName || file.name, // Nome do arquivo (ex: bomba_queimada.jpg)
        fileUrl: result.url, // O link eterno da foto (https://cloudinary...)
        
        /** * 🔑 A CHAVE DO PROBLEMA (fileKey):
         * O banco de dados exige um "RG" para cada foto. 
         * Se o Cloudinary não mandar o public_id, geramos um ID único com a data atual.
         * Sem isso, o tRPC dá aquele erro de "expected string, received undefined".
         */
        fileKey: result.public_id || `key_${Date.now()}`, 
        
        fileType: file.type, // Tipo (image/jpeg, image/png, etc)
        fileSize: file.size, // Tamanho em bytes
        category: category as any, // Se é "Antes", "Depois", "Documento", etc.
      });
      
      toast.dismiss(toastId); // Tira a mensagem de "Enviando..." da tela
    }
  } catch (error) {
    // 🚨 LOG DE ERRO: Se a internet cair ou o Cloudinary rejeitar, cai aqui
    console.error("Erro no upload JNC:", error);
    toast.error("Erro ao subir imagem. Verifique a internet ou o tamanho do arquivo.");
    toast.dismiss(toastId);
  } finally {
    setIsUploading(false); // Destrava o botão para a próxima foto
  }
};

  // --- TRADUTORES (Transformam nomes técnicos em nomes para humanos) ---
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

  // Verifica se o arquivo é imagem para mostrar a miniatura ou um ícone de papel
  const isImage = (fileType?: string | null) => {
    if (!fileType) return false;
    return fileType.startsWith("image/");
  };

  // Transforma o tamanho do arquivo (bytes) em algo legível (KB ou MB)
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Anexos e Fotos</CardTitle>
        
        {/* BOTÃO DE UPLOAD: O "input type=file" fica invisível por cima do botão real */}
        <Button variant="outline" className="relative" disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> // Ícone girando
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isUploading ? "Subindo..." : "Enviar Arquivos"}
          
          <input
            type="file"
            accept="image/*,application/pdf" // Só aceita fotos e PDFs
            className="absolute inset-0 opacity-0 cursor-pointer" // Deixa o seletor invisível
            onChange={(e) => handleFileUpload(selectedCategory || "other", e.target.files)}
            disabled={isUploading}
          />
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* ABAS: Filtram as fotos por etapa do serviço */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 overflow-x-auto">
            <TabsTrigger value="all" onClick={() => setSelectedCategory(undefined)}>Todos</TabsTrigger>
            <TabsTrigger value="before" onClick={() => setSelectedCategory("before")}>Antes</TabsTrigger>
            <TabsTrigger value="during" onClick={() => setSelectedCategory("during")}>Durante</TabsTrigger>
            <TabsTrigger value="after" onClick={() => setSelectedCategory("after")}>Depois</TabsTrigger>
            <TabsTrigger value="document" onClick={() => setSelectedCategory("document")}>Docs</TabsTrigger>
            <TabsTrigger value="other" onClick={() => setSelectedCategory("other")}>Outros</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Se tiver fotos, mostra o grid. Se não, mostra o aviso de "Vazio" */}
            {attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    {/* MINIATURA: Mostra a foto ou ícone de arquivo */}
                    {isImage(attachment.fileType) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img src={attachment.fileUrl} alt={attachment.fileName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                        <FileText className="h-16 w-16 text-gray-400" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate flex-1">{attachment.fileName}</p>
                        <Badge className={getCategoryColor(attachment.category)}>
                          {getCategoryLabel(attachment.category)}
                        </Badge>
                      </div>

                      {/* RODAPÉ DO CARD: Tamanho e Data */}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <span>{new Date(attachment.uploadedAt).toLocaleDateString("pt-BR")}</span>
                      </div>

                      {/* BOTÕES DE AÇÃO: Abrir link ou Deletar */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-3 w-3" /> Abrir
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
                <p>Nenhuma foto da bomba ou do gerador ainda.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}