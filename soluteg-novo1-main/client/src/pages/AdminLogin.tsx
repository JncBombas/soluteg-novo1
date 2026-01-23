import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";
import { CheckCircle2 } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar username salvo ao abrir a página
  useEffect(() => {
    const savedUsername = localStorage.getItem("adminLoginUsername");
    const wasRemembered = localStorage.getItem("adminRememberLogin") === "true";
    
    if (savedUsername && wasRemembered) {
      setUsername(savedUsername);
      setRememberLogin(true);
    }
  }, []);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("adminId", data.admin.id.toString());
      localStorage.setItem("adminEmail", data.admin.email);
      localStorage.setItem("adminName", data.admin.name || "");
      localStorage.setItem("adminCustomLabel", data.admin.customLabel || "");
      
      // Salvar username se "Lembrar login" estiver marcado
      if (rememberLogin) {
        localStorage.setItem("adminLoginUsername", username);
        localStorage.setItem("adminRememberLogin", "true");
      } else {
        localStorage.removeItem("adminLoginUsername");
        localStorage.removeItem("adminRememberLogin");
      }
      
      toast.success("Login realizado com sucesso!");
      setLocation("/admin/dashboard");
    },
    onError: (error) => {
      toast.error("Erro ao fazer login: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ username, password });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Área Administrativa</h1>
          <p className="text-gray-400 mt-2">Acesso restrito</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Faça login com seu usuário e senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                  Lembrar meu usuário
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Não tem acesso? Contate o administrador do sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
