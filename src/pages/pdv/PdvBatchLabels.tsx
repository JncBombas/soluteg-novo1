import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Printer, ArrowLeft, Package } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";

type Layout = {
  key: string;
  label: string;
  cols: number;
  rows: number;
  labelW: string;
  labelH: string;
};

const LAYOUTS: Layout[] = [
  { key: "pimaco6180", label: "Pimaco 6180 (2x5 - A4)", cols: 2, rows: 5, labelW: "99mm", labelH: "57mm" },
  { key: "pimaco6182", label: "Pimaco 6182 (3x10 - A4)", cols: 3, rows: 10, labelW: "64mm", labelH: "29mm" },
  { key: "pimaco6183", label: "Pimaco 6183 (4x10 - A4)", cols: 4, rows: 10, labelW: "49mm", labelH: "29mm" },
  { key: "thermal58", label: "Etiqueta Térmica 58mm", cols: 1, rows: 999, labelW: "54mm", labelH: "30mm" },
  { key: "thermal80", label: "Etiqueta Térmica 80mm", cols: 1, rows: 999, labelW: "76mm", labelH: "30mm" },
];

type LabelEntry = { productId: number; qty: number };

export default function PdvBatchLabels() {
  const [layout, setLayout] = useState<string>("pimaco6180");
  const [entries, setEntries] = useState<LabelEntry[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids")?.split(",").map(Number).filter(Boolean) || [];
    return ids.map(id => ({ productId: id, qty: 1 }));
  });

  const { data: products } = trpc.pdv.products.list.useQuery();

  const selectedProducts = useMemo(() => {
    return entries
      .map(e => ({ ...e, product: products?.find((p: any) => p.id === e.productId) }))
      .filter(e => e.product);
  }, [entries, products]);

  const barcodeQueries = selectedProducts.map(e =>
    trpc.pdv.barcode.getImage.useQuery(
      { barcode: e.product?.barcode || "" },
      { enabled: !!e.product?.barcode }
    )
  );

  const selectedLayout = LAYOUTS.find(l => l.key === layout) || LAYOUTS[0];

  const expandedLabels = useMemo(() => {
    const result: Array<{ product: any; barcodeBase64?: string }> = [];
    selectedProducts.forEach((e, idx) => {
      const img = barcodeQueries[idx]?.data?.imageBase64;
      for (let i = 0; i < e.qty; i++) {
        result.push({ product: e.product, barcodeBase64: img });
      }
    });
    return result;
  }, [selectedProducts, barcodeQueries]);

  const addProduct = (id: number) => {
    if (entries.find(e => e.productId === id)) return;
    setEntries(prev => [...prev, { productId: id, qty: 1 }]);
  };

  const updateQty = (id: number, qty: number) => {
    setEntries(prev => prev.map(e => e.productId === id ? { ...e, qty: Math.max(1, qty) } : e));
  };

  const removeEntry = (id: number) => {
    setEntries(prev => prev.filter(e => e.productId !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Link href="/pdv/produtos">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">Impressão em Lote de Etiquetas</h1>
        <Button onClick={() => window.print()} className="ml-auto bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
          <Printer className="mr-2 h-4 w-4" />Imprimir ({expandedLabels.length})
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 no-print">
        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Layout / Folha</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map(l => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adicionar Produto</Label>
              <select
                className="w-full px-3 py-2 border-2 rounded-md mt-1"
                style={{ borderColor: "#D4A15E" }}
                value=""
                onChange={(e) => { if (e.target.value) addProduct(parseInt(e.target.value)); }}
              >
                <option value="">Selecione um produto...</option>
                {products?.filter((p: any) => !entries.find(e => e.productId === p.id)).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader><CardTitle>Produtos Selecionados ({entries.length})</CardTitle></CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhum produto selecionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map(({ product, productId, qty }) => (
                  <div key={productId} className="flex items-center gap-3 p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product?.name}</p>
                      <p className="text-xs text-muted-foreground">R$ {parseFloat(product?.price || "0").toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Qtd:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => updateQty(productId, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      <Button variant="ghost" size="sm" className="text-red-500 h-8 px-2" onClick={() => removeEntry(productId)}>✕</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print area */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-grid {
            display: grid;
            grid-template-columns: repeat(${selectedLayout.cols}, ${selectedLayout.labelW});
            gap: 0;
            margin: 0;
            padding: 0;
          }
          .print-label-cell {
            width: ${selectedLayout.labelW};
            height: ${selectedLayout.labelH};
            padding: 2mm;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            border: 0.5pt dashed #ccc;
          }
          body { margin: 0; }
        }
        @media screen {
          .print-grid {
            display: grid;
            grid-template-columns: repeat(${Math.min(selectedLayout.cols, 4)}, 1fr);
            gap: 8px;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .print-label-cell {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 8px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
        }
      `}</style>

      {expandedLabels.length > 0 && (
        <div className="print-grid">
          {expandedLabels.map((item, idx) => (
            <div key={idx} className="print-label-cell">
              <p style={{ fontSize: "6pt", fontWeight: "bold", textTransform: "uppercase", color: "#666" }}>JNC Componentes</p>
              <p style={{ fontSize: "7pt", fontWeight: "bold", lineHeight: "1.2" }}>{item.product?.name}</p>
              {item.barcodeBase64 ? (
                <img
                  src={`data:image/png;base64,${item.barcodeBase64}`}
                  alt={item.product?.barcode}
                  style={{ maxWidth: "100%", height: "20mm", objectFit: "contain" }}
                />
              ) : item.product?.barcode ? (
                <p style={{ fontSize: "7pt", fontFamily: "monospace" }}>{item.product?.barcode}</p>
              ) : null}
              {item.product?.barcode && (
                <p style={{ fontSize: "6pt", fontFamily: "monospace", color: "#444" }}>{item.product?.barcode}</p>
              )}
              <p style={{ fontSize: "11pt", fontWeight: "bold", color: "#D4A15E" }}>
                R$ {parseFloat(item.product?.price || "0").toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
