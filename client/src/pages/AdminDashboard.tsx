import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Home, User } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logout realizado com sucesso!");
      setLocation("/");
    },
    onError: (error) => {
      toast.error("Erro ao fazer logout: " + error.message);
    },
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-10" />
            <div>
              <h1 className="font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-sm text-gray-500">Bem-vindo à área restrita</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/profile")}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Meu Perfil
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Página Inicial
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Bem-vindo ao Painel Administrativo</CardTitle>
              <CardDescription>
                Você está logado e tem acesso à área restrita do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Este é o painel administrativo da Soluteg. Aqui você pode gerenciar as operações do sistema.
              </p>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sistema</CardTitle>
              <CardDescription>Status do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Sistema Operacional
                </p>
                <p className="text-sm text-gray-600">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Banco de Dados Conectado
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acesso</CardTitle>
              <CardDescription>Informações de acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Tipo:</strong> Administrador
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> Autenticado
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
              <CardDescription>Operações disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  ✓ Gerenciar perfil
                </p>
                <p className="text-sm text-gray-600">
                  ✓ Alterar senha
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
