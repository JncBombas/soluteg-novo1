import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface ServiceOrder {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCnpj: string;
  clientAddress: string;
  description: string;
  totalPrice: number;
  createdAt: Date;
}

interface ServiceOrderItem {
  id: number;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export default function AdminServiceOrders() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCnpj, setClientCnpj] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [description, setDescription] = useState("");

  // Items state
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("un");
  const [unitPrice, setUnitPrice] = useState(0);
  const [items, setItems] = useState<ServiceOrderItem[]>([]);

  // Queries
  const { data: orders = [] } = trpc.serviceOrders.list.useQuery(
    { adminId: 1 },
    { enabled: true }
  );

  const { data: orderItems = [] } = trpc.serviceOrders.getItems.useQuery(
    { serviceOrderId: currentOrderId || 0 },
    { enabled: !!currentOrderId }
  );

  // Mutations
  const createOrderMutation = trpc.serviceOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Ordem criada com sucesso!");
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar ordem: " + error.message);
    },
  });

  const addItemMutation = trpc.serviceOrders.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado!");
      setItemName("");
      setQuantity(1);
      setUnit("un");
      setUnitPrice(0);
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar item: " + error.message);
    },
  });

  const deleteOrderMutation = trpc.serviceOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Ordem deletada!");
      setCurrentOrderId(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar ordem: " + error.message);
    },
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    createOrderMutation.mutate({
      adminId: 1,
      clientName,
      clientEmail,
      clientPhone,
      clientCnpj,
      clientAddress,
      description,
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrderId) {
      toast.error("Selecione uma ordem primeiro");
      return;
    }
    if (!itemName || quantity <= 0 || unitPrice < 0) {
      toast.error("Preencha todos os campos do item");
      return;
    }

    addItemMutation.mutate({
      serviceOrderId: currentOrderId,
      itemName,
      quantity,
      unit,
      unitPrice,
    });
  };

  const handleDeleteOrder = (orderId: number) => {
    if (confirm("Tem certeza que deseja deletar esta ordem?")) {
      deleteOrderMutation.mutate({ id: orderId });
    }
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientCnpj("");
    setClientAddress("");
    setDescription("");
    setItems([]);
  };

  const totalPrice = orderItems.reduce((sum: number, item: any) => sum + (item.totalPrice / 100), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Ordem de Serviço</h1>
            <p className="text-gray-400">Cadastre clientes e crie orçamentos</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Orders List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Ordens de Serviço</CardTitle>
                <p className="text-sm text-gray-400 mt-2">Total: {orders.length}</p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowForm(!showForm)}
                  className="w-full mb-4 bg-orange-600 hover:bg-orange-700"
                >
                  + Nova Ordem
                </Button>

                {showForm && (
                  <form onSubmit={handleCreateOrder} className="space-y-3 mb-4">
                    <input
                      type="text"
                      placeholder="Nome do Cliente"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Telefone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <input
                      type="text"
                      placeholder="CNPJ"
                      value={clientCnpj}
                      onChange={(e) => setClientCnpj(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Endereço"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <textarea
                      placeholder="Descrição"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                        Criar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {orders.map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => setCurrentOrderId(order.id)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        currentOrderId === order.id
                          ? "bg-orange-600 text-white"
                          : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                      }`}
                    >
                      <p className="font-semibold text-sm">{order.clientName}</p>
                      <p className="text-xs opacity-75">R$ {(order.totalPrice / 100).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Order Details */}
          {currentOrderId && (
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Detalhes da Ordem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {orders.map((order: any) =>
                    order.id === currentOrderId ? (
                      <div key={order.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cliente:</span>
                          <span className="text-white font-semibold">{order.clientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email:</span>
                          <span className="text-white">{order.clientEmail || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Telefone:</span>
                          <span className="text-white">{order.clientPhone || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">CNPJ:</span>
                          <span className="text-white">{order.clientCnpj || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Endereço:</span>
                          <span className="text-white">{order.clientAddress || "-"}</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="w-full mt-4"
                        >
                          Deletar Ordem
                        </Button>
                      </div>
                    ) : null
                  )}
                </CardContent>
              </Card>

              {/* Add Item Form */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Adicionar Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddItem} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome do Material"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Quantidade"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Unidade"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <input
                      type="number"
                      placeholder="Preço Unitário"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                      Adicionar Item
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Items List */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Itens da Ordem</CardTitle>
                </CardHeader>
                <CardContent>
                  {orderItems.length === 0 ? (
                    <p className="text-gray-400 text-sm">Nenhum item adicionado</p>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item: any) => (
                        <div key={item.id} className="bg-slate-700 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-white font-semibold text-sm">{item.itemName}</p>
                              <p className="text-gray-400 text-xs">
                                {item.quantity} {item.unit} x R$ {(item.unitPrice / 100).toFixed(2)}
                              </p>
                            </div>
                            <p className="text-orange-400 font-bold text-sm">
                              R$ {(item.totalPrice / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="bg-orange-600 p-4 rounded-lg mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Total:</span>
                          <span className="text-white text-2xl font-bold">
                            R$ {totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
