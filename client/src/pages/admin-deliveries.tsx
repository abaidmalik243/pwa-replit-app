import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, MapPin, Phone, Clock, Package, User, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryArea: string;
  total: string;
  status: string;
  createdAt: string;
  branchId: string;
};

type Rider = {
  id: string;
  name: string;
  phone: string;
  status: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  totalDeliveries: number;
};

type Delivery = {
  id: string;
  orderId: string;
  riderId: string;
  status: string;
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  estimatedDeliveryTime?: string;
  riderName?: string;
  riderPhone?: string;
  riderVehicle?: string;
  orderNumber?: string;
  customerName?: string;
  customerAddress?: string;
  orderTotal?: string;
};

export default function AdminDeliveries() {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("30");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch delivery orders (orders with orderType = 'delivery')
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    select: (data) => data.filter((order: any) => order.orderType === "delivery"),
  });

  // Fetch riders
  const { data: riders = [], isLoading: ridersLoading } = useQuery<Rider[]>({
    queryKey: ["/api/riders"],
  });

  // Fetch deliveries
  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery<Delivery[]>({
    queryKey: ["/api/deliveries"],
  });

  // Create delivery assignment
  const assignRiderMutation = useMutation({
    mutationFn: async (data: { orderId: string; riderId: string; estimatedTime: string }) => {
      const res = await apiRequest("/api/deliveries/assign", "POST", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Rider assigned successfully",
      });
      setAssignDialogOpen(false);
      setSelectedOrder(null);
      setSelectedRiderId("");
      setEstimatedTime("30");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign rider",
        variant: "destructive",
      });
    },
  });

  // Update delivery status
  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/api/deliveries/${id}/status`, "PATCH", { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Success",
        description: "Delivery status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery status",
        variant: "destructive",
      });
    },
  });

  // Get assigned order IDs
  const assignedOrderIds = new Set(deliveries.map(d => d.orderId));

  // Filter unassigned delivery orders
  const unassignedOrders = orders.filter(order => !assignedOrderIds.has(order.id));

  // Available riders (online and not busy)
  const availableRiders = riders.filter(r => r.isAvailable && r.status === "online");

  // Filter deliveries by status
  const filteredDeliveries = filterStatus === "all"
    ? deliveries
    : deliveries.filter(d => d.status === filterStatus);

  const handleAssignRider = (order: Order) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
  };

  const handleSubmitAssignment = () => {
    if (!selectedOrder || !selectedRiderId) {
      toast({
        title: "Error",
        description: "Please select a rider",
        variant: "destructive",
      });
      return;
    }

    assignRiderMutation.mutate({
      orderId: selectedOrder.id,
      riderId: selectedRiderId,
      estimatedTime: parseInt(estimatedTime) || 30,
    });
  };

  const handleUpdateStatus = (deliveryId: string, newStatus: string) => {
    updateDeliveryMutation.mutate({ id: deliveryId, status: newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      assigned: "secondary",
      accepted: "default",
      picked_up: "default",
      in_transit: "default",
      delivered: "outline",
      cancelled: "destructive",
    };
    return variants[status] || "default";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: "bg-yellow-500",
      accepted: "bg-blue-500",
      picked_up: "bg-indigo-500",
      in_transit: "bg-purple-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const isLoading = ordersLoading || ridersLoading || deliveriesLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading deliveries...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-deliveries">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Delivery Management</h1>
        <p className="text-muted-foreground">Assign riders and track deliveries</p>
      </div>

      <div className="space-y-6">
        {/* Unassigned Orders */}
        {unassignedOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Unassigned Orders
                <Badge variant="destructive">{unassignedOrders.length}</Badge>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedOrders.map((order) => (
                <Card key={order.id} data-testid={`card-unassigned-order-${order.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>#{order.orderNumber}</span>
                      <Badge variant="outline">{order.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-muted-foreground">{order.customerPhone}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="text-muted-foreground">
                          {order.customerAddress}
                          {order.deliveryArea && <div className="text-xs">({order.deliveryArea})</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(order.createdAt), "p")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">{formatCurrency(parseFloat(order.total))}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAssignRider(order)}
                        disabled={availableRiders.length === 0}
                        data-testid={`button-assign-rider-${order.id}`}
                      >
                        <Bike className="h-4 w-4 mr-1" />
                        Assign Rider
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bike className="h-5 w-5" />
              Active Deliveries
              <Badge>{deliveries.length}</Badge>
            </h2>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40" data-testid="select-filter-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="empty-deliveries">
                  {filterStatus === "all" ? "No active deliveries" : `No ${filterStatus} deliveries`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredDeliveries.map((delivery) => {
                const order = orders.find(o => o.id === delivery.orderId);
                const rider = riders.find(r => r.id === delivery.riderId);

                return (
                  <Card key={delivery.id} data-testid={`card-delivery-${delivery.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">#{delivery.orderNumber || order?.orderNumber}</CardTitle>
                        <Badge variant={getStatusBadgeVariant(delivery.status)}>
                          {delivery.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Order Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{delivery.customerName || order?.customerName}</div>
                            <div className="text-muted-foreground">{order?.customerPhone}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="text-muted-foreground text-xs">
                            {delivery.customerAddress || order?.customerAddress}
                          </div>
                        </div>
                      </div>

                      {/* Rider Info */}
                      <div className="border-t pt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{delivery.riderName || rider?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {delivery.riderPhone || rider?.phone}
                            </div>
                          </div>
                        </div>
                        {rider && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            {rider.vehicleType} - {rider.vehicleNumber}
                          </div>
                        )}
                      </div>

                      {/* Delivery Timeline */}
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Timeline</span>
                        </div>
                        <div className="space-y-2">
                          {["assigned", "accepted", "picked_up", "in_transit", "delivered"].map((status, index) => {
                            const isComplete = ["assigned", "accepted", "picked_up", "in_transit", "delivered"]
                              .indexOf(delivery.status) >= index;
                            return (
                              <div key={status} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${isComplete ? getStatusColor(status) : "bg-gray-300"}`} />
                                <span className={isComplete ? "text-foreground" : "text-muted-foreground"}>
                                  {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="border-t pt-3 flex gap-2">
                        {delivery.status === "assigned" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(delivery.id, "accepted")}
                            data-testid={`button-accept-${delivery.id}`}
                          >
                            Mark Accepted
                          </Button>
                        )}
                        {delivery.status === "accepted" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(delivery.id, "picked_up")}
                            data-testid={`button-pickup-${delivery.id}`}
                          >
                            Mark Picked Up
                          </Button>
                        )}
                        {delivery.status === "picked_up" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(delivery.id, "in_transit")}
                            data-testid={`button-intransit-${delivery.id}`}
                          >
                            In Transit
                          </Button>
                        )}
                        {delivery.status === "in_transit" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(delivery.id, "delivered")}
                            data-testid={`button-deliver-${delivery.id}`}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assign Rider Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="dialog-assign-rider">
          <DialogHeader>
            <DialogTitle>Assign Rider to Delivery</DialogTitle>
            <DialogDescription>
              Select an available rider for order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableRiders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bike className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No riders available</p>
                <p className="text-sm">All riders are currently busy or offline</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rider-select">Select Rider</Label>
                  <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
                    <SelectTrigger id="rider-select" data-testid="select-rider">
                      <SelectValue placeholder="Choose a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRiders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          <div className="flex items-center gap-2">
                            <span>{rider.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({rider.vehicleType} - {rider.totalDeliveries} deliveries)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated-time">Estimated Delivery Time (minutes)</Label>
                  <Input
                    id="estimated-time"
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    min="10"
                    max="120"
                    data-testid="input-estimated-time"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAssignDialogOpen(false)}
                    data-testid="button-cancel-assign"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitAssignment}
                    disabled={!selectedRiderId || assignRiderMutation.isPending}
                    data-testid="button-submit-assign"
                  >
                    {assignRiderMutation.isPending ? "Assigning..." : "Assign Rider"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
