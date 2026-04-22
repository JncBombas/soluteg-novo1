import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ArrowLeft, QrCode } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useEffect } from "react";

export default function PdvProductLabel() {
  const [, params] = useRoute("/pdv/produtos/etiqueta/:id");
  const productId = params?.id ? parseInt(params.id) : 0;

  const { data: product } = trpc.pdv.products.getById.useQuery(
    { id: productId },
    { enabled: productId > 0 }
  );

  const { data: barcodeImage } = trpc.pdv.barcode.getImage.useQuery(
    { barcode: product?.barcode || "" },
    { enabled: !!product?.barcode }
  );

  useEffect(() => {
    if (product) {
      document.title = `Etiqueta - ${product.name}`;
    }
    return () => { document.title = "Sistema Soluteg PDV"; };
  }, [product]);

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <QrCode className="mr-2 h-6 w-6" /> Carregando produto...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 no-print">
        <Link href="/pdv/produtos">
          <Button variant="outline" size="sm" style={{ borderColor: "#D4A15E", color: "#D4A15E" }}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">Etiqueta: {product.name}</h1>
        <Button onClick={() => window.print()} className="ml-auto bg-gradient-to-r from-slate-700 to-slate-800 text-white" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
          <Printer className="mr-2 h-4 w-4" />Imprimir
        </Button>
      </div>

      <div className="no-print">
        <p className="text-sm text-muted-foreground">Pré-visualização da etiqueta. Use Imprimir para enviar para a impressora.</p>
      </div>

      {/* Label preview area */}
      <div className="flex justify-center">
        <Card className="w-[220px] border-2 shadow-lg" style={{ borderColor: "#D4A15E" }}>
          <CardContent className="p-3 text-center">
            <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider mb-1">JNC Componentes</p>
            <p className="text-sm font-bold leading-tight mb-2">{product.name}</p>
            {barcodeImage?.imageBase64 ? (
              <div className="flex justify-center my-2">
                <img
                  src={`data:image/png;base64,${barcodeImage.imageBase64}`}
                  alt={product.barcode}
                  className="max-w-full h-16"
                />
              </div>
            ) : product.barcode ? (
              <div className="bg-slate-100 rounded py-3 my-2">
                <p className="font-mono text-xs">{product.barcode}</p>
              </div>
            ) : null}
            {product.barcode && (
              <p className="font-mono text-[9px] text-slate-600 mb-1">{product.barcode}</p>
            )}
            <div className="border-t pt-2 mt-2">
              <p className="text-lg font-bold" style={{ color: "#D4A15E" }}>
                R$ {parseFloat(product.price).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print-only area */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .print-label {
            width: 60mm;
            padding: 4mm;
            text-align: center;
            font-family: Arial, sans-serif;
            page-break-after: always;
          }
        }
      `}</style>

      <div className="print-label hidden print:block">
        <p style={{ fontSize: "7pt", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2mm" }}>JNC Componentes Elétricos</p>
        <p style={{ fontSize: "9pt", fontWeight: "bold", lineHeight: "1.2", marginBottom: "2mm" }}>{product.name}</p>
        {barcodeImage?.imageBase64 && (
          <img src={`data:image/png;base64,${barcodeImage.imageBase64}`} alt={product.barcode} style={{ width: "50mm", height: "auto", marginBottom: "1mm" }} />
        )}
        {product.barcode && <p style={{ fontSize: "7pt", fontFamily: "monospace", marginBottom: "2mm" }}>{product.barcode}</p>}
        <p style={{ fontSize: "14pt", fontWeight: "bold", marginTop: "2mm" }}>R$ {parseFloat(product.price).toFixed(2)}</p>
      </div>
    </div>
  );
}
