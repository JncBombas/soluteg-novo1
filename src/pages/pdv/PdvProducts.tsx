import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Package, Plus, Search, MoreVertical, Pencil, Trash2, Tag, QrCode, Power, AlertTriangle, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type ProductForm = {
  name: string;
  barcode: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  categoryId: string;
  unit: string;
  description: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", barcode: "", price: "", costPrice: "", stock: "0",
  minStock: "5", categoryId: "none", unit: "un", description: "",
};

export default function PdvProducts() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedForLabels, setSelectedForLabels] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, refetch } = trpc.pdv.products.list.useQuery();
  const { data: categories } = trpc.pdv.categories.list.useQuery();
  const generateBarcode = trpc.pdv.barcode.generate.useMutation();
  const createProduct = trpc.pdv.products.create.useMutation();
  const updateProduct = trpc.pdv.products.update.useMutation();
  const deleteProduct = trpc.pdv.products.delete.useMutation();
  const toggleActive = trpc.pdv.products.toggleActive.useMutation();

  const filtered = products?.filter((p: any) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || String(p.categoryId) === filterCategory;
    const matchStock = filterStock === "all" ||
      (filterStock === "low" && p.stock <= p.minStock) ||
      (filterStock === "ok" && p.stock > p.minStock) ||
      (filterStock === "inactive" && !p.active);
    return matchSearch && matchCat && matchStock;
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setShowDialog(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name, barcode: p.barcode || "", price: p.price,
      costPrice: p.costPrice || "", stock: String(p.stock),
      minStock: String(p.minStock), categoryId: p.categoryId ? String(p.categoryId) : "none",
      unit: p.unit || "un", description: p.description || "",
    });
    setImageFile(null);
    setImagePreview(p.imageUrl || null);
    setShowDialog(true);
  };

  const handleGenerateBarcode = async () => {
    try {
      const res = await generateBarcode.mutateAsync();
      setForm(f => ({ ...f, barcode: res.barcode }));
    } catch { toast.error("Erro ao gerar código de barras"); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { toast.error("Preço inválido"); return; }

    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        const fd = new FormData();
        fd.append("file", imageFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) { const json = await res.json(); imageUrl = json.url; }
      } catch { /* upload optional */ }
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode || undefined,
      price: form.price,
      costPrice: form.costPrice || undefined,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 5,
      categoryId: form.categoryId && form.categoryId !== "none" ? parseInt(form.categoryId) : undefined,
      unit: form.unit || "un",
      description: form.description || undefined,
      imageUrl: imageUrl || (editingProduct?.imageUrl),
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...payload });
        toast.success("Produto atualizado!");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Produto cadastrado!");
      }
      refetch();
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar produto");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    try {
      await deleteProduct.mutateAsync({ id });
      toast.success("Produto excluído!");
      refetch();
    } catch (err: any) { toast.error(err.message || "Erro ao excluir"); }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleActive.mutateAsync({ id });
      refetch();
    } catch { toast.error("Erro ao alterar status"); }
  };

  const toggleLabelSelect = (id: number) => {
    setSelectedForLabels(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8" style={{ color: "#D4A15E" }} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedForLabels.length > 0 && (
            <Link href={`/pdv/produtos/etiquetas-lote?ids=${selectedForLabels.join(",")}`}>
              <Button variant="outline" style={{ borderColor: "#D4A15E" }}>
                <Tag className="mr-2 h-4 w-4" />
                Etiquetas ({selectedForLabels.length})
              </Button>
            </Link>
          )}
          <Link href="/pdv/importar">
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Importar</Button>
          </Link>
          <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
            <Plus className="mr-2 h-4 w-4" />Novo Produto
          </Button>
        </div>
      </div>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
          <CardTitle className="text-white flex items-center gap-2"><Search className="h-5 w-5" />Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-2" style={{ borderColor: "#D4A15E" }} />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 border-2 rounded-md" style={{ borderColor: "#D4A15E" }}>
              <option value="all">Todas as categorias</option>
              {categories?.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="w-full px-3 py-2 border-2 rounded-md" style={{ borderColor: "#D4A15E" }}>
              <option value="all">Todos os status</option>
              <option value="ok">Estoque normal</option>
              <option value="low">Estoque baixo</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-slate-700">
            {filtered?.length || 0} produto(s)
            {selectedForLabels.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">• {selectedForLabels.length} selecionado(s) para etiqueta</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedForLabels(filtered?.map((p: any) => p.id) || []);
                    else setSelectedForLabels([]);
                  }} />
                </TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-30" />
                  <p>Nenhum produto encontrado</p>
                </TableCell></TableRow>
              ) : filtered?.map((p: any) => {
                const cat = categories?.find((c: any) => c.id === p.categoryId);
                const isLow = p.stock <= p.minStock;
                return (
                  <TableRow key={p.id} className={!p.active ? "opacity-50" : ""}>
                    <TableCell>
                      <input type="checkbox" checked={selectedForLabels.includes(p.id)} onChange={() => toggleLabelSelect(p.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center border">
                            <Package className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.barcode || "—"}</TableCell>
                    <TableCell>{cat ? <Badge variant="outline">{cat.name}</Badge> : "—"}</TableCell>
                    <TableCell className="font-semibold" style={{ color: "#D4A15E" }}>R$ {parseFloat(p.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${isLow ? "text-red-600" : "text-green-600"}`}>
                        {p.stock} {p.unit}
                        {isLow && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                      </span>
                      <span className="text-xs text-muted-foreground block">mín: {p.minStock}</span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!p.active} onCheckedChange={() => handleToggleActive(p.id)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/pdv/produtos/etiqueta/${p.id}`}>
                              <QrCode className="mr-2 h-4 w-4" />Imprimir Etiqueta
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(p.id)}>
                            <Power className="mr-2 h-4 w-4" />{p.active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p.id, p.name)}>
                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do produto" required />
              </div>

              <div>
                <Label>Código de Barras</Label>
                <div className="flex gap-2">
                  <Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="EAN-13 ou livre" className="font-mono" />
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateBarcode} disabled={generateBarcode.isPending} title="Gerar EAN-13">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="m">Metro (m)</SelectItem>
                    <SelectItem value="l">Litro (l)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pc">Peça (pc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Preço de Venda *</Label>
                <Input value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" type="text" pattern="\d+(\.\d{1,2})?" required />
              </div>

              <div>
                <Label>Preço de Custo</Label>
                <Input value={form.costPrice} onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" type="text" />
              </div>

              <div>
                <Label>Estoque Atual</Label>
                <Input value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" />
              </div>

              <div>
                <Label>Estoque Mínimo</Label>
                <Input value={form.minStock} onChange={(e) => setForm(f => ({ ...f, minStock: e.target.value }))} type="number" min="0" />
              </div>

              <div className="col-span-2">
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição opcional" />
              </div>

              <div className="col-span-2">
                <Label>Imagem do Produto</Label>
                <div className="flex items-center gap-4 mt-1">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="h-20 w-20 rounded object-cover border-2" style={{ borderColor: "#D4A15E" }} />
                  ) : (
                    <div className="h-20 w-20 rounded bg-slate-100 flex items-center justify-center border-2 border-dashed" style={{ borderColor: "#D4A15E" }}>
                      <Package className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageChange} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />Selecionar imagem
                    </Button>
                    {imagePreview && (
                      <Button type="button" variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }} disabled={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
