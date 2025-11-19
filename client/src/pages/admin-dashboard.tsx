import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import OrderCard, { Order } from "@/components/OrderCard";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Clock } from "lucide-react";
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
    status: (order.status === "completed" ? "delivered" : order.status) as Order["status"],
    createdAt: new Date(order.createdAt),
  }));

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/api/orders/${id}`, "PUT", { status });
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
  const completedOrders = orders.filter((o) => o.status === "delivered");

  // Calculate statistics
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, order) => sum + order.total, 0);

  const todayRevenue = orders
    .filter((o) => {
      const orderDate = new Date(o.createdAt);
      const today = new Date();
      return (
        orderDate.getDate() === today.getDate() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getFullYear() === today.getFullYear() &&
        o.status === "delivered"
      );
    })
    .reduce((sum, order) => sum + order.total, 0);

  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  }).length;

  const avgOrderValue = completedOrders.length > 0 
    ? totalRevenue / completedOrders.length 
    : 0;

  // Prepare chart data - last 7 days
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      return (
        orderDate.getDate() === date.getDate() &&
        orderDate.getMonth() === date.getMonth() &&
        orderDate.getFullYear() === date.getFullYear()
      );
    });
    
    const dayRevenue = dayOrders
      .filter((o) => o.status === "delivered")
      .reduce((sum, order) => sum + order.total, 0);

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: dayOrders.length,
      revenue: parseFloat(dayRevenue.toFixed(2)),
    };
  });

  // Popular items analysis - aggregate by item name
  const itemFrequency: { [key: string]: { name: string; count: number } } = {};
  completedOrders.forEach((order) => {
    order.items.forEach((item: any) => {
      const itemName = item.name;
      if (itemFrequency[itemName]) {
        itemFrequency[itemName].count += item.quantity;
      } else {
        itemFrequency[itemName] = { name: itemName, count: item.quantity };
      }
    });
  });

  const popularItems = Object.values(itemFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({ ...item, name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name }));

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
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage incoming orders and monitor performance
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading dashboard...
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card data-testid="card-today-revenue">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-today-revenue">
                      Rs {todayRevenue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {todayOrders} order{todayOrders !== 1 ? "s" : ""} today
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-revenue">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-revenue">
                      Rs {totalRevenue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedOrders.length} completed orders
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-avg-order">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-order">
                      Rs {avgOrderValue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per completed order
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-pending-orders">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-pending-count">
                      {pendingOrders.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting action
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card data-testid="card-chart-revenue">
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={last7DaysData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card data-testid="card-chart-popular-items">
                  <CardHeader>
                    <CardTitle>Top 5 Popular Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={popularItems}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Order Columns */}
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
