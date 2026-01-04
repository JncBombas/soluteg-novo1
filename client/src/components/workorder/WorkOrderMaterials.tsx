import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface WorkOrderMaterialsProps {
  workOrderId: number;
}

export default function WorkOrderMaterials({ workOrderId }: WorkOrderMaterialsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    materialName: "",
    quantity: 1,
    unit: "",
    unitCost: 0,
    totalCost: 0,
  });

  const { data: materials, refetch } = trpc.workOrders.materials.list.useQuery({
    workOrderId,
  });

  const { data: totalCost } = trpc.workOrders.materials.getTotalCost.useQuery({
    workOrderId,
  });

  const createMaterialMutation = trpc.workOrders.materials.create.useMutation({
    onSuccess: () => {
      toast.success("Material adicionado com sucesso");
      refetch();
      setIsDialogOpen(false);
      setNewMaterial({
        materialName: "",
        quantity: 1,
        unit: "",
        unitCost: 0,
        totalCost: 0,
      });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar material: ${error.message}`);
    },
  });

  const deleteMaterialMutation = trpc.workOrders.materials.delete.useMutation({
    onSuccess: () => {
      toast.success("Material removido com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover material: ${error.message}`);
    },
  });

  const handleCreateMaterial = () => {
    if (!newMaterial.materialName.trim()) {
      toast.error("Nome do material é obrigatório");
      return;
    }

    if (newMaterial.quantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    const totalCost = newMaterial.quantity * newMaterial.unitCost;

    createMaterialMutation.mutate({
      workOrderId,
      materialName: newMaterial.materialName,
      quantity: newMaterial.quantity,
      unit: newMaterial.unit || undefined,
      unitCost: newMaterial.unitCost || undefined,
      totalCost: totalCost || undefined,
      addedBy: "Admin",
    });
  };

  const handleDeleteMaterial = (materialId: number) => {
    if (confirm("Tem certeza que deseja remover este material?")) {
      deleteMaterialMutation.mutate({ id: materialId });
    }
  };

  const handleQuantityChange = (value: string) => {
    const quantity = parseFloat(value) || 0;
    setNewMaterial({
      ...newMaterial,
      quantity,
      totalCost: quantity * newMaterial.unitCost,
    });
  };

  const handleUnitCostChange = (value: string) => {
    const unitCost = parseFloat(value) || 0;
    setNewMaterial({
      ...newMaterial,
      unitCost,
      totalCost: newMaterial.quantity * unitCost,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Materiais e Peças</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Custo Total: R$ {(totalCost || 0).toFixed(2)}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Material</DialogTitle>
                <DialogDescription>
                  Registre materiais e peças utilizados nesta OS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Material *</label>
                  <Input
                    placeholder="Ex: Bomba d'água 1/2 HP"
                    value={newMaterial.materialName}
                    onChange={(e) =>
                      setNewMaterial({ ...newMaterial, materialName: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantidade *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newMaterial.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unidade</label>
                    <Input
                      placeholder="Ex: un, m, kg"
                      value={newMaterial.unit}
                      onChange={(e) =>
                        setNewMaterial({ ...newMaterial, unit: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custo Unitário (R$)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newMaterial.unitCost}
                      onChange={(e) => handleUnitCostChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custo Total (R$)</label>
                    <Input
                      type="number"
                      value={newMaterial.totalCost.toFixed(2)}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateMaterial}
                  disabled={createMaterialMutation.isPending}
                >
                  {createMaterialMutation.isPending
                    ? "Adicionando..."
                    : "Adicionar Material"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {materials && materials.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-center">Adicionado em</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">
                        {material.materialName}
                      </TableCell>
                      <TableCell className="text-right">
                        {material.quantity}
                        {material.unit && ` ${material.unit}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {material.unitCost
                          ? `R$ ${material.unitCost.toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {material.totalCost
                          ? `R$ ${material.totalCost.toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {new Date(material.addedAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      TOTAL
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {(totalCost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {materials.map((material) => (
                <div key={material.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{material.materialName}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Quantidade:</span>
                      <p className="font-medium">
                        {material.quantity}
                        {material.unit && ` ${material.unit}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Custo Unit.:</span>
                      <p className="font-medium">
                        {material.unitCost
                          ? `R$ ${material.unitCost.toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Custo Total:</span>
                      <p className="font-semibold text-base">
                        {material.totalCost
                          ? `R$ ${material.totalCost.toFixed(2)}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Adicionado:</span>
                      <p className="font-medium">
                        {new Date(material.addedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t-2 pt-3 flex justify-between items-center font-bold">
                <span>TOTAL</span>
                <span className="text-lg">R$ {(totalCost || 0).toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum material registrado ainda</p>
            <p className="text-sm mt-1">
              Clique em "Adicionar Material" para registrar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
