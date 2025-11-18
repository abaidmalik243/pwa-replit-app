import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CustomerHeader from "@/components/CustomerHeader";
import ImageSlider from "@/components/ImageSlider";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";
import MenuItemCard, { MenuItem } from "@/components/MenuItemCard";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import OrderTypeDialog from "@/components/OrderTypeDialog";
import OrderConfirmationDialog, { OrderDetails } from "@/components/OrderConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { MenuItem as DBMenuItem, Category, Branch } from "@shared/schema";

import burgerImage from "@assets/generated_images/Gourmet_burger_hero_image_fed670c3.png";
import friesImage from "@assets/generated_images/French_fries_menu_item_798d4b73.png";
import pizzaImage from "@assets/generated_images/Pizza_menu_item_b86f5a67.png";
import dessertImage from "@assets/generated_images/Dessert_menu_item_68b0df04.png";
import smoothieImage from "@assets/generated_images/Smoothie_bowl_menu_item_c11d017b.png";
import saladImage from "@assets/generated_images/Salad_menu_item_382600b1.png";
import beverageImage from "@assets/generated_images/Beverage_menu_item_083197e0.png";

// Fallback image mapping
const defaultImages: Record<string, string> = {
  Burger: burgerImage,
  Fries: friesImage,
  Pizza: pizzaImage,
  Dessert: dessertImage,
  Beverage: beverageImage,
  Salad: saladImage,
  Smoothie: smoothieImage,
};

export default function CustomerHome() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const { toast } = useToast();

  // Fetch branches from API
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch menu items from API
  const { data: dbMenuItems = [], isLoading: itemsLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Fetch categories from API
  const { data: dbCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Check if user has already selected location
  useEffect(() => {
    const savedOrderInfo = localStorage.getItem("kebabish-order-info");
    if (savedOrderInfo) {
      try {
        const parsed = JSON.parse(savedOrderInfo);
        setOrderType(parsed.orderType);
        setSelectedBranchId(parsed.branchId);
        setSelectedArea(parsed.area || "");
      } catch (e) {
        setIsOrderDialogOpen(true);
      }
    } else {
      setIsOrderDialogOpen(true);
    }
  }, []);

  const handleOrderSelection = (type: "delivery" | "pickup", branchId: string, area?: string) => {
    setOrderType(type);
    setSelectedBranchId(branchId);
    setSelectedArea(area || "");
    
    const orderInfo = {
      orderType: type,
      branchId,
      area: area || "",
    };
    localStorage.setItem("kebabish-order-info", JSON.stringify(orderInfo));

    const selectedBranch = branches.find(b => b.id === branchId);
    toast({
      title: "Location selected",
      description: `${type === "delivery" ? "Delivering to" : "Pickup from"} ${selectedBranch?.name || "selected branch"}${area ? ` - ${area}` : ""}`,
    });
  };

  // Transform database menu items to component format
  const menuItems: MenuItem[] = dbMenuItems
    .filter((item) => item.isAvailable)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: parseFloat(item.price),
      image: item.imageUrl || Object.values(defaultImages)[0],
      category: dbCategories.find((c) => c.id === item.categoryId)?.name || "Other",
      isVegetarian: false,
      isAvailable: item.isAvailable,
    }));

  // Get unique categories from menu items + "All" and "Bestsellers"
  const uniqueCategories = Array.from(
    new Set(menuItems.map((item) => item.category))
  );
  const categories = ["All", "Bestsellers", ...uniqueCategories];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "All" || activeCategory === "Bestsellers" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image }];
    });

    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCartItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order placed successfully!",
        description: `Your order #${data.orderNumber} has been received. We'll notify you when it's ready.`,
      });
      setCartItems([]);
      setIsCartOpen(false);
      setIsConfirmationOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error placing order",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    // Close cart and open confirmation dialog
    setIsCartOpen(false);
    setIsConfirmationOpen(true);
  };

  const handleConfirmOrder = (orderDetails: OrderDetails) => {
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    // Prepare order data
    const orderData = {
      orderNumber,
      branchId: selectedBranchId,
      customerName: orderDetails.customerName,
      customerPhone: orderDetails.customerPhone,
      alternativePhone: orderDetails.alternativePhone,
      customerAddress: orderDetails.customerAddress,
      deliveryArea: selectedArea,
      orderType: orderType === "pickup" ? "takeaway" : "delivery",
      paymentMethod: orderDetails.paymentMethod,
      items: JSON.stringify(cartItems),
      total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + (orderType === "delivery" ? 50 : 0),
      notes: orderDetails.notes,
      status: "pending",
    };

    createOrderMutation.mutate(orderData);
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const locationInfo = selectedBranch ? {
    city: selectedBranch.city,
    area: selectedArea,
    orderType,
  } : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CustomerHeader
        cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => console.log("Menu clicked")}
        locationInfo={locationInfo}
        onChangeLocation={() => setIsOrderDialogOpen(true)}
      />

      <ImageSlider />

      <div className="container px-4 py-6">
        <div className="relative max-w-2xl mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dishes, cuisines..."
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="container px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onAddToCart={handleAddToCart} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        )}
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
      />

      <OrderTypeDialog
        isOpen={isOrderDialogOpen}
        onClose={() => setIsOrderDialogOpen(false)}
        branches={branches}
        onSelect={handleOrderSelection}
        currentSelection={selectedBranchId ? {
          orderType,
          branchId: selectedBranchId,
          area: selectedArea,
        } : undefined}
      />

      <OrderConfirmationDialog
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        cartItems={cartItems}
        orderType={orderType}
        branchName={selectedBranch?.name}
        selectedArea={selectedArea}
        onConfirmOrder={handleConfirmOrder}
        isSubmitting={createOrderMutation.isPending}
      />
    </div>
  );
}
