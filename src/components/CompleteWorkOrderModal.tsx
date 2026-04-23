import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, PenLine } from "lucide-react";

interface CompleteWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  isLoading?: boolean;
  isEmergency?: boolean;
  workOrder?: any;
}

function SigRow({ label, name, signed }: { label: string; name?: string | null; signed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
      {signed
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        : <PenLine className="h-4 w-4 text-slate-300 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-700 truncate">
          {signed && name ? name : signed ? "—" : "Não assinado"}
        </p>
      </div>
      {signed && (
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs shrink-0">
          Assinado
        </Badge>
      )}
    </div>
  );
}

export default function CompleteWorkOrderModal({
  open,
  onOpenChange,
  onComplete,
  isLoading = false,
  isEmergency = false,
  workOrder,
}: CompleteWorkOrderModalProps) {
  const hasTechSig   = !!(workOrder?.technicianSignature);
  const hasCollabSig = !!(workOrder?.collaboratorSignature);
  const hasClientSig = !!(workOrder?.clientSignature);
  const hasAnySig    = hasTechSig || hasCollabSig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-t-8 border-t-emerald-600">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black">Finalizar Atendimento</DialogTitle>
            {isEmergency && (
              <Badge variant="destructive" className="animate-pulse px-3 py-1">EMERGENCIAL</Badge>
            )}
          </div>
          <DialogDescription>
            Confirme as assinaturas coletadas antes de finalizar a OS.
          </DialogDescription>
        </DialogHeader>

        {!hasAnySig && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              Nenhuma assinatura coletada. Registre a assinatura do técnico ou do responsável
              na aba "Assinaturas" antes de finalizar.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 py-1">
          <SigRow
            label="Técnico"
            name={workOrder?.technicianName}
            signed={hasTechSig}
          />
          <SigRow
            label="Responsável"
            name={workOrder?.collaboratorName}
            signed={hasCollabSig}
          />
          <SigRow
            label="Cliente / Acompanhante"
            name={workOrder?.clientSignerName}
            signed={hasClientSig}
          />
        </div>

        <DialogFooter className="flex flex-col md:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onComplete}
            disabled={isLoading || !hasAnySig}
            className={`flex-[2] h-12 text-lg font-bold ${
              isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            } text-white`}
          >
            {isLoading
              ? <Loader2 className="animate-spin mr-2" />
              : <CheckCircle2 className="mr-2" />}
            FINALIZAR AGORA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
