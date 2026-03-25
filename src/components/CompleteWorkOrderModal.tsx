import { useState } from "react";
// Importação dos componentes de interface (UI) da biblioteca Shadcn/UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Note que o Textarea e o ícone FileText foram removidos das importações
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"; // Ícones visuais
import SignaturePad from "./SignaturePad"; // Componente para capturar a assinatura

// Define quais dados este componente espera receber e quais ele vai devolver ao finalizar
interface CompleteWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    collaboratorName: string;
    collaboratorSignature: string;
    clientName?: string;
    clientSignature?: string;
    // O campo completionNotes foi removido daqui para o TypeScript não cobrar o envio
  }) => Promise<void>;
  isLoading?: boolean;
  isEmergency?: boolean;
}

export default function CompleteWorkOrderModal({
  open,
  onOpenChange,
  onComplete,
  isLoading = false,
  isEmergency = false,
}: CompleteWorkOrderModalProps) {
  // ESTADOS: Variáveis que guardam o que o usuário digita ou assina na tela
  const [collaboratorName, setCollaboratorName] = useState("");
  const [collaboratorSignature, setCollaboratorSignature] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  // O estado completionNotes foi removido para economizar memória
  const [error, setError] = useState(""); // Guarda mensagens de erro de validação
  const [success, setSuccess] = useState(false); // Controla o alerta de sucesso

  // FUNÇÃO PRINCIPAL: Executada ao clicar no botão "FINALIZAR AGORA"
  const handleComplete = async () => {
    setError(""); // Reseta erros anteriores

    // VALIDAÇÕES BÁSICAS: Impede finalizar se o técnico não se identificar
    if (!collaboratorName.trim()) {
      setError("Nome do colaborador é obrigatório");
      return;
    }
    if (!collaboratorSignature) {
      setError("Assinatura do colaborador é obrigatória");
      return;
    }

    // VALIDAÇÃO EMERGENCIAL: Se for emergência, o cliente também é obrigado a assinar
    if (isEmergency) {
      // A regra que exigia o Relatório de Execução foi removida daqui
      if (!clientName.trim()) {
        setError("O Nome do Cliente é OBRIGATÓRIO para serviços emergenciais.");
        return;
      }
      if (!clientSignature) {
        setError("A Assinatura do Cliente é OBRIGATÓRIA para serviços emergenciais.");
        return;
      }
    }

    try {
      // Chama a função de finalização enviando apenas os nomes e as imagens das assinaturas
      await onComplete({
        collaboratorName,
        collaboratorSignature,
        clientName: clientName.trim() || undefined,
        clientSignature: clientSignature || undefined,
      });

      setSuccess(true); // Ativa o banner verde de sucesso
      
      // Aguarda 2 segundos para o usuário ver o sucesso e limpa o formulário
      setTimeout(() => {
        setCollaboratorName("");
        setCollaboratorSignature(null);
        setClientName("");
        setClientSignature(null);
        setSuccess(false);
        onOpenChange(false); // Fecha a janela (modal)
      }, 2000);
    } catch (err) {
      // Se a API/Banco de dados retornar erro, exibe na tela
      setError(err instanceof Error ? err.message : "Erro ao concluir OS");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h-[95vh] garante que a janela não suma em telas pequenas, permitindo rolagem */}
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto border-t-8 border-t-emerald-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black">Finalizar Atendimento</DialogTitle>
            {isEmergency && (
              <Badge variant="destructive" className="animate-pulse px-3 py-1">EMERGENCIAL</Badge>
            )}
          </div>
          <DialogDescription>
            Capture as assinaturas para concluir a OS.
          </DialogDescription>
        </DialogHeader>

        {/* Alerta exibido apenas quando a OS é salva com sucesso */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-bold">
              OS concluída com sucesso! Sincronizando dados...
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta exibido quando falta algum campo obrigatório */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-bold">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          
          {/* O campo de Relatório (Textarea) foi removido totalmente desta seção */}

          {/* Grid que divide a tela em duas colunas no computador (md:grid-cols-2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SEÇÃO DO TÉCNICO */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Colaborador (Técnico)</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Seu nome completo"
                  value={collaboratorName}
                  onChange={(e) => setCollaboratorName(e.target.value)}
                  className="bg-white"
                />
                <div className="border rounded-lg p-1 bg-white shadow-sm">
                  <SignaturePad onSave={setCollaboratorSignature} height={120} />
                </div>
              </div>
            </div>

            {/* SEÇÃO DO CLIENTE - Muda de cor se for emergencial (bg-amber-50) */}
            <div className={`space-y-4 p-4 rounded-xl border ${isEmergency ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">
                Cliente {isEmergency && "(OBRIGATÓRIO)"}
              </h3>
              <div className="space-y-3">
                <Input
                  placeholder="Nome de quem acompanhou"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-white"
                />
                <div className="border rounded-lg p-1 bg-white shadow-sm">
                  <SignaturePad onSave={setClientSignature} height={120} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com os botões de ação */}
        <DialogFooter className="flex flex-col md:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
            Voltar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className={`flex-[2] h-12 text-lg font-bold ${isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {/* Se estiver salvando, mostra o ícone de carregamento girando */}
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
            FINALIZAR AGORA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}