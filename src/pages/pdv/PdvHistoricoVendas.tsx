import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Printer, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PdvHistoricoVendas() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "cartao_debito" | "cartao_credito" | "pix" | "all">("all");
  const [searchId, setSearchId] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [saleToCancel, setSaleToCancel] = useState<any>(null);

  const salesQuery = trpc.pdv.sales.getWithFilters.useQuery({ startDate: startDate || undefined, endDate: endDate || undefined, paymentMethod, searchId: searchId || undefined });
  const getSaleDetails = trpc.pdv.sales.getById.useQuery({ id: selectedSale?.id || 0 }, { enabled: !!selectedSale?.id });
  const cancelSaleMutation = trpc.pdv.sales.cancel.useMutation({
    onSuccess: () => { toast.success("Venda cancelada com sucesso!"); setShowCancelModal(false); setCancelReason(""); setSaleToCancel(null); salesQuery.refetch(); },
    onError: (e) => toast.error(e.message || "Erro ao cancelar venda"),
  });

  const fmtPayment = (m: string) => ({ dinheiro: "Dinheiro", cartao_debito: "Cartão Débito", cartao_credito: "Cartão Crédito", pix: "PIX" }[m] || m);

  const handlePrint = () => {
    const orig = document.title;
    document.title = `JNC Componentes Elétricos - Sistema Soluteg #${selectedSale?.id || "CUPOM"}`;
    window.print();
    setTimeout(() => { document.title = orig; }, 1000);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { toast.error("Informe o motivo do cancelamento"); return; }
    if (saleToCancel) cancelSaleMutation.mutate({ saleId: saleToCancel.id, reason: cancelReason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-8 w-8" style={{ color: "#D4A15E" }} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
          <p className="text-muted-foreground">Consulte e reimprima cupons de vendas anteriores</p>
        </div>
      </div>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
          <CardTitle className="text-white flex items-center gap-2"><Search className="h-5 w-5" />Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs mb-2 block">Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-2" style={{ borderColor: "#D4A15E" }} />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-2" style={{ borderColor: "#D4A15E" }} />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Forma de Pagamento</Label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full px-3 py-2 border-2 rounded-md" style={{ borderColor: "#D4A15E" }}>
                <option value="all">Todas</option>
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="cartao_debito">💳 Cartão Débito</option>
                <option value="cartao_credito">💳 Cartão Crédito</option>
                <option value="pix">📱 PIX</option>
              </select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Nº do Cupom</Label>
              <Input type="text" placeholder="Digite o número..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className="border-2" style={{ borderColor: "#D4A15E" }} />
            </div>
          </div>
          <Button variant="outline" className="mt-4" onClick={() => { setStartDate(""); setEndDate(""); setPaymentMethod("all"); setSearchId(""); }} style={{ borderColor: "#D4A15E", color: "#D4A15E" }}>Limpar Filtros</Button>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-slate-700">Vendas Encontradas: {salesQuery.data?.length || 0}</CardTitle>
        </CardHeader>
        <CardContent>
          {salesQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : salesQuery.data && salesQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cupom Nº</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Troco</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesQuery.data.map((sale: any) => (
                  <TableRow key={sale.id} className={sale.canceled ? "opacity-60" : ""}>
                    <TableCell className="font-bold" style={{ color: "#D4A15E" }}>
                      #{sale.id}
                      {sale.canceled && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">CANCELADA</span>}
                    </TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                    <TableCell className="font-semibold">R$ {parseFloat(sale.total).toFixed(2)}</TableCell>
                    <TableCell>{fmtPayment(sale.paymentMethod)}</TableCell>
                    <TableCell>{sale.discount && parseFloat(sale.discount) > 0 ? <span className="text-red-600">R$ {parseFloat(sale.discount).toFixed(2)}</span> : "-"}</TableCell>
                    <TableCell>{sale.change && parseFloat(sale.change) > 0 ? <span className="text-green-600 font-semibold">R$ {parseFloat(sale.change).toFixed(2)}</span> : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setSelectedSale(sale); setShowReceipt(true); }} className="bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
                          <Printer className="h-4 w-4 mr-1" />Cupom
                        </Button>
                        {!sale.canceled && (
                          <Button size="sm" variant="destructive" onClick={() => { setSaleToCancel(sale); setShowCancelModal(true); }}>
                            <XCircle className="h-4 w-4 mr-1" />Cancelar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma venda encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cupom de Venda #{selectedSale?.id}</DialogTitle></DialogHeader>
          <div className="print-receipt">
            <div className="text-center mb-2">
              <img src="/logo-jnc-novo.webp" alt="JNC" className="h-20 mx-auto mb-1 object-contain" />
              <p className="text-[10px] font-semibold">JNC Comércio e Serviços</p>
              <p className="text-[10px]">Av. Pres. Kennedy, 8566 - Mirim - Praia Grande/SP</p>
            </div>
            <div className="border-t border-b border-dashed py-1 my-1">
              <div className="flex justify-between text-[10px]">
                <span className="font-bold">CUPOM Nº {selectedSale?.id}</span>
                <span>{selectedSale && new Date(selectedSale.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            </div>
            {getSaleDetails.data?.items?.map((item: any, i: number) => (
              <div key={i} className="text-[10px] mb-1">
                <div className="font-medium">{item.productName}</div>
                <div className="flex justify-between">
                  <span>{item.quantity} x R$ {parseFloat(item.unitPrice).toFixed(2)}</span>
                  <span>R$ {parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-dashed pt-1 mt-1">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span style={{ color: "#D4A15E" }}>R$ {selectedSale?.total && parseFloat(selectedSale.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] mt-0.5">
                <span>Pagamento:</span>
                <span>{selectedSale && fmtPayment(selectedSale.paymentMethod)}</span>
              </div>
              {getSaleDetails.data?.amountPaid && parseFloat(getSaleDetails.data.amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-[10px]"><span>Valor Pago:</span><span>R$ {parseFloat(getSaleDetails.data.amountPaid).toFixed(2)}</span></div>
                  {getSaleDetails.data?.change && parseFloat(getSaleDetails.data.change) > 0 && (
                    <div className="flex justify-between text-[10px]"><span>Troco:</span><span className="font-bold text-green-600">R$ {parseFloat(getSaleDetails.data.change).toFixed(2)}</span></div>
                  )}
                </>
              )}
            </div>
            <div className="text-center mt-2 text-[10px]"><p className="font-medium">Obrigado pela preferência!</p></div>
            <div className="mt-6 pt-2">
              <div className="border-b border-black mt-8 mb-1 mx-4"></div>
              <p className="text-[10px] text-center text-slate-600">Assinatura do Cliente</p>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-4">Sistema Soluteg de Vendas</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button onClick={handlePrint} className="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1" style={{ borderColor: "#D4A15E", color: "#D4A15E" }}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><XCircle className="h-5 w-5" />Cancelar Venda #{saleToCancel?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800 font-semibold">Esta ação irá:</p>
              <ul className="text-sm text-yellow-700 mt-1 ml-4 list-disc">
                <li>Estornar o estoque dos produtos</li>
                <li>Registrar saída no fluxo de caixa</li>
                <li>Marcar a venda como cancelada</li>
              </ul>
            </div>
            <div>
              <Label className="text-sm font-medium">Motivo do Cancelamento *</Label>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Informe o motivo do cancelamento..."
                className="w-full mt-2 px-3 py-2 border-2 rounded-md min-h-[100px]" style={{ borderColor: "#D4A15E" }} />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={confirmCancel} disabled={cancelSaleMutation.isPending} className="flex-1">
                {cancelSaleMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
              <Button variant="outline" onClick={() => { setShowCancelModal(false); setCancelReason(""); setSaleToCancel(null); }} className="flex-1" style={{ borderColor: "#D4A15E", color: "#D4A15E" }}>Voltar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
