import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSocketEvent } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { Order as DBOrder } from "@shared/schema";

export default function AdminOrders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { logout } = useAuth();

  const { data: dbOrders = [], isLoading } = useQuery<DBOrder[]>({
    queryKey: ["/api/orders"],
  });

  useSocketEvent<DBOrder>("order:created", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  });

  useSocketEvent<DBOrder>("order:statusUpdated", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/api/orders/${id}`, "PUT", { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Success", description: "Order status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AdminSidebar onLogout={logout} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Orders"]}
          notificationCount={dbOrders.filter((o) => o.status === "pending").length}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">All Orders</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              View and manage all orders
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading orders...
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Orders List</CardTitle>
              </CardHeader>
              <CardContent>
                {dbOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="px-4 py-2 font-semibold">Order #</th>
                          <th className="px-4 py-2 font-semibold">Customer</th>
                          <th className="px-4 py-2 font-semibold">Phone</th>
                          <th className="px-4 py-2 font-semibold">Total</th>
                          <th className="px-4 py-2 font-semibold">Status</th>
                          <th className="px-4 py-2 font-semibold">Date</th>
                          <th className="px-4 py-2 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`row-order-${order.id}`}
                          >
                            <td className="px-4 py-3 font-semibold" data-testid={`text-order-number-${order.id}`}>
                              #{order.orderNumber}
                            </td>
                            <td className="px-4 py-3" data-testid={`text-customer-name-${order.id}`}>
                              {order.customerName}
                            </td>
                            <td className="px-4 py-3" data-testid={`text-customer-phone-${order.id}`}>
                              {order.customerPhone}
                            </td>
                            <td className="px-4 py-3 font-semibold" data-testid={`text-total-${order.id}`}>
                              ₨{parseFloat(order.total).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={getStatusColor(order.status)}
                                data-testid={`badge-status-${order.id}`}
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground" data-testid={`text-date-${order.id}`}>
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {order.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        updateOrderMutation.mutate({
                                          id: order.id,
                                          status: "preparing",
                                        })
                                      }
                                      disabled={updateOrderMutation.isPending}
                                      data-testid={`button-accept-${order.id}`}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        updateOrderMutation.mutate({
                                          id: order.id,
                                          status: "cancelled",
                                        })
                                      }
                                      disabled={updateOrderMutation.isPending}
                                      data-testid={`button-reject-${order.id}`}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {order.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateOrderMutation.mutate({
                                        id: order.id,
                                        status: "ready",
                                      })
                                    }
                                    disabled={updateOrderMutation.isPending}
                                    data-testid={`button-ready-${order.id}`}
                                  >
                                    Mark Ready
                                  </Button>
                                )}
                                {order.status === "ready" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateOrderMutation.mutate({
                                        id: order.id,
                                        status: "completed",
                                      })
                                    }
                                    disabled={updateOrderMutation.isPending}
                                    data-testid={`button-complete-${order.id}`}
                                  >
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
