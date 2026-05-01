import { useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import { APP_LOGO } from "@/const";
import { SolutegFooter } from "@/components/SolutegFooter";
import {
  CheckCircle, XCircle, Loader2, Download,
  FileText, Calendar, User, AlertTriangle,
  Package, DollarSign, Camera,
} from "lucide-react";
import { formatCurrency, SERVICE_TYPE_LABEL as SERVICE_LABEL } from "@/lib/budgetUtils";

export default function BudgetApproval() {
  const [, params] = useRoute("/orcamento/:token");
  const token = params?.token ?? "";

  const { data: budget, isLoading, error } = trpc.budgets.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );
  const { data: items } = (trpc as any).budgets.getItemsByToken.useQuery(
    { token },
    { enabled: !!token && !!budget?.id }
  );
  const { data: photos } = (trpc as any).budgets.attachments.listByToken.useQuery(
    { token },
    { enabled: !!token && !!budget?.id }
  );

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [clientSig, setClientSig] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = trpc.budgets.approve.useMutation({
    onSuccess: () => {
      toast.success("Orçamento aprovado com sucesso! Entraremos em contato em breve.");
      setApproveOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = trpc.budgets.reject.useMutation({
    onSuccess: () => {
      toast.success("Orçamento reprovado. Obrigado pelo retorno.");
      setRejectOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportMutation = (trpc as any).budgets.exportPDFByToken.useMutation({
    onSuccess: (res) => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${res.pdf}`;
      link.download = res.filename;
      link.click();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleApprove = () => {
    if (!clientSig) { toast.error("Por favor, assine para confirmar a aprovação"); return; }
    if (!signerName.trim()) { toast.error("Informe seu nome completo"); return; }
    approveMutation.mutate({
      token,
      clientSignature: clientSig,
      clientSignatureName: signerName,
      approvedBy: signerName,
      createOs: true,
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.error("Informe o motivo da reprovação"); return; }
    rejectMutation.mutate({
      token,
      rejectionReason: rejectReason,
      rejectedBy: "cliente",
    });
  };

  const isExpired = budget?.validUntil && new Date(budget.validUntil) < new Date();
  const itemsTotal = (items ?? []).reduce((s: number, it: any) => s + it.totalPrice, 0);

  // ─── Estados de carregamento/erro ─────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Orçamento não encontrado</h1>
        <p className="text-slate-500 text-sm">Este link pode ter expirado ou ser inválido.</p>
      </div>
    );
  }

  // ─── Orçamento já respondido ───────────────────────────────────────────

  if (budget.status === "aprovado") {
    return (
      <StatusScreen icon={<CheckCircle className="w-16 h-16 text-green-500" />} title="Orçamento Aprovado">
        <p className="text-slate-500">Este orçamento já foi aprovado. Nossa equipe entrará em contato para agendar os serviços.</p>
        {budget.approvedAt && (
          <p className="text-sm text-slate-400 mt-3">
            Aprovado em {new Date(budget.approvedAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </StatusScreen>
    );
  }

  if (budget.status === "reprovado") {
    return (
      <StatusScreen icon={<XCircle className="w-16 h-16 text-red-500" />} title="Orçamento Reprovado">
        <p className="text-slate-500">Este orçamento foi reprovado. Entre em contato conosco para mais informações.</p>
      </StatusScreen>
    );
  }

  if (budget.status === "pendente") {
    return (
      <StatusScreen icon={<Loader2 className="w-16 h-16 text-amber-500" />} title="Orçamento em Elaboração">
        <p className="text-slate-500">Este orçamento ainda está sendo preparado. Em breve você receberá o link atualizado.</p>
      </StatusScreen>
    );
  }

  // ─── Orçamento disponível para aprovação ──────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Banner de validade */}
        {isExpired ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Orçamento expirado</p>
              <p className="text-xs">Prazo de validade encerrado em {new Date(budget.validUntil!).toLocaleDateString("pt-BR")}. Entre em contato para renovar.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-blue-800">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                Válido até <strong>{new Date(budget.validUntil!).toLocaleDateString("pt-BR")}</strong>
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
              {budget.validityDays} dias
            </Badge>
          </div>
        )}

        {/* Cabeçalho do orçamento */}
        <Card className="overflow-hidden">
          <div className="bg-slate-800 px-6 py-4 flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Orçamento</p>
              <h1 className="text-white text-xl font-extrabold mt-0.5">{budget.budgetNumber}</h1>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 gap-2"
              onClick={() => exportMutation.mutate({ token })}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : <Download className="w-3 h-3" />}
              PDF
            </Button>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Cliente</p>
                  <p className="font-semibold text-slate-800">{budget.clientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tipo de Serviço</p>
                  <p className="font-semibold text-slate-800">{SERVICE_LABEL[budget.serviceType] ?? budget.serviceType}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Data</p>
                  <p className="font-semibold text-slate-800">{new Date(budget.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Valor Total</p>
                  <p className="font-extrabold text-green-700 text-lg">{formatCurrency(budget.totalValue)}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="font-bold text-slate-800 text-base">{budget.title}</h2>
              {budget.description && <p className="text-slate-600 text-sm mt-1">{budget.description}</p>}
            </div>

            {budget.scope && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Escopo dos Serviços</p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{budget.scope}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Itens */}
        {items && items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" /> Detalhamento de Itens
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-600">Descrição</th>
                    <th className="text-center p-3 font-semibold text-slate-600 w-20">Qtd.</th>
                    <th className="text-center p-3 font-semibold text-slate-600 w-16">Un.</th>
                    <th className="text-right p-3 font-semibold text-slate-600 w-28">Vl. Unit.</th>
                    <th className="text-right p-3 font-semibold text-slate-600 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3 text-slate-700">{item.description}</td>
                      <td className="p-3 text-center text-slate-600">{(item.quantity / 100).toFixed(2)}</td>
                      <td className="p-3 text-center text-slate-500">{item.unit}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t">
                  <tr>
                    <td colSpan={4} className="p-3 text-right font-black text-slate-800">TOTAL</td>
                    <td className="p-3 text-right font-black text-green-700">{formatCurrency(budget.totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Notas para o cliente */}
        {budget.clientNotes && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Observações</p>
              <p className="text-blue-800 text-sm whitespace-pre-wrap">{budget.clientNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Fotos do local (antes) */}
        {photos && photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4" /> Fotos do Local
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo: any) => (
                  <div key={photo.id} className="space-y-1">
                    <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={photo.fileUrl}
                        alt={photo.fileName}
                        className="w-full aspect-square object-cover rounded-lg border"
                      />
                    </a>
                    {photo.caption && (
                      <p className="text-xs text-slate-500 text-center">{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinatura do técnico */}
        {budget.technicianSignature && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Responsável Técnico</p>
              <img src={budget.technicianSignature} alt="Assinatura" className="border rounded-lg max-h-24 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">{budget.technicianName}</p>
              {budget.finalizedAt && (
                <p className="text-xs text-slate-400">{new Date(budget.finalizedAt).toLocaleDateString("pt-BR")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aviso de validade no rodapé do documento */}
        <div className="border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-xs">
          Este orçamento é válido por <strong>{budget.validityDays} dias</strong> a partir da data de emissão
          {budget.finalizedAt ? ` (${new Date(budget.finalizedAt).toLocaleDateString("pt-BR")})` : ""}.
          Após este prazo, os preços e condições poderão ser revistos.
        </div>

        {/* Botões de ação */}
        {!isExpired && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 gap-2 h-12"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="w-5 h-5" /> Reprovar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2 h-12"
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle className="w-5 h-5" /> Aprovar
            </Button>
          </div>
        )}
      </main>

      <SolutegFooter full={false} />

      {/* ─── Modal Aprovação ─────────────────────────────────────────────── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Aprovação do Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              Ao aprovar, você confirma o aceite deste orçamento e autoriza a execução dos serviços.
            </div>
            <div>
              <Label>Nome Completo *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome do responsável pela aprovação" />
            </div>
            <div>
              <Label>Assinatura *</Label>
              <SignaturePad onSave={setClientSig} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setApproveOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Aprovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Reprovação ────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Reprovar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Motivo da Reprovação *</Label>
              <Textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                onClick={handleReject}
              >
                {rejectMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Confirmar Reprovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusScreen({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 w-fit">{icon}</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
          {children}
        </div>
      </main>
      <SolutegFooter full={false} />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        <img src={APP_LOGO} alt="Soluteg" className="h-8 object-contain" />
        <div className="leading-tight">
          <p className="font-bold text-sm text-white">Soluteg</p>
          <p className="text-[10px] text-slate-400">Portal de Orçamentos</p>
        </div>
      </div>
    </header>
  );
}
