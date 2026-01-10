import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ReportInspectionVisit() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    clientName: "",
    visitDate: "",
    technician: "",
    equipmentType: "",
    equipmentModel: "",
    serialNumber: "",
    pumpCondition: "",
    pressureReading: "",
    temperatureReading: "",
    flowRate: "",
    issues: "",
    recommendations: "",
    photosUploaded: "não",
    nextVisitDate: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!formData.clientName || !formData.visitDate || !formData.technician) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitted(true);
    toast.success("Formulário enviado com sucesso!");
    setTimeout(() => {
      navigate("/relatorios");
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Enviado com Sucesso!</h2>
            <p className="text-gray-600 mb-6">
              Sua visita de inspeção foi registrada. Você será redirecionado em breve.
            </p>
            <Button onClick={() => navigate("/relatorios")} className="w-full">
              Voltar aos Relatórios
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/relatorios")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Visita de Inspeção</CardTitle>
            <CardDescription>
              Registre uma nova inspeção de bombas e equipamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Todos os campos marcados com * são obrigatórios
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Cliente *</label>
                  <Input
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    placeholder="Ex: Condomínio XYZ"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da Visita *</label>
                  <Input
                    name="visitDate"
                    type="date"
                    value={formData.visitDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Técnico Responsável *</label>
                  <Input
                    name="technician"
                    value={formData.technician}
                    onChange={handleChange}
                    placeholder="Nome do técnico"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Equipamento</label>
                  <Select value={formData.equipmentType} onValueChange={(value) => setFormData({ ...formData, equipmentType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bomba">Bomba</SelectItem>
                      <SelectItem value="compressor">Compressor</SelectItem>
                      <SelectItem value="motor">Motor</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Modelo do Equipamento</label>
                  <Input
                    name="equipmentModel"
                    value={formData.equipmentModel}
                    onChange={handleChange}
                    placeholder="Ex: XYZ-2000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de Série</label>
                  <Input
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleChange}
                    placeholder="Número de série"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Condição do Equipamento</label>
                  <Select value={formData.pumpCondition} onValueChange={(value) => setFormData({ ...formData, pumpCondition: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otimo">Ótimo</SelectItem>
                      <SelectItem value="bom">Bom</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Leitura de Pressão (PSI)</label>
                  <Input
                    name="pressureReading"
                    type="number"
                    value={formData.pressureReading}
                    onChange={handleChange}
                    placeholder="Ex: 50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Leitura de Temperatura (°C)</label>
                  <Input
                    name="temperatureReading"
                    type="number"
                    value={formData.temperatureReading}
                    onChange={handleChange}
                    placeholder="Ex: 35"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vazão (L/min)</label>
                  <Input
                    name="flowRate"
                    type="number"
                    value={formData.flowRate}
                    onChange={handleChange}
                    placeholder="Ex: 100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fotos Enviadas?</label>
                  <Select value={formData.photosUploaded} onValueChange={(value) => setFormData({ ...formData, photosUploaded: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Problemas Identificados</label>
                  <textarea
                    name="issues"
                    value={formData.issues}
                    onChange={handleChange}
                    placeholder="Descreva os problemas encontrados..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Recomendações</label>
                  <textarea
                    name="recommendations"
                    value={formData.recommendations}
                    onChange={handleChange}
                    placeholder="Recomendações para manutenção..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da Próxima Visita</label>
                  <Input
                    name="nextVisitDate"
                    type="date"
                    value={formData.nextVisitDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Observações Adicionais</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Informações adicionais..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                >
                  Enviar Formulário
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/relatorios")}
                  className="flex-1 h-12 text-lg"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
