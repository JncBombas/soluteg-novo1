import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ReportInspectionVisit2() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    clientName: "",
    visitDate: "",
    technician: "",
    maintenanceType: "",
    hoursWorked: "",
    partsReplaced: "",
    laborCost: "",
    partsCost: "",
    totalCost: "",
    workPerformed: "",
    nextMaintenanceDate: "",
    clientSignature: "",
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
              Seu formulário de visita foi registrado. Você será redirecionado em breve.
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
            <CardTitle className="text-3xl">Formulário de Visita 2</CardTitle>
            <CardDescription>
              Registre inspeções periódicas de bombas e equipamentos
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
                  <label className="text-sm font-medium">Tipo de Manutenção</label>
                  <Select value={formData.maintenanceType} onValueChange={(value) => setFormData({ ...formData, maintenanceType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="corretiva">Corretiva</SelectItem>
                      <SelectItem value="preditiva">Preditiva</SelectItem>
                      <SelectItem value="emergencial">Emergencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas de Trabalho</label>
                  <Input
                    name="hoursWorked"
                    type="number"
                    step="0.5"
                    value={formData.hoursWorked}
                    onChange={handleChange}
                    placeholder="Ex: 2.5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Peças Substituídas</label>
                  <Input
                    name="partsReplaced"
                    value={formData.partsReplaced}
                    onChange={handleChange}
                    placeholder="Ex: Selos, Rolamentos"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custo de Mão de Obra (R$)</label>
                  <Input
                    name="laborCost"
                    type="number"
                    step="0.01"
                    value={formData.laborCost}
                    onChange={handleChange}
                    placeholder="Ex: 150.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custo de Peças (R$)</label>
                  <Input
                    name="partsCost"
                    type="number"
                    step="0.01"
                    value={formData.partsCost}
                    onChange={handleChange}
                    placeholder="Ex: 300.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Custo Total (R$)</label>
                  <Input
                    name="totalCost"
                    type="number"
                    step="0.01"
                    value={formData.totalCost}
                    onChange={handleChange}
                    placeholder="Ex: 450.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da Próxima Manutenção</label>
                  <Input
                    name="nextMaintenanceDate"
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Trabalho Realizado</label>
                  <textarea
                    name="workPerformed"
                    value={formData.workPerformed}
                    onChange={handleChange}
                    placeholder="Descreva o trabalho realizado..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={4}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Assinatura do Cliente</label>
                  <Input
                    name="clientSignature"
                    value={formData.clientSignature}
                    onChange={handleChange}
                    placeholder="Nome da pessoa que autoriza"
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
                  className="flex-1 bg-orange-600 hover:bg-orange-700 h-12 text-lg"
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
