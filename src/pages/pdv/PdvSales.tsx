import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Trash2, Printer, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface CartItem {
  productId: number;
  productName: string;
  unitPrice: string;
  quantity: number;
  subtotal: number;
}

export default function PdvSales() {
  const [barcode, setBarcode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "cartao_debito" | "cartao_credito" | "pix">("dinheiro");
  const [amountPaid, setAmountPaid] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getProductByBarcode = trpc.pdv.products.getByBarcode.useQuery({ barcode }, { enabled: false });
  const searchProducts = trpc.pdv.products.search.useQuery({ query: searchName }, { enabled: searchName.length >= 2 });
  const createSale = trpc.pdv.sales.create.useMutation();
  const getSale = trpc.pdv.sales.getById.useQuery({ id: lastSale?.saleId || 0 }, { enabled: !!lastSale?.saleId });

  useEffect(() => { barcodeInputRef.current?.focus(); }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        e.preventDefault();
        setBarcode(barcodeBuffer);
        setBarcodeBuffer("");
        barcodeInputRef.current?.focus();
        setTimeout(() => getProductByBarcode.refetch(), 100);
        return;
      }
      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        barcodeTimeoutRef.current = setTimeout(() => setBarcodeBuffer(""), 200);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    };
  }, [barcodeBuffer]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.length !== 13) { toast.error("Código de barras deve ter 13 dígitos"); return; }
    try {
      const result = await getProductByBarcode.refetch();
      const product = result.data;
      if (!product) { toast.error("Produto não encontrado"); setBarcode(""); return; }
      if (product.stock <= 0) { toast.error("Produto sem estoque"); setBarcode(""); return; }
      const existing = cart.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error("Estoque insuficiente"); setBarcode(""); return; }
        setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * parseFloat(i.unitPrice) } : i));
      } else {
        setCart([...cart, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, subtotal: parseFloat(product.price) }]);
      }
      toast.success(`${product.name} adicionado ao carrinho`);
      setBarcode("");
      barcodeInputRef.current?.focus();
    } catch (error: any) { toast.error(error.message || "Erro ao buscar produto"); setBarcode(""); }
  };

  const handleQuantityChange = (productId: number, newQty: number) => {
    if (newQty <= 0) { setCart(cart.filter(i => i.productId !== productId)); return; }
    setCart(cart.map(i => i.productId === productId ? { ...i, quantity: newQty, subtotal: newQty * parseFloat(i.unitPrice) } : i));
  };

  const handleAddProductBySearch = (product: any) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * parseFloat(i.unitPrice) } : i));
    } else {
      setCart([...cart, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, subtotal: parseFloat(product.price) }]);
    }
    setSearchName(""); setShowSuggestions(false);
    toast.success(`${product.name} adicionado`);
    searchInputRef.current?.focus();
  };

  const calcSubtotal = () => cart.reduce((s, i) => s + i.subtotal, 0);
  const calcDiscount = () => discountType === "percentage" ? (calcSubtotal() * discount) / 100 : discount;
  const calcTotal = () => calcSubtotal() - calcDiscount();
  const calcChange = () => { const t = calcTotal(); return amountPaid > t ? amountPaid - t : 0; };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) { toast.error("Carrinho vazio"); return; }
    if (paymentMethod === "dinheiro" && amountPaid > 0 && amountPaid < calcTotal()) { toast.error("Valor pago menor que o total"); return; }
    try {
      const result = await createSale.mutateAsync({ items: cart, discount, discountType, paymentMethod, amountPaid: amountPaid > 0 ? amountPaid : undefined });
      setLastSale(result); setShowReceipt(true);
      setCart([]); setDiscount(0); setDiscountType("fixed"); setAmountPaid(0);
      toast.success("Venda finalizada com sucesso!");
    } catch (error: any) { toast.error(error.message || "Erro ao finalizar venda"); }
  };

  const handlePrintReceipt = () => {
    const orig = document.title;
    document.title = `JNC Componentes Elétricos - Sistema Soluteg #${lastSale?.saleId || "CUPOM"}`;
    window.print();
    setTimeout(() => { document.title = orig; }, 1000);
  };

  const total = calcTotal();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Ponto de Venda</h1>
            <p className="text-slate-300 mt-1">Use o leitor de código de barras ou digite manualmente</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
            <CardHeader className="bg-slate-50">
              <CardTitle className="text-slate-700">Adicionar Produto</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-slate-600 mb-1 block">Código de Barras</Label>
                  <Input ref={barcodeInputRef} placeholder="Digite ou escaneie o código de barras (13 dígitos)"
                    value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
                    maxLength={13} autoFocus className="border-2" style={{ borderColor: "#D4A15E" }} />
                </div>
                <Button type="submit" className="bg-gradient-to-r from-slate-700 to-slate-800 mt-5" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>Adicionar</Button>
              </form>

              <div className="relative">
                <Label className="text-xs text-slate-600 mb-1 block">Buscar por Nome</Label>
                <Input ref={searchInputRef} placeholder="Digite o nome do produto..."
                  value={searchName} onChange={(e) => { setSearchName(e.target.value); setShowSuggestions(e.target.value.length >= 2); }}
                  onFocus={() => searchName.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="border-2" style={{ borderColor: "#D4A15E" }} />
                {showSuggestions && searchProducts.data && searchProducts.data.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: "#D4A15E" }}>
                    {searchProducts.data.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => handleAddProductBySearch(p)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-100 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-700">{p.name}</div>
                          <div className="text-xs text-slate-500">Estoque: {p.stock}</div>
                        </div>
                        <div className="font-semibold" style={{ color: "#D4A15E" }}>R$ {parseFloat(p.price).toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
            <CardHeader className="bg-slate-50"><CardTitle className="text-slate-700">Carrinho</CardTitle></CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Escaneie um produto para começar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>R$ {parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>
                          <Input type="number" min="1" value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                            className="w-20" />
                        </TableCell>
                        <TableCell>R$ {item.subtotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
              <CardTitle className="text-white">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                  <span className="text-slate-600 font-medium">Itens:</span>
                  <span className="font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                  <span className="text-slate-600 font-medium">Produtos:</span>
                  <span className="font-semibold">{cart.length}</span>
                </div>
              </div>

              <div className="space-y-2 border-t-2 pt-4" style={{ borderColor: "#D4A15E" }}>
                <Label className="text-xs text-slate-700 mb-2 block">Desconto</Label>
                <div className="flex gap-2">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}
                    className="px-3 py-2 border-2 rounded-md bg-white text-slate-700 font-medium" style={{ borderColor: "#D4A15E" }}>
                    <option value="fixed">R$</option>
                    <option value="percentage">%</option>
                  </select>
                  <Input type="number" min="0" step="0.01" value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="flex-1 border-2" style={{ borderColor: "#D4A15E" }} placeholder="0.00" />
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                    <span className="text-slate-600 font-medium">Desconto:</span>
                    <span className="font-semibold text-red-600">- R$ {calcDiscount().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 pt-4" style={{ borderColor: "#D4A15E" }}>
                <div className="flex justify-between text-sm bg-slate-50 p-2 rounded mb-3">
                  <span className="text-slate-600 font-medium">Subtotal:</span>
                  <span className="font-semibold">R$ {calcSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-gradient-to-r from-slate-700 to-slate-800 p-4 rounded-lg">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-3xl font-bold" style={{ color: "#D4A15E" }}>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-700 mb-2 block">Forma de Pagamento</Label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border-2 rounded-md bg-white text-slate-700 font-medium" style={{ borderColor: "#D4A15E" }}>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="cartao_debito">💳 Cartão Débito</option>
                    <option value="cartao_credito">💳 Cartão Crédito</option>
                    <option value="pix">📱 PIX</option>
                  </select>
                </div>

                {paymentMethod === "dinheiro" && (
                  <div>
                    <Label className="text-xs text-slate-700 mb-2 block">Valor Pago (opcional)</Label>
                    <Input type="number" min="0" step="0.01" value={amountPaid || ""}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="border-2" style={{ borderColor: "#D4A15E" }} placeholder="0.00" />
                    {amountPaid > 0 && amountPaid >= total && (
                      <div className="mt-2 bg-green-50 p-2 rounded border-2" style={{ borderColor: "#D4A15E" }}>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">Troco:</span>
                          <span className="font-bold text-green-600">R$ {calcChange().toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white" size="lg"
                  onClick={handleFinalizeSale} disabled={cart.length === 0 || createSale.isPending}
                  style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
                  <Check className="mr-2 h-5 w-5" />
                  Finalizar Venda
                </Button>
              </div>

              {cart.length > 0 && (
                <Button variant="outline" className="w-full" onClick={() => setCart([])}>Limpar Carrinho</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: fixed; left: 0; top: 0; width: 80mm; padding: 8px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Venda Finalizada!</DialogTitle></DialogHeader>
          <div className="print-receipt">
            <div className="text-center mb-2">
              <img src="/logo-jnc-novo.webp" alt="JNC" className="h-12 mx-auto mb-1 object-contain" />
              <p className="text-[10px] font-semibold">JNC Comércio e Serviços</p>
              <p className="text-[10px]">Av. Pres. Kennedy, 8566</p>
              <p className="text-[10px]">Mirim - Praia Grande/SP</p>
            </div>
            <div className="border-t border-b border-dashed py-1 my-1">
              <div className="flex justify-between text-[10px]">
                <span className="font-bold">CUPOM Nº {lastSale?.saleId}</span>
                <span>{new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            </div>
            {getSale.data?.items?.map((item: any, i: number) => (
              <div key={i} className="text-[10px] mb-1">
                <div className="font-medium">{item.productName}</div>
                <div className="flex justify-between">
                  <span>{item.quantity} x R$ {parseFloat(item.unitPrice).toFixed(2)}</span>
                  <span className="font-medium">R$ {parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-dashed pt-1 mt-1 mb-2">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span style={{ color: "#D4A15E" }}>R$ {lastSale?.total?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] mt-0.5">
                <span>Pagamento:</span>
                <span className="font-medium">
                  {getSale.data?.paymentMethod === "dinheiro" && "Dinheiro"}
                  {getSale.data?.paymentMethod === "cartao_debito" && "Cartão Débito"}
                  {getSale.data?.paymentMethod === "cartao_credito" && "Cartão Crédito"}
                  {getSale.data?.paymentMethod === "pix" && "PIX"}
                </span>
              </div>
              {getSale.data?.amountPaid && parseFloat(getSale.data.amountPaid) > 0 && (
                <div className="space-y-0.5 mt-1">
                  <div className="flex justify-between text-[10px]">
                    <span>Valor Pago:</span>
                    <span>R$ {parseFloat(getSale.data.amountPaid).toFixed(2)}</span>
                  </div>
                  {getSale.data?.change && parseFloat(getSale.data.change) > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span>Troco:</span>
                      <span className="font-bold text-green-600">R$ {parseFloat(getSale.data.change).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-center mt-2 text-[10px]">
              <p className="font-medium">Obrigado pela preferência!</p>
              <p>Volte sempre!</p>
            </div>
            <div className="mt-6 pt-2">
              <div className="border-b border-black mt-8 mb-1 mx-4"></div>
              <p className="text-[10px] text-center text-slate-600">Assinatura do Cliente</p>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-4">Sistema Soluteg de Vendas</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button onClick={handlePrintReceipt} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />Imprimir Cupom
            </Button>
            <Button variant="outline" onClick={() => { setShowReceipt(false); setLastSale(null); barcodeInputRef.current?.focus(); }} className="flex-1">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
