import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, CheckCircle, ChefHat, AlertCircle, Filter, Bell, BellOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSocketEvent } from "@/context/SocketContext";
import type { Order } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function KitchenDisplay() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("kds-sound-enabled");
    return stored ? JSON.parse(stored) : true;
  });
  const [lastOrderCount, setLastOrderCount] = useState(0);

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

  // Fetch orders for kitchen display (WebSocket real-time updates)
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", userBranchId],
    queryFn: () => {
      const url = userBranchId === "all" 
        ? "/api/orders" 
        : `/api/orders?branchId=${userBranchId}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!userBranchId,
  });

  // Real-time order updates via WebSocket
  useSocketEvent<Order>("order:created", (order) => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders", userBranchId] });
  });

  useSocketEvent<Order>("order:statusUpdated", (order) => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders", userBranchId] });
  });

  // Filter orders for kitchen (exclude delivered/cancelled)
  const kitchenOrders = orders.filter(order => 
    ["pending", "preparing", "ready"].includes(order.status) &&
    order.orderSource === "pos"
  );

  // Play sound for new orders
  useEffect(() => {
    if (kitchenOrders.length > lastOrderCount && lastOrderCount > 0 && soundEnabled) {
      playNotificationSound();
    }
    setLastOrderCount(kitchenOrders.length);
  }, [kitchenOrders.length, soundEnabled]);

  // Sound notification
  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("kds-sound-enabled", JSON.stringify(newValue));
    toast({
      title: newValue ? "Sound enabled" : "Sound disabled",
      description: newValue ? "You'll hear alerts for new orders" : "Sound notifications are off",
    });
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      // Use simplified status update endpoint
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", userBranchId] });
      toast({
        title: "Status updated",
        description: "Order status has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "preparing":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "ready":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      default:
        return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      case "preparing":
        return <ChefHat className="w-4 h-4" />;
      case "ready":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (createdAt: Date) => {
    const minutesOld = (Date.now() - new Date(createdAt).getTime()) / 1000 / 60;
    if (minutesOld > 20) return "border-l-4 border-l-red-500";
    if (minutesOld > 10) return "border-l-4 border-l-yellow-500";
    return "";
  };

  const parseItems = (itemsJson: string) => {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
  };

  const filteredOrders = statusFilter === "all" 
    ? kitchenOrders 
    : kitchenOrders.filter(order => order.status === statusFilter);

  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (!userBranchId || (userBranchId !== "all" && !userBranchId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No branch assigned to user</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact an administrator</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="heading-kds">Kitchen Display</h1>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>

            {/* Sound toggle */}
            <Button
              size="icon"
              variant="outline"
              onClick={toggleSound}
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>

            {/* Stats */}
            <div className="flex gap-4 px-4 border-l">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">
                  {kitchenOrders.filter(o => o.status === "pending").length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600" data-testid="stat-preparing">
                  {kitchenOrders.filter(o => o.status === "preparing").length}
                </p>
                <p className="text-xs text-muted-foreground">Preparing</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600" data-testid="stat-ready">
                  {kitchenOrders.filter(o => o.status === "ready").length}
                </p>
                <p className="text-xs text-muted-foreground">Ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {sortedOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">No orders in kitchen</p>
              <p className="text-muted-foreground">New orders will appear here automatically</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedOrders.map((order) => {
                const items = parseItems(order.items);
                const minutesOld = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000 / 60);
                
                return (
                  <Card
                    key={order.id}
                    className={`${getPriorityColor(order.createdAt)} hover-elevate`}
                    data-testid={`card-order-${order.id}`}
                  >
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-lg" data-testid={`text-order-number-${order.id}`}>
                            {order.orderNumber}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1">{order.status}</span>
                            </Badge>
                            {order.orderType === "dine-in" && order.tableId && (
                              <Badge variant="secondary">Table</Badge>
                            )}
                            {order.orderType === "takeaway" && (
                              <Badge variant="secondary">Takeaway</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            <span className={minutesOld > 15 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                              {minutesOld}m
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="text-sm">
                        <p className="font-semibold">{order.customerName}</p>
                        {order.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Note: {order.notes}</p>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start justify-between text-sm border-l-2 border-primary pl-2">
                            <div className="flex-1">
                              <p className="font-medium">
                                <span className="font-bold">{item.quantity}x</span> {item.name}
                              </p>
                              {item.variants && item.variants.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {item.variants.map((v: any) => `${v.groupName}: ${v.optionName}`).join(", ")}
                                </p>
                              )}
                              {item.specialInstructions && (
                                <p className="text-xs text-orange-600 font-medium mt-1">
                                  ⚠ {item.specialInstructions}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 space-y-2">
                        {order.status === "pending" && (
                          <Button
                            className="w-full"
                            onClick={() => handleStatusUpdate(order.id, "preparing")}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-start-${order.id}`}
                          >
                            <ChefHat className="w-4 h-4 mr-2" />
                            Start Preparing
                          </Button>
                        )}
                        {order.status === "preparing" && (
                          <Button
                            className="w-full"
                            variant="default"
                            onClick={() => handleStatusUpdate(order.id, "ready")}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-ready-${order.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Ready
                          </Button>
                        )}
                        {order.status === "ready" && (
                          <div className="text-center p-3 bg-green-500/10 rounded-lg">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              Ready for Pickup
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
