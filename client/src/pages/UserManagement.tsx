import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Trash2, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UserManagement() {
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: invites, isLoading: invitesLoading } = trpc.invites.list.useQuery();
  const utils = trpc.useUtils();

  const createInviteMutation = trpc.invites.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Convite criado! Código: ${data.code}`);
      setNewEmail("");
      setNewRole("user");
      utils.invites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao criar convite: " + error.message);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário deletado com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar usuário: " + error.message);
    },
  });

  const deleteInviteMutation = trpc.invites.delete.useMutation({
    onSuccess: () => {
      toast.success("Convite deletado com sucesso!");
      utils.invites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar convite: " + error.message);
    },
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Função atualizada com sucesso!");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar função: " + error.message);
    },
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast.error("Por favor, insira um email");
      return;
    }
    createInviteMutation.mutate({ email: newEmail, role: newRole });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Crie convites e gerencie usuários do sistema</p>
        </div>

        <Tabs defaultValue="invites" className="w-full">
          <TabsList>
            <TabsTrigger value="invites">Criar Convites</TabsTrigger>
            <TabsTrigger value="users">Usuários Ativos</TabsTrigger>
          </TabsList>

          {/* Criar Convites */}
          <TabsContent value="invites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Criar Novo Convite
                </CardTitle>
                <CardDescription>
                  Gere um código de convite para um novo usuário. O convite expira em 30 dias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email do Usuário</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="usuario@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Select value={newRole} onValueChange={(value: "user" | "admin") => setNewRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button type="submit" disabled={createInviteMutation.isPending} className="w-full">
                        {createInviteMutation.isPending ? "Criando..." : "Criar Convite"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Convites */}
            <Card>
              <CardHeader>
                <CardTitle>Convites Pendentes</CardTitle>
                <CardDescription>Convites que ainda não foram utilizados</CardDescription>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <p className="text-muted-foreground">Carregando convites...</p>
                ) : invites && invites.length > 0 ? (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Função: {invite.role === "admin" ? "Administrador" : "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expira em: {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar convite</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar este convite? Ele não poderá mais ser utilizado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInviteMutation.mutate({ id: invite.id })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum convite pendente</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários Ativos */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>Gerencie usuários e suas funções</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <p className="text-muted-foreground">Carregando usuários...</p>
                ) : users && users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{user.name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Criado em: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(role: "user" | "admin") =>
                              updateRoleMutation.mutate({ id: user.id, role })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar este usuário? Todos os seus relatórios também serão deletados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate({ id: user.id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum usuário registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
