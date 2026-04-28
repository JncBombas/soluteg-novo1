import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { APP_LOGO } from "@/const";
import { Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/gestor/dashboard";

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
      if (rememberLogin) {
        localStorage.setItem("adminLoginUsername", username);
        localStorage.setItem("adminRememberLogin", "true");
      } else {
        localStorage.removeItem("adminLoginUsername");
        localStorage.removeItem("adminRememberLogin");
      }
      toast.success("Login realizado com sucesso!");
      setLocation(redirectTo);
    },
    onError: (error) => {
      toast.error("Credenciais inválidas. Verifique usuário e senha.");
      console.error(error);
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
    <div className="min-h-screen flex">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-slate-900 text-white p-12">
        <div className="flex items-center gap-3">
          <img src={APP_LOGO} alt="Soluteg" className="h-10 object-contain" />
          <div>
            <div className="font-bold text-sm">Soluteg</div>
            <div className="text-xs text-slate-400">Painel Administrativo</div>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-light leading-relaxed text-slate-200 mb-6">
            "Gestão eficiente para condomínios mais{" "}
            <span className="text-amber-400 font-medium">seguros</span> e bem
            administrados."
          </blockquote>
          <div className="flex gap-3">
            {[
              { value: "7+", label: "Anos" },
              { value: "100+", label: "Condomínios" },
              { value: "24/7", label: "Suporte" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex-1 bg-slate-800 rounded-xl p-4 text-center"
              >
                <div className="text-xl font-bold text-amber-400">{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Soluteg — JNC Comércio e Serviços Técnicos
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <img
              src={APP_LOGO}
              alt="Soluteg"
              className="h-16 object-contain mb-3"
            />
            <h1 className="text-xl font-bold text-slate-900">Soluteg</h1>
            <p className="text-sm text-slate-500">Painel Administrativo</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-sm text-slate-500 mt-1">
              Faça login para acessar o painel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuário */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="username"
                  className="pl-9 bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 h-11"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-10 bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Lembrar */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <Label
                htmlFor="remember"
                className="text-sm text-slate-600 font-normal cursor-pointer"
              >
                Lembrar meu usuário
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-md shadow-amber-500/20 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              Não tem acesso? Contate o administrador do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
