import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tags, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PdvCategories() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories, refetch } = trpc.pdv.categories.list.useQuery();
  const create = trpc.pdv.categories.create.useMutation();
  const update = trpc.pdv.categories.update.useMutation();
  const remove = trpc.pdv.categories.delete.useMutation();

  const handleOpen = (cat?: any) => {
    if (cat) { setEditing(cat); setName(cat.name); setDescription(cat.description || ""); }
    else { setEditing(null); setName(""); setDescription(""); }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: name.trim(), description: description.trim() || undefined });
        toast.success("Categoria atualizada!");
      } else {
        await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
        toast.success("Categoria criada!");
      }
      refetch();
      setShowDialog(false);
    } catch (err: any) { toast.error(err.message || "Erro ao salvar"); }
  };

  const handleDelete = async (id: number, catName: string) => {
    if (!confirm(`Excluir categoria "${catName}"? Os produtos perderão esta categoria.`)) return;
    try {
      await remove.mutateAsync({ id });
      toast.success("Categoria excluída!");
      refetch();
    } catch (err: any) { toast.error(err.message || "Erro ao excluir"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="h-8 w-8" style={{ color: "#D4A15E" }} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground">Organize os produtos por categoria</p>
          </div>
        </div>
        <Button onClick={() => handleOpen()} className="bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
          <Plus className="mr-2 h-4 w-4" />Nova Categoria
        </Button>
      </div>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-slate-700">{categories?.length || 0} categoria(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada</TableCell></TableRow>
              ) : categories?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpen(c)} style={{ borderColor: "#D4A15E", color: "#D4A15E" }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(c.id, c.name)} style={{ borderColor: "#dc2626" }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cabos e Fios" required /></div>
            <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" /></div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} style={{ borderColor: "#D4A15E", color: "#D4A15E" }}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }} disabled={create.isPending || update.isPending}>
                {editing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
