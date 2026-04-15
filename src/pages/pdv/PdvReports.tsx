import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Database } from "lucide-react";
import { useState } from "react";

type ReportType = "sales" | "stock" | "cashflow";

export default function PdvReports() {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  const generateBackup = trpc.pdv.backup.generate.useMutation();

  const { data: sales } = trpc.pdv.sales.getWithFilters.useQuery(
    { startDate: startDate || undefined, endDate: endDate || undefined },
    { enabled: reportType === "sales" }
  );

  const { data: products } = trpc.pdv.products.list.useQuery(undefined, { enabled: reportType === "stock" });

  const { data: transactions } = trpc.pdv.cash.list.useQuery(undefined, { enabled: reportType === "cashflow" });

  const handleGenerateBackup = async () => {
    setIsGeneratingBackup(true);
    try {
      const result = await generateBackup.mutateAsync();
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = result.filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      alert(`Backup gerado!\nArquivo: ${result.filename}\nTamanho: ${(result.size / 1024).toFixed(2)} KB\nProdutos: ${result.metadata.productsCount} | Vendas: ${result.metadata.salesCount}`);
    } catch { alert("Erro ao gerar backup."); }
    finally { setIsGeneratingBackup(false); }
  };

  const renderSales = () => {
    const total = sales?.reduce((s: number, sale: any) => s + parseFloat(sale.total), 0) || 0;
    return (
      <div>
        <Card className="mb-6"><CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Total de Vendas</p><p className="text-2xl font-bold">{sales?.length || 0}</p></div>
            <div><p className="text-sm text-muted-foreground">Faturamento</p><p className="text-2xl font-bold">R$ {total.toFixed(2)}</p></div>
          </div>
        </CardContent></Card>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {sales?.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>#{s.id}</TableCell>
                <TableCell>{new Date(s.createdAt).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{s.paymentMethod}</TableCell>
                <TableCell className="text-right">R$ {parseFloat(s.total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderStock = () => {
    const lowStock = products?.filter((p: any) => p.stock <= p.minStock).length || 0;
    const totalValue = products?.reduce((s: number, p: any) => s + parseFloat(p.price) * p.stock, 0) || 0;
    return (
      <div>
        <Card className="mb-6"><CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-muted-foreground">Produtos</p><p className="text-2xl font-bold">{products?.length || 0}</p></div>
            <div><p className="text-sm text-muted-foreground">Estoque Baixo</p><p className="text-2xl font-bold text-red-600">{lowStock}</p></div>
            <div><p className="text-sm text-muted-foreground">Valor Total</p><p className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</p></div>
          </div>
        </CardContent></Card>
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Produto</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Mín.</TableHead><TableHead className="text-right">Valor Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {products?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.barcode}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>R$ {parseFloat(p.price).toFixed(2)}</TableCell>
                <TableCell><span className={p.stock <= p.minStock ? "text-red-600 font-bold" : ""}>{p.stock}</span></TableCell>
                <TableCell>{p.minStock}</TableCell>
                <TableCell className="text-right">R$ {(parseFloat(p.price) * p.stock).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCashFlow = () => {
    const entradas = transactions?.filter((t: any) => t.type === "entrada").reduce((s: number, t: any) => s + parseFloat(t.amount), 0) || 0;
    const saidas = transactions?.filter((t: any) => t.type === "saida").reduce((s: number, t: any) => s + parseFloat(t.amount), 0) || 0;
    return (
      <div>
        <Card className="mb-6"><CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-muted-foreground">Entradas</p><p className="text-2xl font-bold text-green-600">R$ {entradas.toFixed(2)}</p></div>
            <div><p className="text-sm text-muted-foreground">Saídas</p><p className="text-2xl font-bold text-red-600">R$ {saidas.toFixed(2)}</p></div>
            <div><p className="text-sm text-muted-foreground">Saldo</p><p className={`text-2xl font-bold ${entradas - saidas >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {(entradas - saidas).toFixed(2)}</p></div>
          </div>
        </CardContent></Card>
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>
            {transactions?.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{new Date(t.createdAt).toLocaleString("pt-BR")}</TableCell>
                <TableCell><span className={t.type === "entrada" ? "text-green-600" : "text-red-600"}>{t.type === "entrada" ? "Entrada" : "Saída"}</span></TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell className="text-right"><span className={t.type === "entrada" ? "text-green-600" : "text-red-600"}>{t.type === "entrada" ? "+" : "-"}R$ {parseFloat(t.amount).toFixed(2)}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Gere e imprima relatórios do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateBackup} disabled={isGeneratingBackup} variant="outline">
            <Database className="mr-2 h-4 w-4" />
            {isGeneratingBackup ? "Gerando..." : "Gerar Backup"}
          </Button>
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader><CardTitle>Configurações do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Vendas</SelectItem>
                  <SelectItem value="stock">Estoque</SelectItem>
                  <SelectItem value="cashflow">Fluxo de Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === "sales" && (
              <>
                <div className="space-y-2"><Label>Data Inicial</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Data Final</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {reportType === "sales" && renderSales()}
          {reportType === "stock" && renderStock()}
          {reportType === "cashflow" && renderCashFlow()}
        </CardContent>
      </Card>
    </div>
  );
}
