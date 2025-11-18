import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import OrderCard, { Order } from "@/components/OrderCard";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { Button } from "@/components/ui/button";
import type { Order as DBOrder } from "@shared/schema";

export default function AdminDashboard() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const previousPendingCount = useRef(0);
  const hasInitialized = useRef(false);

  // Fetch orders from API
  const { data: dbOrders = [], isLoading } = useQuery<DBOrder[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30000, // Refetch every 30 seconds for new orders
  });

  // Transform DB orders to match OrderCard format
  const orders: Order[] = dbOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: JSON.parse(order.items),
    total: parseFloat(order.total),
    status: order.status as "pending" | "preparing" | "ready" | "completed" | "cancelled",
    createdAt: new Date(order.createdAt),
  }));

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/orders/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Monitor for new pending orders and play sound
  useEffect(() => {
    // Skip if data is still loading
    if (isLoading) return;
    
    const currentPendingCount = orders.filter((o) => o.status === "pending").length;
    
    // Initialize previousPendingCount on first data load to prevent false alerts
    if (!hasInitialized.current) {
      previousPendingCount.current = currentPendingCount;
      hasInitialized.current = true;
      return;
    }
    
    // Play sound only when pending count increases (indicating a truly new order)
    if (currentPendingCount > previousPendingCount.current && soundEnabled) {
      playNotificationSound();
      toast({
        title: "🔔 New Order!",
        description: `You have ${currentPendingCount} pending order${currentPendingCount > 1 ? 's' : ''}`,
      });
    }
    
    previousPendingCount.current = currentPendingCount;
  }, [orders, soundEnabled, toast, isLoading]);

  const handleAccept = (id: string) => {
    updateOrderMutation.mutate(
      { id, status: "preparing" },
      {
        onSuccess: () => {
          toast({
            title: "Order accepted",
            description: "Order has been moved to preparing status",
          });
        },
      }
    );
  };

  const handleReject = (id: string) => {
    updateOrderMutation.mutate(
      { id, status: "cancelled" },
      {
        onSuccess: () => {
          toast({
            title: "Order rejected",
            description: "Order has been cancelled",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleMarkReady = (id: string) => {
    updateOrderMutation.mutate(
      { id, status: "ready" },
      {
        onSuccess: () => {
          toast({
            title: "Order ready",
            description: "Order is ready for pickup",
          });
        },
      }
    );
  };

  const handleCancel = (id: string) => {
    updateOrderMutation.mutate(
      { id, status: "cancelled" },
      {
        onSuccess: () => {
          toast({
            title: "Order cancelled",
            description: "Order has been cancelled",
            variant: "destructive",
          });
        },
      }
    );
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

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
          onLogout={() => console.log("Logout")}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Dashboard"]}
          notificationCount={pendingOrders.length}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Dashboard</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Manage incoming orders and update their status
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading orders...
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                New Orders
                {pendingOrders.length > 0 && (
                  <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
                    {pendingOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
                {pendingOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No pending orders</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                In Progress
                {preparingOrders.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {preparingOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkReady={handleMarkReady}
                    onCancel={handleCancel}
                  />
                ))}
                {preparingOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No orders in progress</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                Ready for Pickup
                {readyOrders.length > 0 && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {readyOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {readyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {readyOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No orders ready</p>
                )}
              </div>
            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
