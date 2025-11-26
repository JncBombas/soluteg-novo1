import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, FileText, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function InspectionReports() {
  const [, navigate] = useLocation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Verificar se há token no localStorage
  useEffect(() => {
    const token = localStorage.getItem("google_drive_token");
    if (token) {
      setAccessToken(token);
    }

    // Verificar se voltou do callback do Google
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    try {
      setIsAuthenticating(true);
      // Aqui você faria a troca do código por um token
      // Por enquanto, vamos simular salvando o código
      localStorage.setItem("google_drive_token", code);
      setAccessToken(code);
      toast.success("Autenticado com Google Drive!");
      // Remover o código da URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      toast.error("Erro ao autenticar com Google Drive");
      console.error(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/template-relatorio.pdf";
    link.download = "template-relatorio.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenForm = () => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSfD-w9OdpCsEIVMBSJrbdhm9z4DzIBX5qUxBHs6-nuZ2G9ufw/viewform?usp=dialog";
    window.open(formUrl, "_blank");
  };

  const handleAuthenticateGoogleDrive = () => {
    setIsAuthenticating(true);
    // Redirecionar para o Google OAuth
    const clientId = "111083419158-l9nolq37evli3q0s7e82vkfposaoeh66.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/admin/relatorios`;
    const scope = "https://www.googleapis.com/auth/drive.readonly";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;

    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Relatórios de Inspeção</h1>
          <p className="text-gray-600">
            Preencha o formulário para registrar uma nova inspeção de bombas
          </p>
        </div>

        {/* Cards de Ação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card do Formulário */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Preencher Formulário</h2>
                <p className="text-gray-600 text-sm">
                  Acesse o formulário Google para registrar os dados da inspeção
                </p>
              </div>
              <ExternalLink className="w-6 h-6 text-blue-500" />
            </div>
            <Button
              onClick={handleOpenForm}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Abrir Formulário
            </Button>
          </Card>

          {/* Card do Template PDF */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Template do Relatório</h2>
                <p className="text-gray-600 text-sm">
                  Baixe o template em PDF para referência ou impressão
                </p>
              </div>
              <Download className="w-6 h-6 text-green-500" />
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full"
            >
              Baixar Template PDF
            </Button>
          </Card>
        </div>

        {/* Card de Autenticação Google Drive */}
        {!accessToken ? (
          <Card className="p-6 bg-amber-50 border-amber-200 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-amber-900">
                  Conectar ao Google Drive
                </h2>
                <p className="text-amber-800 text-sm">
                  Autentique para acessar os relatórios gerados no seu Drive
                </p>
              </div>
              <LogIn className="w-6 h-6 text-amber-600" />
            </div>
            <Button
              onClick={handleAuthenticateGoogleDrive}
              disabled={isAuthenticating}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isAuthenticating ? "Autenticando..." : "Conectar Google Drive"}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 bg-green-50 border-green-200 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-green-900">
                  ✓ Conectado ao Google Drive
                </h2>
                <p className="text-green-800 text-sm">
                  Você pode acessar os relatórios gerados
                </p>
              </div>
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </Card>
        )}

        {/* Instruções */}
        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <h3 className="font-semibold mb-3">Como Usar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Clique em "Abrir Formulário" para acessar o formulário de inspeção</li>
            <li>Preencha todos os dados da inspeção (cliente, endereço, medições, etc.)</li>
            <li>Faça upload das fotos da inspeção no formulário</li>
            <li>Envie o formulário</li>
            <li>O Document Studio gerará o PDF automaticamente na pasta "Relatórios"</li>
            <li>Conecte ao Google Drive para visualizar e baixar os PDFs gerados</li>
          </ol>
        </Card>

        {/* Botão de Voltar */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
