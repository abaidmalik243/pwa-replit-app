import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Minus, Search, Grid, List, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem as DbMenuItem, Category, PosTable, PosSession, Branch } from "@shared/schema";
import ItemCustomizationDialog, { CustomizationSelection } from "@/components/ItemCustomizationDialog";
import type { MenuItem as ComponentMenuItem } from "@/components/MenuItemCard";

interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  variants: Array<{ groupName: string; optionName: string }>;
  specialInstructions?: string;
  image?: string;
}

export default function PosMain() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ComponentMenuItem | null>(null);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Get user from localStorage
  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();
  const userBranchId = user.branchId;

  // Read table query parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get("table");
    if (tableId) {
      setSelectedTable(tableId);
      setOrderType("dine-in");
    }
  }, []);

  // Fetch menu items
  const { data: dbMenuItems = [] } = useQuery<DbMenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  // Convert database menu items to component menu items
  const menuItems: ComponentMenuItem[] = dbMenuItems.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    category: item.categoryId || "",
    isAvailable: item.isAvailable,
    hasVariants: false, // TODO: Determine from variant groups
  }));

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch POS tables
  const { data: tables = [] } = useQuery<PosTable[]>({
    queryKey: ["/api/pos/tables", userBranchId],
    queryFn: () => fetch(`/api/pos/tables?branchId=${userBranchId}`).then(res => res.json()),
    enabled: !!userBranchId && orderType === "dine-in",
  });

  // Get or create active POS session
  const { data: activeSession } = useQuery<PosSession | null>({
    queryKey: ["/api/pos/sessions/active", userBranchId],
    queryFn: () => fetch(`/api/pos/sessions/active/${userBranchId}`).then(res => res.json()),
    enabled: !!userBranchId,
  });

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.isAvailable;
  });

  const handleItemClick = (item: ComponentMenuItem) => {
    setSelectedItem(item);
    setShowCustomizationDialog(true);
  };

  const handleAddToCart = (item: ComponentMenuItem, customization: CustomizationSelection) => {
    const cartItemId = `${item.id}-${Date.now()}`;
    const variants = Object.entries(customization.variantSelections).map(([groupName, optionName]) => ({
      groupName,
      optionName,
    }));
    const newCartItem: CartItem = {
      id: cartItemId,
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: customization.quantity,
      variants,
      specialInstructions: customization.instructions,
      image: item.image || undefined,
    };

    setCart(prev => [...prev, newCartItem]);
    setShowCustomizationDialog(false);
    toast({
      title: "Item added",
      description: `${item.name} added to cart`,
    });
  };

  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.id === cartItemId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("/api/orders", "POST", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order created",
        description: "Order has been successfully placed",
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedTable(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to cart",
        variant: "destructive",
      });
      return;
    }

    if (!customerName || !customerPhone) {
      toast({
        title: "Missing information",
        description: "Please enter customer name and phone",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "dine-in" && !selectedTable) {
      toast({
        title: "No table selected",
        description: "Please select a table for dine-in orders",
        variant: "destructive",
      });
      return;
    }

    if (!userBranchId) {
      toast({
        title: "Error",
        description: "User branch not found",
        variant: "destructive",
      });
      return;
    }

    // Generate order number with branch prefix
    const orderNumber = `ORD-${Date.now()}`;
    
    // Calculate totals
    const subtotal = calculateTotal();
    const discount = 0;
    const deliveryCharges = orderType === "delivery" ? 50 : 0;
    const total = subtotal - discount + deliveryCharges;

    // Serialize cart items for database
    const orderItems = cart.map(item => ({
      id: item.id,
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      variants: item.variants,
      specialInstructions: item.specialInstructions,
    }));

    const orderData = {
      orderNumber,
      branchId: userBranchId,
      sessionId: activeSession?.id || null,
      tableId: orderType === "dine-in" ? selectedTable : null,
      customerName,
      customerPhone,
      alternativePhone: null,
      customerAddress: orderType === "delivery" ? "" : null,
      deliveryArea: orderType === "delivery" ? "" : null,
      orderType,
      orderSource: "pos",
      paymentMethod: "cash",
      paymentStatus: "pending",
      items: JSON.stringify(orderItems),
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      discountReason: null,
      deliveryCharges: deliveryCharges.toString(),
      deliveryDistance: null,
      total: total.toString(),
      status: "pending",
      waiterId: null,
      servedBy: user.id || null,
      notes: null,
    };

    createOrderMutation.mutate(orderData);
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
          soundEnabled={true}
          onToggleSound={() => {}}
          onLogout={() => {
            localStorage.removeItem("user");
            navigate("/login");
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["POS", "Order Entry"]}
          notificationCount={0}
          userName={user.fullName || "Staff"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-hidden p-2">
          <div className="flex h-full gap-2">
        {/* Left: Menu Items */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-menu"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              data-testid="button-toggle-view"
              size="icon"
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>

          {/* Categories */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Badge
                data-testid="badge-category-all"
                className={`cursor-pointer ${!selectedCategory ? "bg-primary" : "bg-muted"}`}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Badge>
              {categories.filter(c => c.isActive).map((category) => (
                <Badge
                  key={category.id}
                  data-testid={`badge-category-${category.id}`}
                  className={`cursor-pointer whitespace-nowrap ${selectedCategory === category.id ? "bg-primary" : "bg-muted"}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>

          {/* Menu items grid */}
          <ScrollArea className="flex-1">
            <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" : "flex flex-col gap-2"}>
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  data-testid={`card-menu-item-${item.id}`}
                  className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden"
                  onClick={() => handleItemClick(item)}
                >
                  {item.image && viewMode === "grid" && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-24 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    <p className="text-sm font-bold mt-1">Rs. {item.price.toLocaleString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Cart/Order Summary */}
        <Card className="w-80 lg:w-96 flex flex-col">
          <div className="p-4 space-y-3 flex-1 flex flex-col">
            <h2 className="text-lg font-bold">Current Order</h2>

            {/* Order type selection */}
            <Select value={orderType} onValueChange={(v: "dine-in" | "takeaway" | "delivery") => setOrderType(v)}>
              <SelectTrigger data-testid="select-order-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dine-in">Dine-In</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>

            {/* Table selection for dine-in */}
            {orderType === "dine-in" && (
              <Select value={selectedTable || ""} onValueChange={setSelectedTable}>
                <SelectTrigger data-testid="select-table">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.filter(t => t.isActive && t.status === "available").map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.tableName} (Capacity: {table.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Customer info */}
            <Input
              data-testid="input-customer-name"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              data-testid="input-customer-phone"
              placeholder="Customer phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />

            <Separator />

            {/* Cart items */}
            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">Rs. {item.price.toLocaleString()}</p>
                          {item.variants.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.variants.map(v => v.optionName).join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          data-testid={`button-remove-${item.id}`}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => removeCartItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            data-testid={`button-decrease-${item.id}`}
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateCartItemQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            data-testid={`button-increase-${item.id}`}
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateCartItemQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-bold">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Total */}
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>Rs. {calculateTotal().toLocaleString()}</span>
              </div>
              <Button
                data-testid="button-place-order"
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
              </Button>
            </div>
          </div>
        </Card>
          </div>
        </main>
      </div>

      {/* Item customization dialog */}
      {selectedItem && (
        <ItemCustomizationDialog
          item={selectedItem}
          isOpen={showCustomizationDialog}
          onClose={() => {
            setShowCustomizationDialog(false);
            setSelectedItem(null);
          }}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
