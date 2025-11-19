import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { DollarSign, ShoppingCart, CreditCard, TrendingUp, Calendar, Users, Menu } from "lucide-react";
import { useLocation } from "wouter";
import type { Order, PosSession } from "@shared/schema";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

export default function PosReports() {
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState("today");
  
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
  const viewingAllBranches = userBranchId === "all";

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "week":
        return { start: subDays(startOfDay(now), 7), end: endOfDay(now) };
      case "month":
        return { start: subDays(startOfDay(now), 30), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  // Fetch orders
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", userBranchId],
    queryFn: () => {
      const url = viewingAllBranches 
        ? "/api/orders" 
        : `/api/orders?branchId=${userBranchId}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!userBranchId,
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<PosSession[]>({
    queryKey: ["/api/pos/sessions", userBranchId],
    queryFn: () => {
      const url = viewingAllBranches 
        ? "/api/pos/sessions" 
        : `/api/pos/sessions?branchId=${userBranchId}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!userBranchId,
  });

  // Filter orders by date range
  const { start, end } = getDateRange();
  const filteredOrders = allOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= start && orderDate <= end && order.orderSource === "pos";
  });

  // Calculate metrics
  const totalSales = filteredOrders
    .filter(o => o.paymentStatus === "paid")
    .reduce((sum, order) => sum + parseFloat(order.total), 0);

  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter(o => o.paymentStatus === "paid").length;
  const pendingOrders = filteredOrders.filter(o => o.paymentStatus === "pending").length;

  // Payment method breakdown
  const paymentBreakdown = filteredOrders
    .filter(o => o.paymentStatus === "paid")
    .reduce((acc, order) => {
      const method = order.paymentMethod || "cash";
      acc[method] = (acc[method] || 0) + parseFloat(order.total);
      return acc;
    }, {} as Record<string, number>);

  // Order status breakdown
  const statusBreakdown = filteredOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Average order value
  const avgOrderValue = paidOrders > 0 ? totalSales / paidOrders : 0;

  // Popular items (simplified - would need to parse items JSON in production)
  const getPopularItems = () => {
    const itemCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        items.forEach((item: any) => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      } catch (e) {
        // Skip orders with invalid items JSON
      }
    });
    return Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  const popularItems = getPopularItems();

  // Sessions in date range
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.openedAt);
    return sessionDate >= start && sessionDate <= end;
  });

  const closedSessions = filteredSessions.filter(s => s.status === "closed");
  const totalSessionSales = closedSessions.reduce((sum, s) => sum + parseFloat(s.totalSales || "0"), 0);

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
          breadcrumbs={["POS", "Reports"]}
          notificationCount={0}
          userName={user.fullName || "Staff"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-hidden p-6">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">POS Reports</h1>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48" data-testid="select-date-range">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-sales">
                      PKR {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {paidOrders} paid orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-orders">{totalOrders}</div>
                    <p className="text-xs text-muted-foreground">
                      {pendingOrders} pending
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-order">
                      PKR {avgOrderValue.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per paid order
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-sessions">{closedSessions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Closed sessions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium capitalize">{method}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {filteredOrders.filter(o => o.paymentMethod === method && o.paymentStatus === "paid").length} orders
                          </span>
                          <span className="font-bold">PKR {amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(paymentBreakdown).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No payments in this period
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(statusBreakdown).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="text-sm px-4 py-2">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Popular Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {popularItems.map(([name, count], index) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{count} sold</span>
                      </div>
                    ))}
                    {popularItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No items sold in this period
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
