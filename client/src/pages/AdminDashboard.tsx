import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Home, User, FileText, Users } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Responsivo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-0">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-8 md:h-10" />
            <div className="flex-1">
              <h1 className="font-bold text-lg md:text-xl text-gray-900">Painel Administrativo</h1>
              <p className="text-xs md:text-sm text-gray-500">Bem-vindo à área restrita</p>
            </div>
          </div>

          {/* Botões - Responsivos */}
          <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-0 md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/admin/profile")}
              className="gap-1 md:gap-2 text-xs md:text-sm flex-1 md:flex-none"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Meu Perfil</span>
              <span className="md:hidden">Perfil</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="gap-1 md:gap-2 text-xs md:text-sm flex-1 md:flex-none"
            >
              <Home className="w-4 h-4" />
              <span className="hidden md:inline">Página Inicial</span>
              <span className="md:hidden">Início</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="gap-1 md:gap-2 text-xs md:text-sm flex-1 md:flex-none"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
              <span className="md:hidden">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 md:py-8">
        {/* Welcome Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-xl md:text-2xl">Bem-vindo ao Painel Administrativo</CardTitle>
            <CardDescription>
              Você está logado e tem acesso à área restrita do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm md:text-base text-gray-600">
              Este é o painel administrativo da Soluteg. Aqui você pode gerenciar as operações do sistema.
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Sistema Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Sistema</CardTitle>
              <CardDescription className="text-xs">Status do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full mr-2"></span>
                  Sistema Operacional
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full mr-2"></span>
                  Banco de Dados
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Acesso Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Acesso</CardTitle>
              <CardDescription className="text-xs">Informações de acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-gray-600">
                  <strong>Tipo:</strong> Administrador
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  <strong>Status:</strong> Autenticado
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ações Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Ações</CardTitle>
              <CardDescription className="text-xs">Operações disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-gray-600">
                  ✓ Gerenciar perfil
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  ✓ Alterar senha
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Relatórios Card - NOVO */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg text-blue-900">Relatórios</CardTitle>
              <CardDescription className="text-xs">Inspeção de bombas</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation("/admin/relatorios")}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm"
              >
                <FileText className="w-4 h-4" />
                Acessar Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Portal do Cliente Section */}
        <div className="mt-8">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Portal do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gerenciar Clientes Card */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg text-orange-900">Gerenciar Clientes</CardTitle>
                <CardDescription className="text-xs">Criar e gerenciar clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation("/admin/clientes")}
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-sm"
                >
                  <Users className="w-4 h-4" />
                  Acessar Clientes
                </Button>
              </CardContent>
            </Card>

            {/* Enviar Documentos Card */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg text-green-900">Enviar Documentos</CardTitle>
                <CardDescription className="text-xs">Upload de arquivos para clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation("/admin/documentos")}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Enviar Documentos
                </Button>
              </CardContent>
            </Card>

            {/* Gerenciar Documentos Card */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg text-purple-900">Gerenciar Documentos</CardTitle>
                <CardDescription className="text-xs">Editar, deletar e substituir documentos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation("/admin/manage-documents")}
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Gerenciar Documentos
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
