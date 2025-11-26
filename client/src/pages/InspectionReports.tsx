import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function InspectionReports() {
  const [, navigate] = useLocation();

  const handleOpenForm = () => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSdfpnw1NYogdduiUpTPm7-5A236uEwqr242wXwGsa5GxwrkBg/viewform?usp=header";
    window.open(formUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Relatórios de Inspeção</h1>
          <p className="text-gray-600">
            Acesse o formulário para registrar uma nova inspeção de bombas
          </p>
        </div>

        {/* Card do Formulário */}
        <Card className="p-8 hover:shadow-lg transition-shadow mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-3">Preencher Formulário</h2>
              <p className="text-gray-600">
                Clique no botão abaixo para acessar o formulário de inspeção de bombas. 
                Preencha todos os dados, faça upload das fotos e envie. O relatório em PDF 
                será gerado automaticamente no Google Drive.
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-500 flex-shrink-0 ml-4" />
          </div>
          <Button
            onClick={handleOpenForm}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Abrir Formulário
          </Button>
        </Card>

        {/* Instruções */}
        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <h3 className="font-semibold mb-3 text-blue-900">Como Usar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Clique em "Abrir Formulário" para acessar o formulário de inspeção</li>
            <li>Preencha todos os dados da inspeção (cliente, endereço, medições, etc.)</li>
            <li>Faça upload das fotos da inspeção no formulário</li>
            <li>Envie o formulário</li>
            <li>O relatório em PDF será gerado automaticamente no Google Drive</li>
            <li>Acesse o Google Drive para baixar e assinar o relatório</li>
          </ol>
        </Card>

        {/* Botão de Voltar */}
        <div>
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
