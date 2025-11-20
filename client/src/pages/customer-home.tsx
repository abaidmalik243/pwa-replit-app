import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CustomerHeader from "@/components/CustomerHeader";
import ImageSlider from "@/components/ImageSlider";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";
import MenuItemCard, { MenuItem } from "@/components/MenuItemCard";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import ItemCustomizationDialog, { VariantGroup, CustomizationSelection } from "@/components/ItemCustomizationDialog";
import OrderTypeDialog from "@/components/OrderTypeDialog";
import OrderConfirmationDialog, { OrderDetails } from "@/components/OrderConfirmationDialog";
import { CustomerJazzCashDialog } from "@/components/CustomerJazzCashDialog";
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
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [showJazzCashDialog, setShowJazzCashDialog] = useState(false);
  const [pendingJazzCashOrder, setPendingJazzCashOrder] = useState<{
    id: string;
    orderNumber: string;
    total: number;
  } | null>(null);
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
    console.log("[handleOrderSelection] Called with:", { type, branchId, area });
    setOrderType(type);
    setSelectedBranchId(branchId);
    setSelectedArea(area || "");
    console.log("[handleOrderSelection] State updated, branchId:", branchId);
    
    const orderInfo = {
      orderType: type,
      branchId,
      area: area || "",
    };
    localStorage.setItem("kebabish-order-info", JSON.stringify(orderInfo));
    console.log("[handleOrderSelection] Saved to localStorage:", orderInfo);

    const selectedBranch = branches.find(b => b.id === branchId);
    toast({
      title: "Location selected",
      description: `${type === "delivery" ? "Delivering to" : "Pickup from"} ${selectedBranch?.name || "selected branch"}${area ? ` - ${area}` : ""}`,
    });
  };

  // Transform database menu items to component format
  const menuItems: MenuItem[] = dbMenuItems
    .filter((item) => item.isAvailable)
    .map((item) => {
      const categoryName = dbCategories.find((c) => c.id === item.categoryId)?.name || "Other";
      const hasVariants = categoryName === "Pizzas" || categoryName === "Fries";
      return {
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: parseFloat(item.price),
        image: item.imageUrl || Object.values(defaultImages)[0],
        category: categoryName,
        isVegetarian: false,
        isAvailable: item.isAvailable,
        hasVariants,
      };
    });

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
    if (item.hasVariants) {
      setSelectedMenuItem(item);
      setIsCustomizationOpen(true);
    } else {
      addItemToCart(item, { variantSelections: {}, instructions: "", quantity: 1 });
    }
  };

  const addItemToCart = (item: MenuItem, customization: CustomizationSelection) => {
    const variantGroups = getVariantGroupsForItem(item);
    
    // Calculate final price including variant option prices - use reduce to avoid mutation
    const { finalPrice, variants } = variantGroups
      .filter(g => customization.variantSelections[g.id])
      .reduce((acc, g) => {
        const selectedOption = g.options.find(o => o.id === customization.variantSelections[g.id]);
        return {
          finalPrice: acc.finalPrice + (selectedOption?.price || 0),
          variants: [
            ...acc.variants,
            {
              groupName: g.name,
              optionName: selectedOption?.name || ""
            }
          ]
        };
      }, { finalPrice: item.price, variants: [] as { groupName: string; optionName: string }[] });

    // Check if identical item already exists in cart
    const existingItemIndex = cartItems.findIndex(cartItem => {
      // Must match: same menu item, same variants, same instructions
      if (cartItem.name !== item.name) return false;
      if ((cartItem.instructions || '') !== (customization.instructions || '')) return false;
      
      // Compare variants
      const cartVariantsStr = JSON.stringify(cartItem.variants || []);
      const newVariantsStr = JSON.stringify(variants);
      
      return cartVariantsStr === newVariantsStr;
    });

    if (existingItemIndex !== -1) {
      // Item exists, increase quantity
      setCartItems((prev) =>
        prev.map((cartItem, idx) =>
          idx === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + customization.quantity }
            : cartItem
        )
      );
    } else {
      // New item, add to cart
      const cartItem: CartItem = {
        id: `${item.id}-${Date.now()}`,
        name: item.name,
        description: item.description,
        price: finalPrice,
        quantity: customization.quantity,
        image: item.image,
        variants: variants.length > 0 ? variants : undefined,
        instructions: customization.instructions || undefined,
      };

      setCartItems((prev) => [...prev, cartItem]);
    }

    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(id);
    } else {
      setCartItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart",
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart",
    });
  };

  const getVariantGroupsForItem = (item: MenuItem): VariantGroup[] => {
    if (item.category === "Pizzas") {
      return [
        {
          id: "crust",
          name: "Crust Type",
          required: true,
          options: [
            { id: "deep-pan", name: "Deep Pan" },
            { id: "stuff-crust", name: "Stuff Crust" },
          ],
        },
        {
          id: "size",
          name: "Size",
          required: true,
          options: [
            { id: "6-inch", name: "Pan Pizza 6 Inches" },
            { id: "9-inch", name: "Pan Pizza 9 Inches", price: 100 },
            { id: "12-inch", name: "Pan Pizza 12 Inches", price: 200 },
          ],
        },
      ];
    }
    if (item.category === "Fries") {
      return [
        {
          id: "size",
          name: "Size",
          required: true,
          options: [
            { id: "small", name: "Small" },
            { id: "medium", name: "Medium", price: 50 },
            { id: "large", name: "Large", price: 100 },
          ],
        },
      ];
    }
    return [];
  };

  const popularItems = menuItems.filter(item => item.category === "Pizzas" || item.category === "Burgers").slice(0, 5);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("/api/orders", "POST", orderData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Close the cart and confirmation dialog
      setCartItems([]);
      setIsCartOpen(false);
      setIsConfirmationOpen(false);
      
      // Check payment method
      if (data.paymentMethod === "jazzcash") {
        // Open JazzCash payment dialog
        setPendingJazzCashOrder({
          id: data.id,
          orderNumber: data.orderNumber,
          total: parseFloat(data.total),
        });
        setShowJazzCashDialog(true);
        
        toast({
          title: "Order Created!",
          description: "Please complete your JazzCash payment to confirm your order.",
        });
      } else {
        // Cash on Delivery - no payment needed
        toast({
          title: "Order placed successfully!",
          description: `Your order #${data.orderNumber} has been received. We'll notify you when it's ready.`,
        });
      }
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
    console.log("[handleCheckout] Opening confirmation dialog, selectedBranchId:", selectedBranchId);
    // Close cart and open confirmation dialog
    setIsCartOpen(false);
    setIsConfirmationOpen(true);
  };

  const handleConfirmOrder = (orderDetails: OrderDetails) => {
    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    // Calculate amounts
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryCharges = orderType === "delivery" ? 50 : 0; // TODO: Calculate based on distance
    const total = subtotal + deliveryCharges;

    // Validate required data
    if (!selectedBranchId) {
      console.error("Missing branchId - cannot create order");
      toast({
        title: "Error",
        description: "Please select a branch before placing order",
        variant: "destructive",
      });
      return;
    }

    // Prepare order data - required fields only, add optional fields conditionally
    const orderData: Record<string, any> = {
      orderNumber,
      branchId: selectedBranchId,
      customerName: orderDetails.customerName,
      customerPhone: orderDetails.customerPhone,
      orderType: orderType === "pickup" ? "takeaway" : "delivery",
      paymentMethod: orderDetails.paymentMethod,
      items: JSON.stringify(cartItems),
      subtotal,
      deliveryCharges,
      total,
      status: "pending",
    };

    // Add optional fields only if they have non-empty values
    if (orderDetails.alternativePhone) {
      orderData.alternativePhone = orderDetails.alternativePhone;
    }
    if (orderDetails.customerAddress) {
      orderData.customerAddress = orderDetails.customerAddress;
    }
    if (selectedArea) {
      orderData.deliveryArea = selectedArea;
    }
    if (orderDetails.notes) {
      orderData.notes = orderDetails.notes;
    }

    console.log("Creating order with data:", orderData);
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
        popularItems={popularItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onAddPopularItem={handleAddToCart}
        onCheckout={handleCheckout}
      />

      <ItemCustomizationDialog
        isOpen={isCustomizationOpen}
        onClose={() => {
          setIsCustomizationOpen(false);
          setSelectedMenuItem(null);
        }}
        item={selectedMenuItem}
        variantGroups={selectedMenuItem ? getVariantGroupsForItem(selectedMenuItem) : []}
        onAddToCart={addItemToCart}
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

      {/* JazzCash Payment Dialog */}
      {pendingJazzCashOrder && (
        <CustomerJazzCashDialog
          open={showJazzCashDialog}
          onClose={() => {
            setShowJazzCashDialog(false);
            setPendingJazzCashOrder(null);
          }}
          orderId={pendingJazzCashOrder.id}
          orderNumber={pendingJazzCashOrder.orderNumber}
          totalAmount={pendingJazzCashOrder.total}
          branchId={selectedBranchId}
          onPaymentComplete={() => {
            setShowJazzCashDialog(false);
            setPendingJazzCashOrder(null);
          }}
        />
      )}
    </div>
  );
}
