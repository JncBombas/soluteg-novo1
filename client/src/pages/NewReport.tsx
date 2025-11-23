import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function NewReport() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    serviceType: "",
    serviceDate: "",
    location: "",
    description: "",
    equipmentDetails: "",
    workPerformed: "",
    partsUsed: "",
    technicianName: "",
    observations: "",
    status: "draft" as "draft" | "completed" | "reviewed",
  });

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("Relatório criado com sucesso!");
      utils.reports.list.invalidate();
      setLocation("/admin");
    },
    onError: (error) => {
      toast.error("Erro ao criar relatório: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.clientName || !formData.serviceType || 
        !formData.serviceDate || !formData.location || !formData.description || 
        !formData.workPerformed || !formData.technicianName) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      ...formData,
      serviceDate: new Date(formData.serviceDate),
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Novo Relatório Técnico</CardTitle>
            <CardDescription>Preencha as informações do serviço realizado</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Básicas</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título do Relatório *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="Ex: Manutenção Preventiva - Gerador"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nome do Cliente *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => handleChange("clientName", e.target.value)}
                      placeholder="Nome da empresa ou cliente"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                    <Select value={formData.serviceType} onValueChange={(value) => handleChange("serviceType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instalacao-eletrica">Instalação Elétrica</SelectItem>
                        <SelectItem value="manutencao-industrial">Manutenção Industrial</SelectItem>
                        <SelectItem value="manutencao-predial">Manutenção Predial</SelectItem>
                        <SelectItem value="bombas-motores">Bombas e Motores</SelectItem>
                        <SelectItem value="paineis">Painéis Elétricos</SelectItem>
                        <SelectItem value="automacao">Automação</SelectItem>
                        <SelectItem value="retrofit">Retrofit</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceDate">Data do Serviço *</Label>
                    <Input
                      id="serviceDate"
                      type="date"
                      value={formData.serviceDate}
                      onChange={(e) => handleChange("serviceDate", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Local *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Endereço completo do local do serviço"
                    required
                  />
                </div>
              </div>

              {/* Detalhes do Serviço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detalhes do Serviço</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do Serviço *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Descreva o serviço solicitado pelo cliente"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentDetails">Detalhes dos Equipamentos</Label>
                  <Textarea
                    id="equipmentDetails"
                    value={formData.equipmentDetails}
                    onChange={(e) => handleChange("equipmentDetails", e.target.value)}
                    placeholder="Marca, modelo, número de série, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workPerformed">Trabalho Realizado *</Label>
                  <Textarea
                    id="workPerformed"
                    value={formData.workPerformed}
                    onChange={(e) => handleChange("workPerformed", e.target.value)}
                    placeholder="Descreva detalhadamente o trabalho executado"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partsUsed">Peças Utilizadas</Label>
                  <Textarea
                    id="partsUsed"
                    value={formData.partsUsed}
                    onChange={(e) => handleChange("partsUsed", e.target.value)}
                    placeholder="Liste as peças e materiais utilizados"
                    rows={3}
                  />
                </div>
              </div>

              {/* Informações Finais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Finais</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="technicianName">Nome do Técnico *</Label>
                    <Input
                      id="technicianName"
                      value={formData.technicianName}
                      onChange={(e) => handleChange("technicianName", e.target.value)}
                      placeholder="Técnico responsável"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status do Relatório</Label>
                    <Select value={formData.status} onValueChange={(value: "draft" | "completed" | "reviewed") => handleChange("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="reviewed">Revisado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => handleChange("observations", e.target.value)}
                    placeholder="Observações adicionais, recomendações, etc."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar Relatório"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/admin")}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
