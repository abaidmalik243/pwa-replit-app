import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import OrderCard, { Order } from "@/components/OrderCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSocketEvent } from "@/context/SocketContext";
import { playNotificationSound } from "@/lib/notificationSound";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Clock, CheckCircle, AlertCircle, ChefHat, Truck, CreditCard, Calendar } from "lucide-react";
import type { Order as DBOrder, StaffShift, ShiftAssignment } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

export default function StaffDashboard() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const previousPendingCount = useRef(0);
  const hasInitialized = useRef(false);

  const { data: dbOrders = [], isLoading: ordersLoading } = useQuery<DBOrder[]>({
    queryKey: ["/api/orders"],
  });

  const { data: shiftsData } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/shift-assignments"],
  });

  useSocketEvent<DBOrder>("order:created", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  });

  useSocketEvent<DBOrder>("order:statusUpdated", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  });

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

  useEffect(() => {
    if (ordersLoading) return;
    
    const currentPendingCount = orders.filter((o) => o.status === "pending").length;
    
    if (!hasInitialized.current) {
      previousPendingCount.current = currentPendingCount;
      hasInitialized.current = true;
      return;
    }
    
    if (currentPendingCount > previousPendingCount.current && soundEnabled) {
      playNotificationSound();
      toast({
        title: "New Order!",
        description: `You have ${currentPendingCount} pending order${currentPendingCount > 1 ? 's' : ''}`,
      });
    }
    
    previousPendingCount.current = currentPendingCount;
  }, [orders, soundEnabled, toast, ordersLoading]);

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

  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  });

  const myShifts = (shiftsData || []).filter((shift) => 
    shift.userId === user?.id && 
    new Date(shift.startDateTime) >= new Date()
  ).slice(0, 3);

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
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Staff", "Dashboard"]}
          notificationCount={pendingOrders.length}
          userName={user?.fullName || "Staff"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-staff-dashboard-title">
              Welcome, {user?.fullName || "Staff"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage orders and track your daily tasks
            </p>
          </div>

          {ordersLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading dashboard...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card data-testid="card-pending-orders">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
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

                <Card data-testid="card-preparing-orders">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <ChefHat className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-preparing-count">
                      {preparingOrders.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Being prepared
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-ready-orders">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ready</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-ready-count">
                      {readyOrders.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ready for pickup/delivery
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-today-orders">
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-today-count">
                      {todayOrders.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total orders today
                    </p>
                  </CardContent>
                </Card>
              </div>

              {myShifts.length > 0 && (
                <Card className="mb-6" data-testid="card-upcoming-shifts">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Shifts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{format(new Date(shift.startDateTime), "EEEE, MMM d")}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(shift.startDateTime), "h:mm a")} - {format(new Date(shift.endDateTime), "h:mm a")}
                            </p>
                          </div>
                          <Badge variant={shift.status === "scheduled" ? "secondary" : "default"}>
                            {shift.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
