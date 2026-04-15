import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PdvCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", cpfCnpj: "", phone: "", email: "" });

  const { data: customers, refetch } = trpc.pdv.customers.list.useQuery();
  const createCustomer = trpc.pdv.customers.create.useMutation();
  const updateCustomer = trpc.pdv.customers.update.useMutation();
  const deleteCustomer = trpc.pdv.customers.delete.useMutation();

  const filteredCustomers = customers?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cpfCnpj?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ name: customer.name, cpfCnpj: customer.cpfCnpj || "", phone: customer.phone || "", email: customer.email || "" });
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", cpfCnpj: "", phone: "", email: "" });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCustomer(null);
    setFormData({ name: "", cpfCnpj: "", phone: "", email: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, ...formData });
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await createCustomer.mutateAsync(formData);
        toast.success("Cliente cadastrado com sucesso!");
      }
      refetch();
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar cliente");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deseja excluir o cliente "${name}"?`)) return;
    try {
      await deleteCustomer.mutateAsync({ id });
      toast.success("Cliente excluído com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cliente");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" style={{ color: "#D4A15E" }} />
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie seus clientes cadastrados</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
          <Plus className="mr-2 h-4 w-4" />Novo Cliente
        </Button>
      </div>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-slate-700">Lista de Clientes</CardTitle>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF/CNPJ ou telefone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 border-2" style={{ borderColor: "#D4A15E" }} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filteredCustomers?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.cpfCnpj || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(c.id, c.name)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" required /></div>
            <div><Label>CPF/CNPJ</Label><Input value={formData.cpfCnpj} onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })} placeholder="000.000.000-00" maxLength={18} /></div>
            <div><Label>Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" maxLength={20} /></div>
            <div><Label>E-mail</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" /></div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }} disabled={createCustomer.isPending || updateCustomer.isPending}>
                {editingCustomer ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
