import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { maskCnpjCpf, maskPhone, isValidCnpjCpf, isValidPhone } from "@/lib/masks";
import { trpc } from "@/lib/trpc";

export default function EditClient() {
  const [, setLocation] = useLocation();

  // Extrai o ID do cliente da URL (/admin/clientes/editar/123 → 123)
  const pathParts = window.location.pathname.split("/");
  const clientId = Number(pathParts[pathParts.length - 1]) || null;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    cnpjCpf: "",
    phone: "",
    address: "",
    syndicName: "",
    type: "com_portal" as "com_portal" | "sem_portal",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Busca dados do cliente via tRPC ──────────────────────────
  const { data: client, isLoading } = trpc.clients.getById.useQuery(
    { id: clientId ?? 0 },
    { enabled: !!clientId }
  );

  // Popula o formulário quando os dados chegam — sem causar loop
  useEffect(() => {
    if (!client) return;
    setFormData({
      name: client.name ?? "",
      email: client.email ?? "",
      username: client.username ?? "",
      cnpjCpf: client.cnpjCpf ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      syndicName: client.syndicName ?? "",
      type: client.type ?? "com_portal",
      newPassword: "",
    });
  }, [client]);

  // ── Mutations via tRPC ───────────────────────────────────────
  const updateMutation = trpc.clients.update.useMutation();
  const updatePasswordMutation = trpc.clients.updatePassword.useMutation();

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!clientId) { setError("ID do cliente não encontrado"); return; }
    if (!formData.name.trim()) { setError("Nome é obrigatório"); return; }
    if (formData.cnpjCpf && !isValidCnpjCpf(formData.cnpjCpf)) { setError("CNPJ/CPF inválido"); return; }
    if (formData.phone && !isValidPhone(formData.phone)) { setError("Telefone inválido"); return; }

    try {
      // Atualiza dados principais
      await updateMutation.mutateAsync({
        id: clientId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        cnpjCpf: formData.cnpjCpf,
        syndicName: formData.syndicName,
      });

      // Atualiza senha separadamente só se foi preenchida
      if (formData.newPassword.trim()) {
        await updatePasswordMutation.mutateAsync({
          id: clientId,
          newPassword: formData.newPassword,
        });
      }

      setSuccess("Cliente atualizado com sucesso!");
      setTimeout(() => setLocation("/admin/clientes"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente");
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client && !isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Cliente não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isSaving = updateMutation.isLoading || updatePasswordMutation.isLoading;
  const isFormValid =
    formData.name.trim() !== "" &&
    (formData.cnpjCpf === "" || isValidCnpjCpf(formData.cnpjCpf)) &&
    (formData.phone === "" || isValidPhone(formData.phone));

  // ── Render ───────────────────────────────────────────────────
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
        <p className="text-slate-600 mt-1">Atualize os dados do cliente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
          <CardDescription>Preencha os campos para atualizar os dados</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  placeholder="Nome completo ou razão social"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Nome do Síndico */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Síndico</label>
                <Input
                  placeholder="Nome do síndico responsável"
                  value={formData.syndicName}
                  onChange={(e) => setFormData({ ...formData, syndicName: e.target.value })}
                />
              </div>

              {/* E-mail */}
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail (opcional)</label>
                <Input
                  type="email"
                  placeholder="cliente@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Nome de Usuário */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome de Usuário</label>
                <Input
                  placeholder="nome_usuario"
                  value={formData.username}
                  disabled // username não é editável para evitar quebrar o login
                  className="bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400">O nome de usuário não pode ser alterado</p>
              </div>

              {/* CNPJ/CPF */}
              <div className="space-y-2">
                <label className="text-sm font-medium">CNPJ/CPF</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpjCpf}
                  onChange={(e) => setFormData({ ...formData, cnpjCpf: maskCnpjCpf(e.target.value) })}
                />
                {formData.cnpjCpf && !isValidCnpjCpf(formData.cnpjCpf) && (
                  <p className="text-xs text-red-500">CNPJ/CPF inválido</p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                />
                {formData.phone && !isValidPhone(formData.phone) && (
                  <p className="text-xs text-red-500">Telefone inválido</p>
                )}
              </div>

              {/* Endereço */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Endereço (opcional)</label>
                <Input
                  placeholder="Rua, número, complemento"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Tipo de Cliente</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "com_portal" | "sem_portal") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="com_portal">Com Portal (Acesso ao painel)</SelectItem>
                    <SelectItem value="sem_portal">Sem Portal (Apenas cadastro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nova Senha */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Nova Senha (opcional)</label>
                <Input
                  type="password"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Preencha apenas se quiser alterar a senha do cliente
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={isSaving || !isFormValid}
              >
                {isSaving ? (
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
