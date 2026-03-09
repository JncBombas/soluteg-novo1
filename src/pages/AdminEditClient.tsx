import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function AdminEditClient() {
  const [, params] = useRoute("/admin/clientes/editar/:id");
  const clientId = params?.id ? parseInt(params.id) : null;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cnpjCpf: "",
    address: "",
  });

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch client data
  const { data: client, isLoading: isLoadingClient } = trpc.clients.getById.useQuery(
    { id: clientId || 0 },
    { enabled: !!clientId }
  );

  // Update form when client data loads
  if (client && !formData.name) {
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      cnpjCpf: client.cnpjCpf || "",
      address: client.address || "",
    });
  }

  const updateClientMutation = trpc.clients.update.useMutation();
  const updatePasswordMutation = trpc.clients.updatePassword.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateClient = async () => {
    if (!clientId) return;
    
    setIsLoading(true);
    try {
      await updateClientMutation.mutateAsync({
        id: clientId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cnpjCpf: formData.cnpjCpf,
        address: formData.address,
      });
      toast.success("Dados do cliente atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar dados do cliente");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!clientId || !newPassword) {
      toast.error("Digite uma nova senha");
      return;
    }

    setIsLoading(true);
    try {
      await updatePasswordMutation.mutateAsync({
        id: clientId,
        newPassword,
      });
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
    } catch (error) {
      toast.error("Erro ao alterar senha");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-red-600">Cliente não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/admin/clientes" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Clientes
          </a>
          <h1 className="text-3xl font-bold text-gray-900">Editar Cliente</h1>
          <p className="text-gray-600 mt-2">Atualize os dados e a senha do cliente</p>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Dados do Cliente</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="E-mail"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF</label>
              <Input
                name="cnpjCpf"
                value={formData.cnpjCpf}
                onChange={handleInputChange}
                placeholder="12.345.678/0001-99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Endereço completo"
              />
            </div>

            <Button
              onClick={handleUpdateClient}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Salvando..." : "Salvar Dados"}
            </Button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Alterar Senha</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={isLoading || !newPassword}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
