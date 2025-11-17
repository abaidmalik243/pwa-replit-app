import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MenuItemForm from "@/components/MenuItemForm";
import { useToast } from "@/hooks/use-toast";

import burgerImage from "@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png";
import friesImage from "@assets/generated_images/French_fries_menu_item_798d4b73.png";
import pizzaImage from "@assets/generated_images/Pizza_menu_item_b86f5a67.png";

//todo: remove mock functionality
const MOCK_ITEMS = [
  {
    id: "1",
    name: "Gourmet Burger",
    description: "Juicy beef patty with cheese",
    price: 12.99,
    category: "Main Course",
    isVegetarian: false,
    isAvailable: true,
    image: burgerImage,
  },
  {
    id: "2",
    name: "Crispy Fries",
    description: "Golden french fries",
    price: 4.99,
    category: "Appetizers",
    isVegetarian: true,
    isAvailable: true,
    image: friesImage,
  },
  {
    id: "3",
    name: "Pepperoni Pizza",
    description: "Classic pizza with pepperoni",
    price: 14.99,
    category: "Main Course",
    isVegetarian: false,
    isAvailable: false,
    image: pizzaImage,
  },
];

export default function AdminMenu() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  const handleToggleAvailability = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: "Item deleted",
      description: "Menu item has been removed",
    });
  };

  const handleSubmit = (data: any) => {
    console.log("Form submitted:", data);
    setIsFormOpen(false);
    toast({
      title: "Item saved",
      description: "Menu item has been saved successfully",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64">
        <AdminSidebar
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={() => console.log("Logout")}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader breadcrumbs={["Admin", "Menu Items"]} userName="Admin User" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Menu Items</h1>
              <p className="text-muted-foreground">
                Manage your restaurant menu items
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)} data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-semibold">Image</th>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-left p-4 font-semibold">Price</th>
                  <th className="text-left p-4 font-semibold">Available</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t" data-testid={`row-menu-${item.id}`}>
                    <td className="p-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">{item.category}</Badge>
                    </td>
                    <td className="p-4 font-semibold">${item.price.toFixed(2)}</td>
                    <td className="p-4">
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() => handleToggleAvailability(item.id)}
                        data-testid={`switch-available-${item.id}`}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => console.log("Edit", item.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <MenuItemForm
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
