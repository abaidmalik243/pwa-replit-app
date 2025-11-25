import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import CustomerHeader from "@/components/CustomerHeader";
import Footer from "@/components/Footer";
import { ShoppingBag, ChevronLeft, RefreshCw, Package } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  variants?: { groupName: string; optionName: string }[];
  specialInstructions?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  orderType: string;
  items: OrderItem[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  ready: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export default function CustomerOrders() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  if (!isAuthenticated || user?.role !== "customer") {
    setLocation("/login");
    return null;
  }

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: [`/api/customers/${user.id}/orders`],
  });

  const reorderMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest(`/api/customers/${user.id}/orders/${orderId}/reorder`, "POST"),
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: "Items added to cart. You can review and place your order." 
      });
      // In a real app, this would navigate to cart or update cart state
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/account")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Order History</h1>
              <p className="text-muted-foreground" data-testid="text-orders-count">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
              </p>
            </div>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <p data-testid="text-loading">Loading orders...</p>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2" data-testid="text-empty-state">No orders yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your order history will appear here
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-start-shopping">
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg" data-testid={`text-order-number-${order.id}`}>
                            Order #{order.orderNumber}
                          </CardTitle>
                          <Badge className={statusColors[order.status] || statusColors.pending} data-testid={`badge-status-${order.id}`}>
                            {order.status}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1" data-testid={`text-order-date-${order.id}`}>
                          {format(new Date(order.createdAt), "PPp")} • {order.orderType}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-primary" data-testid={`text-total-${order.id}`}>
                          ₨{order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Order Items */}
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm" data-testid={`item-${order.id}-${index}`}>
                          <div className="flex-1">
                            <p className="font-medium" data-testid={`text-item-quantity-${order.id}-${index}`}>
                              {item.quantity}x Item
                            </p>
                            {item.variants && item.variants.length > 0 && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-item-variants-${order.id}-${index}`}>
                                {item.variants.map(v => `${v.groupName}: ${v.optionName}`).join(", ")}
                              </p>
                            )}
                          </div>
                          <p className="text-muted-foreground" data-testid={`text-item-price-${order.id}-${index}`}>
                            ₨{(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reorderMutation.mutate(order.id)}
                        disabled={reorderMutation.isPending}
                        data-testid={`button-reorder-${order.id}`}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {reorderMutation.isPending ? "Processing..." : "Reorder"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({ 
                            title: "Coming Soon", 
                            description: "Order tracking feature will be available soon" 
                          });
                        }}
                        data-testid={`button-track-${order.id}`}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
