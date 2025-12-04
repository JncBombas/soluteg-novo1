import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Users, Loader2, AlertCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";

interface Client {
  id: number;
  name: string;
  email: string;
  username: string;
  cnpjCpf?: string;
  phone?: string;
  type?: "com_portal" | "sem_portal";
  createdAt: Date;
}

export default function AdminClients() {
  const [, setLocation] = useLocation();
  const [adminId, setAdminId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    cnpjCpf: "",
    phone: "",
    address: "",
    type: "com_portal" as "com_portal" | "sem_portal",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = clients.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    // Pegar adminId do localStorage (setado no login)
    const id = localStorage.getItem("adminId");
    if (id) {
      setAdminId(parseInt(id));
      loadClients(parseInt(id));
    }
  }, []);

  const loadClients = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-clients?adminId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setError("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!adminId) {
      setError("Admin ID não encontrado");
      return;
    }

    try {
      const response = await fetch("/api/admin-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          adminId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erro ao criar cliente");
      }

      setSuccess("Cliente criado com sucesso!");
      setFormData({
        name: "",
        email: "",
        username: "",
        password: "",
        cnpjCpf: "",
        phone: "",
        address: "",
        type: "com_portal",
      });
      setIsOpen(false);
      loadClients(adminId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    setClientToDelete(client);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const response = await fetch(`/api/admin-clients/${clientToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClients(clients.filter((c) => c.id !== clientToDelete.id));
        setSuccess("Cliente deletado com sucesso!");
        setDeleteConfirmOpen(false);
        setClientToDelete(null);
      } else {
        setError("Erro ao deletar cliente");
      }
    } catch (error) {
      setError("Erro ao deletar cliente");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-slate-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/dashboard")}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" />
            Gerenciamento de Clientes
          </h1>
          <p className="text-slate-600 mt-1">
            Crie e gerencie os clientes que acessarão o portal
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente para criar uma nova conta
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateClient} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  placeholder="cliente@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome de Usuário</label>
                <Input
                  placeholder="nome_usuario"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CNPJ/CPF (opcional)</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpjCpf}
                  onChange={(e) => setFormData({ ...formData, cnpjCpf: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone (opcional)</label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Cliente</label>
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

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                Criar Cliente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
          <CardDescription>
            Total de {clients.length} cliente{clients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum cliente cadastrado ainda</p>
              <p className="text-sm text-slate-500">Crie o primeiro cliente clicando em "Novo Cliente"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="font-mono text-sm">{client.username}</TableCell>
                      <TableCell className="text-sm">{client.email}</TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          client.type === "com_portal"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {client.type === "com_portal" ? "Com Portal" : "Sem Portal"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{client.phone || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLocation(`/admin/clientes/editar/${client.id}`)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClient(client)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-600">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, clients.length)} de {clients.length} clientes
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          size="sm"
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Deleção */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Deleção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o cliente <strong>{clientToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            ⚠️ Todos os documentos e ordens de serviço associados também serão deletados.
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Deletar Cliente
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
