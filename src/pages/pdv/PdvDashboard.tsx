import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PdvDashboard() {
  const { data: stats, isLoading } = trpc.pdv.dashboard.stats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" style={{ backgroundColor: "#2D3748" }}>
            <CardTitle className="text-sm font-medium text-white">Vendas Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4" style={{ color: "#D4A15E" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todaySales.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold" style={{ color: "#D4A15E" }}>R$ {Number(stats?.todaySales.total || 0).toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" style={{ backgroundColor: "#2D3748" }}>
            <CardTitle className="text-sm font-medium text-white">Saldo em Caixa</CardTitle>
            <DollarSign className="h-4 w-4" style={{ color: "#D4A15E" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: "#D4A15E" }}>
              R$ {Number(stats?.cashBalance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo atual</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" style={{ backgroundColor: "#2D3748" }}>
            <CardTitle className="text-sm font-medium text-white">Estoque Baixo</CardTitle>
            <Package className="h-4 w-4" style={{ color: "#D4A15E" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos com estoque baixo</p>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: "#D4A15E" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" style={{ backgroundColor: "#2D3748" }}>
            <CardTitle className="text-sm font-medium text-white">Mais Vendidos</CardTitle>
            <Package className="h-4 w-4" style={{ color: "#D4A15E" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topProducts.length || 0}</div>
            <p className="text-xs text-muted-foreground">Produtos no ranking</p>
          </CardContent>
        </Card>
      </div>

      {stats && stats.lowStockCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção: Estoque Baixo</AlertTitle>
          <AlertDescription>
            Você tem {stats.lowStockCount} produto(s) com estoque abaixo do mínimo.
            <Link href="/pdv/produtos">
              <Button variant="link" className="px-2 h-auto">Ver produtos</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {stats && stats.topProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.slice(0, 5).map((product: any) => (
                <div key={product.productId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">{product.totalQuantity} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {Number(product.totalRevenue).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/pdv/vendas">
              <Button className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white" size="lg" style={{ borderColor: "#D4A15E", borderWidth: "2px" }}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Nova Venda
              </Button>
            </Link>
            <Link href="/pdv/produtos">
              <Button variant="outline" className="w-full" size="lg" style={{ borderColor: "#D4A15E", color: "#D4A15E" }}>
                <Package className="mr-2 h-4 w-4" />
                Cadastrar Produto
              </Button>
            </Link>
          </CardContent>
        </Card>

        {stats && stats.lowStockProducts.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Alertas de Estoque</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.lowStockProducts.slice(0, 5).map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{product.name}</span>
                    <span className="text-destructive font-medium ml-2">{product.stock} un.</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
