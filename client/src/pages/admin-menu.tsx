import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MenuItemForm from "@/components/MenuItemForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { MenuItem as DBMenuItem, Category } from "@shared/schema";

export default function AdminMenu() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DBMenuItem | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { logout } = useAuth();

  // Fetch menu items and categories
  const { data: dbItems = [], isLoading: itemsLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const res = await apiRequest(`/api/menu-items/${id}`, "PUT", { isAvailable });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Availability updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/menu-items/${id}`, "DELETE");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({ title: "Item deleted", description: "Menu item has been removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem) {
        const res = await apiRequest(`/api/menu-items/${editingItem.id}`, "PUT", data);
        return await res.json();
      } else {
        const res = await apiRequest("/api/menu-items", "POST", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsFormOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? "Item updated" : "Item created", description: "Menu item has been saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleAvailability = (id: string, currentState: boolean) => {
    toggleAvailabilityMutation.mutate({ id, isAvailable: !currentState });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleEdit = (item: DBMenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
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
        <AdminSidebar
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={logout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader 
          breadcrumbs={["Admin", "Menu Items"]} 
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Menu Items</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Manage your restaurant menu items
              </p>
            </div>
            <Button onClick={handleOpenAddForm} data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {itemsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading menu items...
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 md:p-4 font-semibold text-sm">Image</th>
                    <th className="text-left p-3 md:p-4 font-semibold text-sm">Name</th>
                    <th className="text-left p-3 md:p-4 font-semibold text-sm">Category</th>
                    <th className="text-left p-3 md:p-4 font-semibold text-sm">Price</th>
                    <th className="text-left p-3 md:p-4 font-semibold text-sm">Available</th>
                    <th className="text-right p-3 md:p-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dbItems.map((item) => {
                    const category = categories.find((c) => c.id === item.categoryId);
                    return (
                      <tr key={item.id} className="border-t" data-testid={`row-menu-${item.id}`}>
                        <td className="p-3 md:p-4">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-md flex items-center justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <div>
                            <div className="font-medium text-sm md:text-base">{item.name}</div>
                            <div className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <Badge variant="secondary" className="text-xs">{category?.name || "N/A"}</Badge>
                        </td>
                        <td className="p-3 md:p-4 font-semibold text-sm md:text-base">PKR {parseFloat(item.price).toFixed(0)}</td>
                        <td className="p-3 md:p-4">
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={() => handleToggleAvailability(item.id, item.isAvailable)}
                            data-testid={`switch-available-${item.id}`}
                          />
                        </td>
                        <td className="p-3 md:p-4">
                          <div className="flex justify-end gap-1 md:gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingItem(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <MenuItemForm
            initialData={editingItem ? {
              name: editingItem.name,
              description: editingItem.description || "",
              price: parseFloat(editingItem.price),
              categoryId: editingItem.categoryId,
              imageUrl: editingItem.imageUrl || "",
              isAvailable: editingItem.isAvailable,
            } : undefined}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
