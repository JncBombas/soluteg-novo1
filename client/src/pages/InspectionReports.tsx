import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, FileText, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function InspectionReports() {
  const [, navigate] = useLocation();

  const handleOpenCadastroForm = () => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSdfpnw1NYogdduiUpTPm7-5A236uEwqr242wXwGsa5GxwrkBg/viewform?usp=header";
    window.open(formUrl, "_blank");
  };

  const handleOpenVisitaForm = () => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSfD-w9OdpCsEIVMBSJrbdhm9z4DzIBX5qUxBHs6-nuZ2G9ufw/viewform?usp=dialog";
    window.open(formUrl, "_blank");
  };

  const handleOpenVisita2Form = () => {
    const formUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSdXDg93hUQUfDEs6l9_jDeIatqiQX2TaJs0FlGMVdeWRjQR2A/viewform?usp=header";
    window.open(formUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Relatórios de Inspeção</h1>
          <p className="text-gray-600">
            Acesse os formulários para registrar inspeções e cadastrar clientes
          </p>
        </div>

        {/* Cards dos Formulários */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Card Cadastro de Cliente */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-3">Cadastro de Cliente</h2>
                <p className="text-gray-600 text-sm">
                  Registre um novo cliente ou atualize dados de cliente existente. 
                  Preencha as informações de contato e endereço.
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500 flex-shrink-0 ml-4" />
            </div>
            <Button
              onClick={handleOpenCadastroForm}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Abrir Formulário
            </Button>
          </Card>

          {/* Card Visita de Inspeção */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-3">Visita de Inspeção</h2>
                <p className="text-gray-600 text-sm">
                  Registre uma nova inspeção de bombas. Preencha os dados técnicos, 
                  faça upload das fotos e envie para gerar o relatório em PDF.
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500 flex-shrink-0 ml-4" />
            </div>
            <Button
              onClick={handleOpenVisitaForm}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Abrir Formulário
            </Button>
          </Card>

          {/* Card Visita de Inspeção 2 */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-3">Formulário de Visita 2</h2>
                <p className="text-gray-600 text-sm">
                  Registre inspeções periódicas de bombas e equipamentos. 
                  Preencha os dados técnicos e envie o formulário.
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-500 flex-shrink-0 ml-4" />
            </div>
            <Button
              onClick={handleOpenVisita2Form}
              className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Abrir Formulário
            </Button>
          </Card>
        </div>

        {/* Instruções */}
        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <h3 className="font-semibold mb-3 text-blue-900">Como Usar:</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Cadastro de Cliente:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Clique em "Abrir Formulário"</li>
                <li>Preencha os dados do cliente</li>
                <li>Envie o formulário</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Visita de Inspeção:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Clique em "Abrir Formulário"</li>
                <li>Preencha os dados da inspeção</li>
                <li>Faça upload das fotos</li>
                <li>Envie o formulário</li>
                <li>O PDF será gerado no Google Drive</li>
                <li>Baixe e assine o relatório</li>
              </ol>
            </div>
          </div>
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
