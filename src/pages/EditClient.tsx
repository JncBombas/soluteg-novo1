import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { maskCnpjCpf, maskPhone, isValidCnpjCpf, isValidPhone } from "@/lib/masks";

interface Client {
  id: number;
  name: string;
  email: string;
  username: string;
  cnpjCpf?: string;
  phone?: string;
  address?: string;
  type?: "com_portal" | "sem_portal";
  createdAt: Date;
}

export default function EditClient() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    cnpjCpf: "",
    phone: "",
    address: "",
    type: "com_portal" as "com_portal" | "sem_portal",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Extrair ID da URL
  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    if (id && !isNaN(Number(id))) {
      setClientId(Number(id));
    }

    // Pegar adminId do localStorage
    const adminIdFromStorage = localStorage.getItem("adminId");
    if (adminIdFromStorage) {
      setAdminId(Number(adminIdFromStorage));
    }
  }, []);

  // Carregar dados do cliente
  useEffect(() => {
    if (clientId && adminId) {
      loadClient();
    }
  }, [clientId, adminId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clients/${clientId}`);
      if (response.ok) {
        const client: Client = await response.json();
        setFormData({
          name: client.name || "",
          email: client.email || "",
          username: client.username || "",
          cnpjCpf: client.cnpjCpf || "",
          phone: client.phone || "",
          address: client.address || "",
          type: client.type || "com_portal",
        });
      } else {
        setError("Erro ao carregar dados do cliente");
      }
    } catch (err) {
      setError("Erro ao carregar cliente");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!clientId) {
      setError("ID do cliente não encontrado");
      return;
    }

    // Validar campos obrigatórios
    if (!formData.name || !formData.username) {
      setError("Nome e usuário são obrigatórios");
      return;
    }

    if (!isValidCnpjCpf(formData.cnpjCpf)) {
      setError("CNPJ/CPF inválido");
      return;
    }

    if (!isValidPhone(formData.phone)) {
      setError("Telefone inválido");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        cnpjCpf: formData.cnpjCpf,
        phone: formData.phone,
        address: formData.address,
        type: formData.type,
      };
      if (formData.newPassword.trim()) {
        payload.password = formData.newPassword;
      }

      const response = await fetch(`/api/admin-clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao atualizar cliente");
      }

      setSuccess("Cliente atualizado com sucesso!");
      setTimeout(() => {
        setLocation("/admin/clientes");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/clientes")}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Clientes
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Editar Cliente</h1>
        <p className="text-slate-600 mt-1">
          Atualize os dados do cliente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
          <CardDescription>
            Preencha os campos para atualizar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateClient} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail (opcional)</label>
                <Input
                  type="email"
                  placeholder="cliente@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome de Usuário *</label>
                <Input
                  placeholder="nome_usuario"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CNPJ/CPF *</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpjCpf}
                  onChange={(e) => {
                    const masked = maskCnpjCpf(e.target.value);
                    setFormData({ ...formData, cnpjCpf: masked });
                  }}
                  required
                />
                {formData.cnpjCpf && !isValidCnpjCpf(formData.cnpjCpf) && (
                  <p className="text-xs text-red-500">CNPJ/CPF inválido</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone *</label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setFormData({ ...formData, phone: masked });
                  }}
                  required
                />
                {formData.phone && !isValidPhone(formData.phone) && (
                  <p className="text-xs text-red-500">Telefone inválido</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endereço (opcional)</label>
                <Input
                  placeholder="Rua, número, complemento"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Senha (opcional)</label>
                <Input
                  type="password"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <p className="text-xs text-slate-500">Preencha apenas se quiser alterar a senha do cliente</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Tipo de Cliente *</label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="com_portal">Com Portal (Acesso ao painel)</SelectItem>
                    <SelectItem value="sem_portal">Sem Portal (Apenas cadastro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={
                  saving ||
                  !isValidCnpjCpf(formData.cnpjCpf) ||
                  !isValidPhone(formData.phone) ||
                  !formData.name ||
                  !formData.username
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/admin/clientes")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
