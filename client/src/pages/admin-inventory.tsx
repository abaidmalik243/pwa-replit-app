import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/AdminLayout";
import { Package, AlertTriangle, Plus, Edit, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const inventorySchema = z.object({
  menuItemId: z.string().min(1, "Menu item is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.string().min(1, "Unit is required"),
  reorderPoint: z.string().optional(),
  reorderQuantity: z.string().optional(),
  supplierId: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventorySchema>;

interface InventoryItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unit: string;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  supplierId?: string | null;
  menuItem?: { name: string };
  supplier?: { name: string };
}

export default function AdminInventory() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      menuItemId: "",
      quantity: "",
      unit: "kg",
      reorderPoint: "",
      reorderQuantity: "",
      supplierId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/inventory", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Success", description: "Inventory item added" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/inventory/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Success", description: "Inventory updated" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        menuItemId: item.menuItemId,
        quantity: item.quantity.toString(),
        unit: item.unit,
        reorderPoint: item.reorderPoint?.toString() || "",
        reorderQuantity: item.reorderQuantity?.toString() || "",
        supplierId: item.supplierId || "",
      });
    } else {
      setEditingItem(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InventoryFormData) => {
    const payload = {
      menuItemId: data.menuItemId,
      quantity: parseFloat(data.quantity),
      unit: data.unit,
      reorderPoint: data.reorderPoint ? parseFloat(data.reorderPoint) : null,
      reorderQuantity: data.reorderQuantity ? parseFloat(data.reorderQuantity) : null,
      supplierId: data.supplierId || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const lowStockItems = inventory.filter(
    (item) => item.reorderPoint && item.quantity <= item.reorderPoint
  );

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-items">{inventory.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-low-stock-count">
                {lowStockItems.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-value">₨0.00</div>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-inventory-title">Inventory Items</h2>
            <p className="text-muted-foreground">Manage stock levels and suppliers</p>
          </div>
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-inventory">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                These items need to be reordered soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-background rounded" data-testid={`alert-low-stock-${item.id}`}>
                    <div>
                      <p className="font-medium">{item.menuItem?.name || "Unknown Item"}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {item.quantity} {item.unit} • Reorder at: {item.reorderPoint} {item.unit}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">
                      Reorder {item.reorderQuantity || 0} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Table */}
        {isLoading ? (
          <p data-testid="text-loading">Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-empty-state">No inventory items yet</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()} data-testid="button-add-first-item">
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Item</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Unit</th>
                      <th className="text-left p-4 font-medium">Reorder Point</th>
                      <th className="text-left p-4 font-medium">Supplier</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const isLowStock = item.reorderPoint && item.quantity <= item.reorderPoint;
                      return (
                        <tr key={item.id} className="border-t" data-testid={`row-inventory-${item.id}`}>
                          <td className="p-4 font-medium" data-testid={`text-item-name-${item.id}`}>
                            {item.menuItem?.name || "Unknown"}
                          </td>
                          <td className="p-4" data-testid={`text-quantity-${item.id}`}>
                            {item.quantity}
                          </td>
                          <td className="p-4" data-testid={`text-unit-${item.id}`}>{item.unit}</td>
                          <td className="p-4" data-testid={`text-reorder-point-${item.id}`}>
                            {item.reorderPoint || "-"}
                          </td>
                          <td className="p-4" data-testid={`text-supplier-${item.id}`}>
                            {item.supplier?.name || "-"}
                          </td>
                          <td className="p-4">
                            {isLowStock ? (
                              <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950" data-testid={`badge-low-stock-${item.id}`}>
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-950" data-testid={`badge-in-stock-${item.id}`}>
                                In Stock
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-inventory-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update inventory details" : "Add a new item to inventory"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="menuItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Item</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-menu-item">
                          <SelectValue placeholder="Select menu item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {menuItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="100" {...field} data-testid="input-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="l">Liters (l)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reorderPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="20" {...field} data-testid="input-reorder-point" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorderQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Quantity (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="50" {...field} data-testid="input-reorder-quantity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-inventory"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
