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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import SignaturePad from "./SignaturePad";

interface CompleteWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    collaboratorName: string;
    collaboratorSignature: string;
    clientName?: string;
    clientSignature?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function CompleteWorkOrderModal({
  open,
  onOpenChange,
  onComplete,
  isLoading = false,
}: CompleteWorkOrderModalProps) {
  const [collaboratorName, setCollaboratorName] = useState("");
  const [collaboratorSignature, setCollaboratorSignature] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleComplete = async () => {
    setError("");

    // Validar campos obrigatórios
    if (!collaboratorName.trim()) {
      setError("Nome do colaborador é obrigatório");
      return;
    }

    if (!collaboratorSignature) {
      setError("Assinatura do colaborador é obrigatória");
      return;
    }

    try {
      await onComplete({
        collaboratorName,
        collaboratorSignature,
        clientName: clientName.trim() || undefined,
        clientSignature: clientSignature || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setCollaboratorName("");
        setCollaboratorSignature(null);
        setClientName("");
        setClientSignature(null);
        setSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao concluir OS");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concluir Ordem de Serviço</DialogTitle>
          <DialogDescription>
            Preencha os dados do colaborador e capture as assinaturas. A assinatura do colaborador é obrigatória.
          </DialogDescription>
        </DialogHeader>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              OS concluída com sucesso! Assinaturas capturadas.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Dados do Colaborador */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-3">Dados do Colaborador</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="collaborator-name">Nome Completo *</Label>
                  <Input
                    id="collaborator-name"
                    placeholder="Digite o nome do colaborador"
                    value={collaboratorName}
                    onChange={(e) => setCollaboratorName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label>Assinatura do Colaborador *</Label>
                  <div className="border rounded-lg p-2 bg-white">
                    <SignaturePad
                      onSave={setCollaboratorSignature}
                      width={400}
                      height={150}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Cliente (Opcional) */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="font-semibold text-lg mb-3">Dados do Cliente (Opcional)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="client-name">Nome do Cliente</Label>
                  <Input
                    id="client-name"
                    placeholder="Digite o nome do cliente (opcional)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label>Assinatura do Cliente</Label>
                  <div className="border rounded-lg p-2 bg-white">
                    <SignaturePad
                      onSave={setClientSignature}
                      width={400}
                      height={150}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading || !collaboratorName.trim() || !collaboratorSignature}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Concluindo...
              </>
            ) : (
              "Concluir OS"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
