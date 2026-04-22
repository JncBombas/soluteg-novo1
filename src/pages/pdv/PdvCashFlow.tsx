import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PdvCashFlow() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: transactions, refetch } = trpc.pdv.cash.list.useQuery();
  const { data: balance } = trpc.pdv.cash.getBalance.useQuery();
  const createTransaction = trpc.pdv.cash.createTransaction.useMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as "entrada" | "saida",
      amount: formData.get("amount") as string,
      description: formData.get("description") as string,
    };
    try {
      await createTransaction.mutateAsync(data);
      toast.success("Transação registrada com sucesso!");
      setOpen(false);
      refetch();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar transação");
    }
  };

  const filteredTransactions = transactions?.filter((t: any) => {
    if (!startDate && !endDate) return true;
    const date = new Date(t.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && end) return date >= start && date <= end;
    if (start) return date >= start;
    if (end) return date <= end;
    return true;
  });

  const stats = filteredTransactions?.reduce(
    (acc: any, t: any) => {
      const amount = parseFloat(t.amount);
      if (t.type === "entrada") acc.entradas += amount;
      else acc.saidas += amount;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  ) || { entradas: 0, saidas: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Controle suas entradas e saídas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}><Plus className="mr-2 h-4 w-4" />Nova Transação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select name="type" required>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input name="amount" type="text" placeholder="0.00" pattern="\d+(\.\d{1,2})?" required />
              </div>
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea name="description" placeholder="Descrição da transação" required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} style={{ borderColor: "#D4A15E" }}>Cancelar</Button>
                <Button type="submit" className="bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {Number(balance || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Saldo total em caixa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {stats.entradas.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {stats.saidas.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Período selecionado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    {t.type === "entrada"
                      ? <Badge className="bg-green-600"><TrendingUp className="mr-1 h-3 w-3" />Entrada</Badge>
                      : <Badge variant="destructive"><TrendingDown className="mr-1 h-3 w-3" />Saída</Badge>
                    }
                  </TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={t.type === "entrada" ? "text-green-600" : "text-red-600"}>
                      {t.type === "entrada" ? "+" : "-"}R$ {Number(t.amount).toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
