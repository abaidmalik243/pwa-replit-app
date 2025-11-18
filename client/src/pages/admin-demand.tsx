import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, Package, TrendingDown, Search } from "lucide-react";
import type { MenuItem } from "@shared/schema";

export default function AdminDemand() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch menu items
  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Fetch categories for display
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Create category lookup map
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>);

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ id, stockQuantity }: { id: string; stockQuantity: number }) => {
      const res = await apiRequest("PUT", `/api/menu-items/${id}`, { stockQuantity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Success", description: "Stock updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter menu items based on search
  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const lowStockItems = menuItems.filter(
    (item) => item.stockQuantity !== null && item.lowStockThreshold !== null && item.stockQuantity <= item.lowStockThreshold
  );

  const outOfStockItems = menuItems.filter(
    (item) => item.stockQuantity !== null && item.stockQuantity === 0
  );

  const totalItemsTracked = menuItems.filter((item) => item.stockQuantity !== null).length;

  const handleStockUpdate = (id: string, currentStock: number, change: number) => {
    const newStock = Math.max(0, currentStock + change);
    updateStockMutation.mutate({ id, stockQuantity: newStock });
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar onLogout={() => console.log("Logout")} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Demand Tracking"]}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Inventory & Demand Tracking</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Monitor stock levels and manage inventory
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card data-testid="card-total-tracked">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Tracked</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-tracked">
                  {totalItemsTracked}
                </div>
                <p className="text-xs text-muted-foreground">
                  Out of {menuItems.length} total items
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-low-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-low-stock">
                  {lowStockItems.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need restocking
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-out-of-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-out-of-stock">
                  {outOfStockItems.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Urgent restocking needed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-items"
              />
            </div>
          </div>

          {/* Inventory Table */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading inventory...
            </div>
          ) : (
            <div className="bg-card rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Item Name</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Category</th>
                      <th className="text-center p-4 font-medium">Stock</th>
                      <th className="text-center p-4 font-medium hidden sm:table-cell">Threshold</th>
                      <th className="text-center p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const stock = item.stockQuantity ?? 0;
                      const threshold = item.lowStockThreshold ?? 10;
                      const isLowStock = stock <= threshold && stock > 0;
                      const isOutOfStock = stock === 0;

                      return (
                        <tr key={item.id} className="border-b last:border-0" data-testid={`row-item-${item.id}`}>
                          <td className="p-4">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground md:hidden">
                              Threshold: {threshold}
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell text-muted-foreground">
                            {item.categoryId ? categoryMap[item.categoryId] || "Unknown" : "Uncategorized"}
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-semibold" data-testid={`text-stock-${item.id}`}>
                              {stock}
                            </span>
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell text-muted-foreground">
                            {threshold}
                          </td>
                          <td className="p-4 text-center">
                            {isOutOfStock ? (
                              <Badge variant="destructive" data-testid={`badge-status-${item.id}`}>
                                Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-yellow-600" data-testid={`badge-status-${item.id}`}>
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-status-${item.id}`}>
                                In Stock
                              </Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStockUpdate(item.id, stock, -1)}
                                disabled={stock === 0 || updateStockMutation.isPending}
                                data-testid={`button-decrease-${item.id}`}
                              >
                                -
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStockUpdate(item.id, stock, 1)}
                                disabled={updateStockMutation.isPending}
                                data-testid={`button-increase-${item.id}`}
                              >
                                +
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStockUpdate(item.id, stock, 10)}
                                disabled={updateStockMutation.isPending}
                                className="hidden sm:inline-flex"
                                data-testid={`button-add-10-${item.id}`}
                              >
                                +10
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
