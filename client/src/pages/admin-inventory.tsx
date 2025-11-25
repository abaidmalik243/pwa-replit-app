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
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Package, AlertTriangle, Edit, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import type { MenuItem, ReorderPoint, Supplier } from "@shared/schema";

// Schema for adjusting stock quantity
const stockAdjustmentSchema = z.object({
  stockQuantity: z.string().min(1, "Stock quantity is required").transform(val => parseInt(val, 10)),
  lowStockThreshold: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

// Schema for setting/editing reorder point
const reorderPointSchema = z.object({
  reorderLevel: z.string().min(1, "Reorder level is required").transform(val => parseInt(val, 10)),
  reorderQuantity: z.string().min(1, "Reorder quantity is required").transform(val => parseInt(val, 10)),
  preferredSupplierId: z.string().optional(),
  leadTimeDays: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
type ReorderPointFormData = z.infer<typeof reorderPointSchema>;

interface MenuItemWithReorderPoint extends MenuItem {
  reorderPoint?: ReorderPoint;
  supplier?: Supplier;
}

export default function AdminInventory() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithReorderPoint | null>(null);

  const branchId = user?.branchId;

  // Fetch menu items
  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Fetch reorder points for this branch
  const { data: reorderPoints = [], isLoading: reorderPointsLoading } = useQuery<ReorderPoint[]>({
    queryKey: ["/api/inventory/reorder-points", branchId],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");
      const response = await fetch(`/api/inventory/reorder-points/${branchId}`);
      if (!response.ok) throw new Error("Failed to fetch reorder points");
      return response.json();
    },
    enabled: !!branchId,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch low stock items from API
  const { data: lowStockItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/inventory/low-stock", branchId],
    queryFn: async () => {
      if (!branchId) throw new Error("Branch ID is required");
      const response = await fetch(`/api/inventory/low-stock/${branchId}`);
      if (!response.ok) throw new Error("Failed to fetch low stock items");
      return response.json();
    },
    enabled: !!branchId,
  });

  const stockForm = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      stockQuantity: "",
      lowStockThreshold: "",
    },
  });

  const reorderForm = useForm<ReorderPointFormData>({
    resolver: zodResolver(reorderPointSchema),
    defaultValues: {
      reorderLevel: "",
      reorderQuantity: "",
      preferredSupplierId: "none",
      leadTimeDays: "",
    },
  });

  // Mutation to update menu item stock
  const updateStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) =>
      apiRequest(`/api/menu-items/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock", branchId] });
      toast({ title: "Success", description: "Stock quantity updated" });
      setStockDialogOpen(false);
      stockForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to create reorder point
  const createReorderPointMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/inventory/reorder-points", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reorder-points", branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock", branchId] });
      toast({ title: "Success", description: "Reorder point created" });
      setReorderDialogOpen(false);
      reorderForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to update reorder point
  const updateReorderPointMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/inventory/reorder-points/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reorder-points", branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock", branchId] });
      toast({ title: "Success", description: "Reorder point updated" });
      setReorderDialogOpen(false);
      reorderForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to delete reorder point
  const deleteReorderPointMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/inventory/reorder-points/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/reorder-points", branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock", branchId] });
      toast({ title: "Success", description: "Reorder point deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Join menu items with reorder points and suppliers
  const menuItemsWithReorderPoints: MenuItemWithReorderPoint[] = menuItems.map(item => {
    const reorderPoint = reorderPoints.find(
      rp => rp.menuItemId === item.id && rp.branchId === branchId
    );
    const supplier = reorderPoint
      ? suppliers.find(s => s.id === reorderPoint.preferredSupplierId)
      : undefined;
    return { ...item, reorderPoint, supplier };
  });

  // Filter to only show items with stock tracking
  const inventoryItems = menuItemsWithReorderPoints.filter(
    item => item.stockQuantity !== null && item.stockQuantity !== undefined
  );

  // Calculate low stock alerts
  const lowStockAlerts = inventoryItems.filter(item => {
    if (item.reorderPoint) {
      return (item.stockQuantity || 0) <= item.reorderPoint.reorderLevel;
    }
    return (item.stockQuantity || 0) <= (item.lowStockThreshold || 0);
  });

  const handleOpenStockDialog = (item: MenuItemWithReorderPoint) => {
    setSelectedItem(item);
    stockForm.reset({
      stockQuantity: item.stockQuantity?.toString() || "0",
      lowStockThreshold: item.lowStockThreshold?.toString() || "",
    });
    setStockDialogOpen(true);
  };

  const handleOpenReorderDialog = (item: MenuItemWithReorderPoint) => {
    setSelectedItem(item);
    if (item.reorderPoint) {
      reorderForm.reset({
        reorderLevel: item.reorderPoint.reorderLevel.toString(),
        reorderQuantity: item.reorderPoint.reorderQuantity.toString(),
        preferredSupplierId: item.reorderPoint.preferredSupplierId || "",
        leadTimeDays: item.reorderPoint.leadTimeDays?.toString() || "",
      });
    } else {
      reorderForm.reset({
        reorderLevel: "",
        reorderQuantity: "",
        preferredSupplierId: "",
        leadTimeDays: "",
      });
    }
    setReorderDialogOpen(true);
  };

  const onStockSubmit = (data: StockAdjustmentFormData) => {
    if (!selectedItem) return;

    const updateData: Partial<MenuItem> = {
      stockQuantity: data.stockQuantity,
    };

    if (data.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = data.lowStockThreshold;
    }

    updateStockMutation.mutate({ id: selectedItem.id, data: updateData });
  };

  const onReorderSubmit = (data: ReorderPointFormData) => {
    if (!selectedItem || !branchId) return;

    const payload = {
      menuItemId: selectedItem.id,
      branchId,
      reorderLevel: data.reorderLevel,
      reorderQuantity: data.reorderQuantity,
      preferredSupplierId: data.preferredSupplierId === "none" || !data.preferredSupplierId ? null : data.preferredSupplierId,
      leadTimeDays: data.leadTimeDays || 7,
      isActive: true,
    };

    if (selectedItem.reorderPoint) {
      updateReorderPointMutation.mutate({ id: selectedItem.reorderPoint.id, data: payload });
    } else {
      createReorderPointMutation.mutate(payload);
    }
  };

  const handleDeleteReorderPoint = (reorderPointId: string) => {
    if (confirm("Are you sure you want to delete this reorder point?")) {
      deleteReorderPointMutation.mutate(reorderPointId);
    }
  };

  const isLoading = menuItemsLoading || reorderPointsLoading;

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar
          soundEnabled={false}
          onToggleSound={() => {}}
          onLogout={logout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Inventory Management"]}
          notificationCount={0}
          userName={user?.fullName || "Admin User"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-items">
                    {inventoryItems.length}
                  </div>
                  <p className="text-xs text-muted-foreground">With stock tracking</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600" data-testid="text-low-stock-count">
                    {lowStockAlerts.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Items need reorder</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reorder Points Set</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-reorder-points-count">
                    {reorderPoints.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Configured items</p>
                </CardContent>
              </Card>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-inventory-title">Inventory Items</h2>
                <p className="text-muted-foreground">Manage stock levels and reorder settings</p>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
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
                    {lowStockAlerts.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                        data-testid={`alert-item-${item.id}`}
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: {item.stockQuantity} {item.reorderPoint ? `| Reorder at: ${item.reorderPoint.reorderLevel}` : `| Threshold: ${item.lowStockThreshold}`}
                          </p>
                        </div>
                        <Badge variant="destructive" data-testid={`badge-low-stock-${item.id}`}>
                          Low Stock
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory Items Table */}
            {isLoading ? (
              <div className="text-center py-12">Loading inventory...</div>
            ) : inventoryItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No inventory items found</p>
                  <p className="text-sm text-muted-foreground">
                    Menu items with stock tracking will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Items</CardTitle>
                  <CardDescription>
                    {inventoryItems.length} items with stock tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventoryItems.map(item => {
                      const isLowStock = lowStockAlerts.some(alert => alert.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                          data-testid={`inventory-item-${item.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold" data-testid={`text-item-name-${item.id}`}>
                                {item.name}
                              </h3>
                              {isLowStock && (
                                <Badge variant="destructive" className="text-xs">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Stock:</span>{" "}
                                <span data-testid={`text-stock-${item.id}`}>{item.stockQuantity}</span>
                              </div>
                              <div>
                                <span className="font-medium">Threshold:</span>{" "}
                                <span data-testid={`text-threshold-${item.id}`}>{item.lowStockThreshold || "N/A"}</span>
                              </div>
                              {item.reorderPoint && (
                                <>
                                  <div>
                                    <span className="font-medium">Reorder Level:</span>{" "}
                                    <span data-testid={`text-reorder-level-${item.id}`}>{item.reorderPoint.reorderLevel}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Reorder Qty:</span>{" "}
                                    <span data-testid={`text-reorder-qty-${item.id}`}>{item.reorderPoint.reorderQuantity}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {item.supplier && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Supplier: {item.supplier.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStockDialog(item)}
                              data-testid={`button-adjust-stock-${item.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Adjust Stock
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReorderDialog(item)}
                              data-testid={`button-set-reorder-${item.id}`}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              {item.reorderPoint ? "Edit" : "Set"} Reorder
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </main>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent data-testid="dialog-adjust-stock">
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
            <DialogDescription>
              Update stock levels for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...stockForm}>
            <form onSubmit={stockForm.handleSubmit(onStockSubmit)} className="space-y-4">
              <FormField
                control={stockForm.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter stock quantity"
                        {...field}
                        data-testid="input-stock-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter threshold"
                        {...field}
                        data-testid="input-low-stock-threshold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStockDialogOpen(false)}
                  data-testid="button-cancel-stock"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateStockMutation.isPending}
                  data-testid="button-save-stock"
                >
                  {updateStockMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reorder Point Dialog */}
      <Dialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
        <DialogContent data-testid="dialog-reorder-point">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.reorderPoint ? "Edit" : "Set"} Reorder Point
            </DialogTitle>
            <DialogDescription>
              Configure reorder settings for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...reorderForm}>
            <form onSubmit={reorderForm.handleSubmit(onReorderSubmit)} className="space-y-4">
              <FormField
                control={reorderForm.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Reorder when stock reaches this level"
                        {...field}
                        data-testid="input-reorder-level"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reorderForm.control}
                name="reorderQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="How much to order"
                        {...field}
                        data-testid="input-reorder-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={reorderForm.control}
                name="preferredSupplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Supplier (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No supplier</SelectItem>
                        {suppliers.map(supplier => (
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
              <FormField
                control={reorderForm.control}
                name="leadTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Expected delivery time (default: 7)"
                        {...field}
                        data-testid="input-lead-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                {selectedItem?.reorderPoint && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteReorderPoint(selectedItem.reorderPoint!.id)}
                    disabled={deleteReorderPointMutation.isPending}
                    data-testid="button-delete-reorder"
                  >
                    Delete
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReorderDialogOpen(false)}
                  data-testid="button-cancel-reorder"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReorderPointMutation.isPending || updateReorderPointMutation.isPending}
                  data-testid="button-save-reorder"
                >
                  {createReorderPointMutation.isPending || updateReorderPointMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
