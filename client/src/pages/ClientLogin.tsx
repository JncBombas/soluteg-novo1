import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, AlertCircle } from "lucide-react";
import { APP_LOGO } from "@/const";
import { toast } from "sonner";

export default function ClientLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Erro ao fazer login");
        toast.error(data.error || "Credenciais inválidas");
        return;
      }

      const data = await response.json();
      localStorage.setItem("clientId", data.clientId.toString());
      localStorage.setItem("clientName", data.clientName);
      toast.success("Login realizado com sucesso!");
      // Aguardar um pouco para garantir que o localStorage foi atualizado
      setTimeout(() => {
        setLocation("/client/portal");
      }, 500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao conectar com o servidor";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black text-white py-4 border-b border-gray-700">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <img src={APP_LOGO} alt="JNC Logo" className="h-10" />
          <div className="text-sm">
            <div className="font-semibold">JNC Comércio</div>
            <div className="text-xs text-gray-400">(Soluteg)</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Portal do Cliente</h1>
            <p className="text-gray-400">Acesse seus documentos e relatórios</p>
          </div>

          {/* Card de Login */}
          <Card className="border-gray-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-white">Entrar</CardTitle>
              <CardDescription className="text-gray-400">
                Digite suas credenciais para acessar o portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Erro */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {/* Campo de Usuário */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-200">
                    Nome de Usuário
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Campo de Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Botão de Login */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {/* Mensagem de Ajuda */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>Não tem acesso?</strong> Entre em contato com o administrador do sistema para criar sua conta.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 JNC Comércio e Serviços Técnicos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
