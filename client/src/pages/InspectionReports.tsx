import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, FileText, Trash2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

interface PDFLink {
  id: string;
  name: string;
  driveUrl: string;
}

export default function InspectionReports() {
  const [, navigate] = useLocation();
  const [pdfLinks, setPdfLinks] = useState<PDFLink[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleAddPDF = () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast.error("Preencha o nome e o link do PDF");
      return;
    }

    // Validar se é um link do Google Drive
    if (!newUrl.includes("drive.google.com")) {
      toast.error("Cole um link válido do Google Drive");
      return;
    }

    const newPDF: PDFLink = {
      id: Date.now().toString(),
      name: newName,
      driveUrl: newUrl,
    };

    setPdfLinks([...pdfLinks, newPDF]);
    setNewName("");
    setNewUrl("");
    toast.success("PDF adicionado com sucesso!");
  };

  const handleRemovePDF = (id: string) => {
    setPdfLinks(pdfLinks.filter((pdf) => pdf.id !== id));
    toast.success("PDF removido");
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/relatorioserviçoVip2025-01.pdf";
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

  const handleDownloadPDF = (driveUrl: string) => {
    // Extrair o ID do arquivo do link do Google Drive
    let fileId = "";
    
    if (driveUrl.includes("/d/")) {
      fileId = driveUrl.split("/d/")[1].split("/")[0];
    } else if (driveUrl.includes("id=")) {
      fileId = driveUrl.split("id=")[1].split("&")[0];
    }

    if (!fileId) {
      toast.error("Não consegui extrair o ID do arquivo. Verifique o link.");
      return;
    }

    // Link direto para download
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    window.open(downloadUrl, "_blank");
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

        {/* Card de Relatórios Gerados */}
        <Card className="p-6 bg-purple-50 border-purple-200 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-purple-900">
                Relatórios Gerados
              </h2>
              <p className="text-purple-800 text-sm">
                Cole o link do PDF gerado no Google Drive para fazer download
              </p>
            </div>
            <FileText className="w-6 h-6 text-purple-600" />
          </div>

          {/* Formulário para adicionar PDF */}
          <div className="space-y-3 mb-6 p-4 bg-white rounded-lg border border-purple-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Relatório
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Relatório Cond Dez 2025-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link do Google Drive
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Cole o link do PDF do Google Drive aqui"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemplo: https://drive.google.com/file/d/1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX/view
              </p>
            </div>
            <Button
              onClick={handleAddPDF}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar PDF
            </Button>
          </div>

          {/* Lista de PDFs */}
          {pdfLinks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-purple-900">
                {pdfLinks.length} PDF(s) adicionado(s):
              </h3>
              <div className="space-y-2">
                {pdfLinks.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {pdf.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadPDF(pdf.driveUrl)}
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Baixar
                      </Button>
                      <Button
                        onClick={() => handleRemovePDF(pdf.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pdfLinks.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum PDF adicionado ainda</p>
            </div>
          )}
        </Card>

        {/* Instruções */}
        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <h3 className="font-semibold mb-3">Como Usar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Clique em "Abrir Formulário" para acessar o formulário de inspeção</li>
            <li>Preencha todos os dados da inspeção (cliente, endereço, medições, etc.)</li>
            <li>Faça upload das fotos da inspeção no formulário</li>
            <li>Envie o formulário</li>
            <li>O Document Studio gerará o PDF automaticamente na pasta "Relatórios"</li>
            <li>Copie o link do PDF gerado no Google Drive</li>
            <li>Cole o link na seção "Relatórios Gerados" acima</li>
            <li>Clique em "Baixar" para fazer download do PDF</li>
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
