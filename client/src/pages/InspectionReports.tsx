import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function InspectionReports() {
  const [, navigate] = useLocation();

  const handleDownloadTemplate = () => {
    // Download do template PDF
    const link = document.createElement('a');
    link.href = '/template-relatorio.pdf';
    link.download = 'template-relatorio.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenForm = () => {
    // Link do formulário Google que você criou
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfD-w9OdpCsEIVMBSJrbdhm9z4DzIBX5qUxBHs6-nuZ2G9ufw/viewform?usp=dialog";
    window.open(formUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Relatórios de Inspeção</h1>
          <p className="text-gray-600">Preencha o formulário para registrar uma nova inspeção de bombas</p>
        </div>

        {/* Cards de Ação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card do Formulário */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Preencher Formulário</h2>
                <p className="text-gray-600 text-sm">Acesse o formulário Google para registrar os dados da inspeção</p>
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
                <p className="text-gray-600 text-sm">Baixe o template em PDF para referência ou impressão</p>
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

        {/* Instruções */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-3">Como Usar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Clique em "Abrir Formulário" para acessar o formulário de inspeção</li>
            <li>Preencha todos os dados da inspeção (cliente, endereço, medições, etc.)</li>
            <li>Faça upload das fotos da inspeção no formulário</li>
            <li>Envie o formulário</li>
            <li>Os dados serão registrados automaticamente</li>
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
