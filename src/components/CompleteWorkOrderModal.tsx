import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea"; // Certifique-se de ter este componente
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";
import SignaturePad from "./SignaturePad";

interface CompleteWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    collaboratorName: string;
    collaboratorSignature: string;
    clientName?: string;
    clientSignature?: string;
    completionNotes?: string; // Novo campo para o relatório
  }) => Promise<void>;
  isLoading?: boolean;
  isEmergency?: boolean; // Nova prop para o fluxo emergencial
}

export default function CompleteWorkOrderModal({
  open,
  onOpenChange,
  onComplete,
  isLoading = false,
  isEmergency = false,
}: CompleteWorkOrderModalProps) {
  const [collaboratorName, setCollaboratorName] = useState("");
  const [collaboratorSignature, setCollaboratorSignature] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState(""); // Estado do relatório
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleComplete = async () => {
    setError("");

    // VALIDAÇÕES
    if (!collaboratorName.trim()) {
      setError("Nome do colaborador é obrigatório");
      return;
    }
    if (!collaboratorSignature) {
      setError("Assinatura do colaborador é obrigatória");
      return;
    }

    // Validação extra para Emergencial
    if (isEmergency) {
      if (!completionNotes.trim()) {
        setError("O Relatório de Execução é OBRIGATÓRIO para serviços emergenciais.");
        return;
      }
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
      await onComplete({
        collaboratorName,
        collaboratorSignature,
        clientName: clientName.trim() || undefined,
        clientSignature: clientSignature || undefined,
        completionNotes: completionNotes.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setCollaboratorName("");
        setCollaboratorSignature(null);
        setClientName("");
        setClientSignature(null);
        setCompletionNotes("");
        setSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao concluir OS");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto border-t-8 border-t-emerald-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black">Finalizar Atendimento</DialogTitle>
            {isEmergency && (
              <Badge variant="destructive" className="animate-pulse px-3 py-1">EMERGENCIAL</Badge>
            )}
          </div>
          <DialogDescription>
            Capture as assinaturas e descreva o serviço realizado para concluir a OS.
          </DialogDescription>
        </DialogHeader>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-bold">
              OS concluída com sucesso! Sincronizando dados...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-bold">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          
          {/* RELATÓRIO TÉCNICO */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 font-bold">
              <FileText className="w-4 h-4" />
              Relatório de Execução {isEmergency && "*"}
            </Label>
            <Textarea
              id="notes"
              placeholder="Descreva o que foi feito, peças trocadas e estado final do equipamento..."
              className={`min-h-[100px] ${isEmergency && !completionNotes ? "border-red-300 bg-red-50/20" : ""}`}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COLABORADOR */}
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

            {/* CLIENTE */}
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

        <DialogFooter className="flex flex-col md:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
            Voltar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className={`flex-[2] h-12 text-lg font-bold ${isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
            FINALIZAR AGORA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}