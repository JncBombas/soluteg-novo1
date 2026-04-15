import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";

type ParsedRow = {
  name: string;
  barcode?: string;
  price: string;
  costPrice?: string;
  stock?: string;
  minStock?: string;
  unit?: string;
  description?: string;
  _error?: string;
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

  const colMap: Record<string, string> = {
    "nome": "name", "name": "name",
    "codigo": "barcode", "barcode": "barcode", "ean": "barcode", "código": "barcode",
    "preco": "price", "preço": "price", "price": "price", "valor": "price",
    "custo": "costPrice", "cost": "costPrice", "preco_custo": "costPrice",
    "estoque": "stock", "stock": "stock", "quantidade": "stock", "qty": "stock",
    "estoque_minimo": "minStock", "min_stock": "minStock", "minimo": "minStock",
    "unidade": "unit", "unit": "unit",
    "descricao": "description", "descrição": "description", "description": "description",
  };

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      const row: any = {};
      header.forEach((h, i) => {
        const mapped = colMap[h];
        if (mapped) row[mapped] = cols[i] || "";
      });
      if (!row.name) row._error = "Nome obrigatório";
      if (!row.price || isNaN(parseFloat(row.price))) row._error = (row._error ? row._error + "; " : "") + "Preço inválido";
      return row as ParsedRow;
    });
}


export default function PdvImport() {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importBatch = trpc.pdv.products.importBatch.useMutation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        setParsedRows(rows);
        if (rows.length === 0) toast.error("Arquivo vazio ou sem dados válidos");
      } catch {
        toast.error("Erro ao processar arquivo");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    const valid = parsedRows.filter(r => !r._error);
    if (valid.length === 0) { toast.error("Nenhum produto válido para importar"); return; }
    if (!confirm(`Importar ${valid.length} produto(s)?`)) return;

    setIsImporting(true);
    try {
      const products = valid.map(r => ({
        name: r.name,
        barcode: r.barcode || undefined,
        price: r.price,
        costPrice: r.costPrice || undefined,
        stock: r.stock ? parseInt(r.stock) : 0,
        minStock: r.minStock ? parseInt(r.minStock) : 5,
        unit: r.unit || "un",
        description: r.description || undefined,
      }));

      const result = await importBatch.mutateAsync({ products });
      setResults({
        success: result.imported,
        errors: result.errors || [],
      });
      toast.success(`${result.imported} produto(s) importado(s) com sucesso!`);
      setParsedRows([]);
      setFileName("");
    } catch (err: any) {
      toast.error(err.message || "Erro na importação");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => !r._error).length;
  const errorCount = parsedRows.filter(r => !!r._error).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pdv/produtos">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar Produtos via CSV</h1>
          <p className="text-muted-foreground text-sm">Importe produtos em massa a partir de um arquivo CSV</p>
        </div>
      </div>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
          <CardTitle className="text-white flex items-center gap-2"><FileText className="h-5 w-5" />Importar Produtos via CSV</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">O arquivo CSV deve conter as seguintes colunas (a primeira linha deve ser o cabeçalho):</p>
          <div className="bg-slate-50 rounded p-3 font-mono text-xs overflow-x-auto">
            <p className="font-bold text-slate-700 mb-1">Colunas aceitas:</p>
            <p><span className="text-red-600">nome*</span>, <span className="text-red-600">preco*</span>, codigo, custo, estoque, estoque_minimo, unidade, descricao</p>
            <p className="mt-2 text-slate-500">Exemplo:</p>
            <p>nome,preco,codigo,estoque,unidade</p>
            <p>Cabo Flexível 2.5mm,3.50,7891234567890,100,m</p>
            <p>Disjuntor 16A,28.90,7897654321098,50,un</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">* Campos obrigatórios | Encoding: UTF-8 | Separador: vírgula (,)</p>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
        <CardHeader><CardTitle>Selecionar Arquivo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input type="file" accept=".csv,.txt" ref={fileInputRef} className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} style={{ borderColor: "#D4A15E" }}>
              <Upload className="mr-2 h-4 w-4" />Selecionar CSV
            </Button>
            {fileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{fileName}</span>
                <span className="text-muted-foreground">— {parsedRows.length} linha(s)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedRows.length > 0 && (
        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pré-visualização</CardTitle>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" />{validCount} válidos</span>
                {errorCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />{errorCount} com erro</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Unidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row._error ? "bg-red-50" : ""}>
                      <TableCell>
                        {row._error
                          ? <span className="flex items-center gap-1 text-red-600 text-xs"><XCircle className="h-3 w-3" />{row._error}</span>
                          : <CheckCircle className="h-4 w-4 text-green-600" />
                        }
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.barcode || "—"}</TableCell>
                      <TableCell>R$ {row.price}</TableCell>
                      <TableCell>{row.stock || "0"}</TableCell>
                      <TableCell>{row.unit || "un"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-600 mr-4">
                  <AlertTriangle className="h-3 w-3" />Linhas com erro serão ignoradas
                </span>
              )}
              <Button onClick={handleImport} disabled={isImporting || validCount === 0} className="bg-gradient-to-r from-slate-700 to-slate-800" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Importando..." : `Importar ${validCount} produto(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card className="border-2 border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-bold text-green-700">{results.success} produto(s) importado(s) com sucesso!</p>
                {results.errors.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">{results.errors.length} erro(s): {results.errors.slice(0, 3).join("; ")}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
