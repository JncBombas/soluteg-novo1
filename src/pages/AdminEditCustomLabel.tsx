import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminEditCustomLabel() {
  const [, setLocation] = useLocation();
  const [customLabel, setCustomLabel] = useState("");
  const [adminId, setAdminId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    const label = localStorage.getItem("adminCustomLabel");
    if (id) {
      setAdminId(parseInt(id));
      setCustomLabel(label || "");
    } else {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  const updateLabelMutation = trpc.adminAuth.updateCustomLabel.useMutation({
    onSuccess: () => {
      localStorage.setItem("adminCustomLabel", customLabel);
      toast.success("Label customizado atualizado com sucesso!");
      setTimeout(() => setLocation("/admin/dashboard"), 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar label");
    },
  });

  const handleSave = async () => {
    if (!adminId) return;
    if (!customLabel.trim()) {
      toast.error("Digite um label customizado");
      return;
    }

    setIsSaving(true);
    try {
      await updateLabelMutation.mutateAsync({
        adminId,
        customLabel: customLabel.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setLocation("/admin/dashboard")}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-bold text-foreground">Editar Label Customizado</h1>
          <p className="text-muted-foreground mt-2">
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
                onClick={() => setLocation("/admin/dashboard")}
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
    </div>
  );
}
