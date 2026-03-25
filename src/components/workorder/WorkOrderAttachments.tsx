import { useState } from "react";
import { trpc } from "@/lib/trpc"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; 
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  CheckCircle2 
} from "lucide-react"; 
import { toast } from "sonner"; 

// --- CONFIGURAÇÃO INICIAL ---
// Dizemos ao sistema: "Para mostrar as fotos, preciso saber o número da Ordem de Serviço (ID)".
interface WorkOrderAttachmentsProps {
  workOrderId: number;
}

export default function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  
  // --- QUADRO DE AVISOS (ESTADOS) ---
  // O React usa isso para saber o que está acontecendo na tela agora.
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined); // Qual aba (Antes/Depois) está clicada?
  const [isUploading, setIsUploading] = useState(false); // O sistema está "trabalhando" no upload agora?
  const [uploadProgress, setUploadProgress] = useState(0); // Qual a porcentagem (0 a 100) do envio?
  const [editingId, setEditingId] = useState<number | null>(null); // Qual foto o usuário clicou para escrever a legenda?
  const [tempDescription, setTempDescription] = useState(""); // O que está sendo digitado na legenda antes de salvar?

  // --- CONVERSA COM O BANCO DE DADOS (tRPC) ---
  
  // 1. Pede a lista de fotos que já estão salvas para essa OS.
  const { data: attachments, refetch } = trpc.workOrders.attachments.list.useQuery({
    workOrderId,
    category: selectedCategory as any,
  });

  // 2. Comando para avisar o banco: "Ei, acabei de subir uma foto nova, anote o link aí!"
  const createAttachmentMutation = trpc.workOrders.attachments.create.useMutation({
    onSuccess: () => refetch(), // Se deu certo, atualiza a lista na tela sozinho.
  });

  // 3. Comando para trocar o texto da legenda de uma foto que já existe.
  const updateAttachmentMutation = trpc.workOrders.attachments.update.useMutation({
    onSuccess: () => {
      toast.success("Legenda salva!");
      setEditingId(null); // Fecha a caixinha de digitar.
      refetch(); // Atualiza o texto na tela.
    },
  });

  // 4. Comando para apagar uma foto do sistema.
  const deleteAttachmentMutation = trpc.workOrders.attachments.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto removida!");
      refetch();
    },
  });

  // --- MOTOR DE ENVIO (LÓGICA DO UPLOAD) ---
  const handleFileUpload = async (category: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true); // Liga o ícone de "carregando".
    setUploadProgress(10); // Começa a barra em 10% para o usuário ver que iniciou.
    const toastId = toast.loading("Enviando arquivos...");

    try {
      // Cria um "pacote" com todas as fotos selecionadas.
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      // Cria um "mensageiro" (XHR) que consegue dizer quantos % do caminho ele já percorreu.
      const xhr = new XMLHttpRequest();
      const promise = new Promise((resolve, reject) => {
        // Enquanto o arquivo viaja pela internet, atualizamos a barra de progresso.
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const porcentagem = Math.round((e.loaded / e.total) * 95); // Vai até 95%.
            setUploadProgress(porcentagem);
          }
        });
        // Quando o servidor avisar que recebeu tudo com sucesso.
        xhr.addEventListener("load", () => resolve(JSON.parse(xhr.responseText)));
        xhr.addEventListener("error", () => reject());
        
        xhr.open("POST", "/api/work-orders/upload"); // Caminho da "estrada" até o servidor.
        xhr.send(formData); // Envia o pacote.
      });

      const result: any = await promise; // Espera o mensageiro voltar com os links das fotos.

      if (result.urls) {
        // Para cada link que voltou, criamos um registro "oficial" no banco de dados.
        for (const [index, urlData] of result.urls.entries()) {
          createAttachmentMutation.mutate({
            workOrderId,
            fileName: files[index].name,
            fileUrl: urlData.url || urlData,
            fileKey: urlData.key || `key_${Date.now()}`,
            fileType: files[index].type,
            fileSize: files[index].size,
            category: category as any,
            description: "", 
          });
        }
        toast.success("Fotos enviadas!", { id: toastId });
      }
    } catch {
      toast.error("Falha no envio.", { id: toastId });
    } finally {
      setUploadProgress(100); // Finaliza a barra.
      // Espera quase 1 segundo e "limpa" o estado para o próximo upload.
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 800);
    }
  };

  // --- O QUE APARECE NA TELA (VISUAL) ---
  return (
    <Card className="shadow-sm border-slate-200">
      {/* CABEÇALHO: Título e Botão de Subir Fotos */}
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-blue-600" />
          Galeria da Ordem de Serviço
        </CardTitle>
        
        {/* Botão de Upload: O seletor real fica invisível por cima para facilitar o clique */}
        <Button variant="outline" className="relative h-9 border-blue-200 text-blue-700 hover:bg-blue-50" disabled={isUploading}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isUploading ? `${uploadProgress}%` : "Subir Fotos"}
          <input
            type="file" multiple accept="image/*,application/pdf"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => handleFileUpload(selectedCategory || "other", e.target.files)}
          />
        </Button>
      </CardHeader>

      {/* BARRA DE PROGRESSO: Só aparece se estiver subindo algo */}
      {isUploading && (
        <div className="px-6 pb-4">
          <Progress value={uploadProgress} className="h-1 bg-blue-100" />
        </div>
      )}
      
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          {/* ABAS: Filtros (Todos, Antes, Durante, Depois, etc.) */}
          <TabsList className="grid w-full grid-cols-6 bg-slate-100/50 p-1">
            {["all", "before", "during", "after", "document", "other"].map((cat) => (
              <TabsTrigger 
                key={cat} value={cat} 
                className="text-[10px] uppercase font-bold" 
                onClick={() => setSelectedCategory(cat === "all" ? undefined : cat)}
              >
                {cat === "all" ? "Tudo" : cat.slice(0, 4)} {/* Abrevia o nome para caber no celular */}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* GRID: Onde os cards das fotos são desenhados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {attachments?.map((file) => (
              <div key={file.id} className="group border rounded-xl p-3 bg-white hover:shadow-md transition-all">
                
                {/* ESPAÇO DA FOTO (MINIATURA) */}
                <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border mb-3 flex items-center justify-center">
                  {file.fileType?.startsWith("image/") ? (
                    <img src={file.fileUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <FileText className="h-10 w-10 text-slate-300" /> // Se for PDF, mostra ícone de papel
                  )}
                </div>

                <div className="space-y-2">
                  {/* NOME E ETIQUETA DA CATEGORIA */}
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold truncate flex-1">{file.fileName}</p>
                    <Badge variant="outline" className="text-[9px] uppercase">{file.category}</Badge>
                  </div>

                  {/* CAMPO DE LEGENDA: Se estiver editando, mostra caixa de texto. Se não, mostra o texto. */}
                  {editingId === file.id ? (
                    <div className="flex items-center gap-1">
                      <input 
                        className="text-xs border rounded p-1 w-full outline-blue-500"
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && updateAttachmentMutation.mutate({ id: file.id, description: tempDescription })}
                      />
                      <Button size="icon" className="h-6 w-6 bg-green-600" onClick={() => updateAttachmentMutation.mutate({ id: file.id, description: tempDescription })}>
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </Button>
                    </div>
                  ) : (
                    <p 
                      className="text-[11px] text-slate-500 italic cursor-pointer hover:text-blue-600" 
                      onClick={() => { setEditingId(file.id); setTempDescription(file.description || ""); }}
                    >
                      {file.description || "Clique para adicionar legenda..."}
                    </p>
                  )}

                  {/* BOTÕES DE BAIXO: Abrir link ou Excluir */}
                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px]" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" /> Ver Original
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" size="sm" 
                      className="h-7 w-7 text-red-400 hover:text