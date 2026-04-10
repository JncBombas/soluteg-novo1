import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminEditCustomLabel() {
  const [, setLocation] = useLocation();
  const [customLabel, setCustomLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    const label = localStorage.getItem("adminCustomLabel");
    if (id) {
      setCustomLabel(label || "");
    } else {
      setLocation("/gestor/login");
    }
  }, [setLocation]);

  const updateLabelMutation = trpc.adminAuth.updateCustomLabel.useMutation({
    onSuccess: () => {
      localStorage.setItem("adminCustomLabel", customLabel);
      toast.success("Label customizado atualizado com sucesso!");
      setTimeout(() => setLocation("/gestor/dashboard"), 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar label");
    },
  });

  const handleSave = async () => {
    if (!customLabel.trim()) {
      toast.error("Digite um label customizado");
      return;
    }

    setIsSaving(true);
    try {
      await updateLabelMutation.mutateAsync({
        customLabel: customLabel.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Label Customizado</h1>
          <p className="text-muted-foreground mt-1">
            Defina como você quer ser identificado na página inicial
          </p>
        </div>

        {/* Card Principal */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Seu Label Customizado</CardTitle>
            <CardDescription>
              Este texto aparecerá na página inicial quando você estiver logado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campo de Input */}
            <div className="space-y-2">
              <Label htmlFor="customLabel">Label Customizado</Label>
              <Input
                id="customLabel"
                placeholder="Ex: Soluteg é de mim"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                maxLength={255}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                {customLabel.length}/255 caracteres
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Pré-visualização:</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/30"></div>
                <span className="text-primary font-medium">
                  {customLabel || "Seu label aqui"}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !customLabel.trim()}
                className="flex-1 gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Salvando..." : "Salvar Label"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/gestor/dashboard")}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dica */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Dica:</strong> Use um texto curto e memorável que represente sua empresa ou marca. 
            Exemplos: "Soluteg é de mim", "JNC - Manutenção", "Seu Nome Aqui"
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
