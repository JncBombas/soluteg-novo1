import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateClientForm {
  name: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  cnpjCpf?: string;
  address?: string;
}

export default function AdminCreateWorkOrder() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  const [showCreateClient, setShowCreateClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    type: "emergencial" as const,
    priority: "normal" as const,
    scheduledDate: "",
    estimatedHours: "",
  });

  const [clientForm, setClientForm] = useState<CreateClientForm>({
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    cnpjCpf: "",
    address: "",
  });

  // Queries
  const { data: clients = [] } = trpc.clients.list.useQuery({ adminId });
  const createWorkOrderMutation = trpc.workOrders.create.useMutation();
  const createClientMutation = trpc.clients.create.useMutation();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClientInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setClientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateClient = async () => {
    if (!clientForm.name || !clientForm.email || !clientForm.username || !clientForm.password) {
      toast.error("Preencha os campos obrigatórios do cliente");
      return;
    }

    try {
      const result = await createClientMutation.mutateAsync({
        adminId,
        ...clientForm,
      });

      toast.success("Cliente criado com sucesso!");
      setShowCreateClient(false);
      setClientForm({
        name: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        cnpjCpf: "",
        address: "",
      });

      // Refetch clients - o estado será atualizado automaticamente pela query
    } catch (error) {
      toast.error("Erro ao criar cliente");
      console.error(error);
    }
  };

  const handleCreateOS = async () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente");
      return;
    }

    if (!formData.title) {
      toast.error("Preencha o título da OS");
      return;
    }

    try {
      const result = await createWorkOrderMutation.mutateAsync({
        adminId,
        clientId: selectedClientId,
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        serviceType: formData.serviceType || undefined,
        priority: formData.priority,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : undefined,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      });

      toast.success(`OS ${result.osNumber} criada com sucesso!`);
      navigate("/admin/work-orders");
    } catch (error) {
      toast.error("Erro ao criar OS");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Criar Ordem de Serviço</h1>
              <p className="text-gray-600">Preencha os dados para criar uma nova OS</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/work-orders")}
              className="flex items-center gap-2"
            >
              ← Voltar
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card className="p-8">
          {/* Client Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold mb-3">
              Cliente <span className="text-red-500">*</span>
            </label>

            {!showCreateClient ? (
              <div className="flex gap-2">
                <select
                  value={selectedClientId || ""}
                  onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateClient(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Novo
                </Button>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Novo Cliente</h3>
                  <button
                    onClick={() => setShowCreateClient(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <Input
                      type="text"
                      name="name"
                      value={clientForm.name}
                      onChange={handleClientInputChange}
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      name="email"
                      value={clientForm.email}
                      onChange={handleClientInputChange}
                      placeholder="email@empresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Usuário *</label>
                    <Input
                      type="text"
                      name="username"
                      value={clientForm.username}
                      onChange={handleClientInputChange}
                      placeholder="usuario_login"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Senha *</label>
                    <Input
                      type="password"
                      name="password"
                      value={clientForm.password}
                      onChange={handleClientInputChange}
                      placeholder="••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <Input
                      type="tel"
                      name="phone"
                      value={clientForm.phone}
                      onChange={handleClientInputChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">CNPJ/CPF</label>
                    <Input
                      type="text"
                      name="cnpjCpf"
                      value={clientForm.cnpjCpf}
                      onChange={handleClientInputChange}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Endereço</label>
                    <Input
                      type="text"
                      name="address"
                      value={clientForm.address}
                      onChange={handleClientInputChange}
                      placeholder="Rua, número, cidade"
                    />
                  </div>

                  <Button
                    onClick={handleCreateClient}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* OS Form */}
          {selectedClientId && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Título da OS <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ex: Manutenção de bombas"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Descrição</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descrição detalhada do serviço"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tipo de Serviço</label>
                  <Input
                    type="text"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    placeholder="Ex: Manutenção"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Prioridade</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold mb-2">Data Agendada</label>
                  <Input
                    type="date"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Horas Estimadas</label>
                  <Input
                    type="number"
                    name="estimatedHours"
                    value={formData.estimatedHours}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleCreateOS}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
                  disabled={createWorkOrderMutation.isPending}
                >
                  {createWorkOrderMutation.isPending ? "Criando..." : "Criar OS"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/work-orders")}
                  className="flex-1 h-12"
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
