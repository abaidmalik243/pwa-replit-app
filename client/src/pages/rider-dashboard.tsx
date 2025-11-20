import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, Package, CheckCircle, Clock, Phone, User, Star, Bike, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Delivery = {
  id: string;
  orderId: string;
  riderId: string;
  status: string;
  estimatedTime: number | null;
  assignedAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryArea: string;
    total: string;
    paymentMethod: string;
    deliveryInstructions: string | null;
  };
};

type Rider = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  status: string;
  isAvailable: boolean;
  isActive: boolean;
  userId: string | null;
  currentLatitude: string | null;
  currentLongitude: string | null;
  lastLocationUpdate: string | null;
  totalDeliveries: number;
  rating: string;
};

export default function RiderDashboard() {
  const { toast } = useToast();
  const [riderId, setRiderId] = useState<string | null>(null);

  // Get user from localStorage (client-side auth)
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Get all riders and find the one linked to current user
  const { data: riders = [] } = useQuery<Rider[]>({
    queryKey: ["/api/riders"],
  });

  // Find rider by userId
  useEffect(() => {
    if (currentUser && riders.length > 0 && !riderId) {
      const myRider = riders.find((r) => r.userId === currentUser.id);
      if (myRider) {
        setRiderId(myRider.id);
      }
    }
  }, [currentUser, riders, riderId]);

  // Get current rider data
  const { data: rider, isLoading: riderLoading } = useQuery<Rider>({
    queryKey: ["/api/riders", riderId],
    enabled: !!riderId,
  });

  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery<Delivery[]>({
    queryKey: ["/api/deliveries"],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: !!riderId,
  });

  // Filter deliveries for this rider
  const myDeliveries = deliveries.filter((d) => d.riderId === riderId);
  const activeDeliveries = myDeliveries.filter((d) => 
    d.status !== "delivered" && d.status !== "cancelled"
  );
  const completedToday = myDeliveries.filter((d) => {
    if (d.status !== "delivered" || !d.deliveredAt) return false;
    const deliveredDate = new Date(d.deliveredAt);
    const today = new Date();
    return deliveredDate.toDateString() === today.toDateString();
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: { isAvailable: boolean; status: string }) => {
      if (!riderId) throw new Error("Rider not found");
      const res = await apiRequest(`/api/riders/${riderId}`, "PATCH", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders", riderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Status updated",
        description: "Your availability has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update delivery status mutation
  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/api/deliveries/${id}/status`, "PATCH", { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      toast({
        title: "Success",
        description: "Delivery status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Simulate GPS location update
  const updateLocationMutation = useMutation({
    mutationFn: async () => {
      if (!riderId) throw new Error("Rider not found");
      // In a real app, get actual GPS coordinates
      const mockLat = (Math.random() * 180 - 90).toFixed(7);
      const mockLng = (Math.random() * 360 - 180).toFixed(7);
      
      const res = await apiRequest(`/api/riders/${riderId}/location`, "PATCH", {
        latitude: mockLat,
        longitude: mockLng,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/riders", riderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
      toast({
        title: "Location updated",
        description: "Your GPS location has been shared",
      });
    },
  });

  const handleToggleAvailability = (checked: boolean) => {
    const newStatus = checked ? "online" : "offline";
    updateAvailabilityMutation.mutate({
      isAvailable: checked,
      status: newStatus,
    });
  };

  const handleUpdateStatus = (deliveryId: string, newStatus: string) => {
    updateDeliveryMutation.mutate({ id: deliveryId, status: newStatus });
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      assigned: { next: "accepted", label: "Accept Delivery", icon: CheckCircle },
      accepted: { next: "picked_up", label: "Mark Picked Up", icon: Package },
      picked_up: { next: "in_transit", label: "Start Delivery", icon: Navigation },
      in_transit: { next: "delivered", label: "Mark Delivered", icon: CheckCircle },
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  if (riderLoading || deliveriesLoading || !rider) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-rider-dashboard">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{rider.name}</h1>
              <p className="text-sm opacity-90">{rider.vehicleType} • {rider.vehicleNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{rider.rating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs">Active</span>
              </div>
              <div className="text-2xl font-bold">{activeDeliveries.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Today</span>
              </div>
              <div className="text-2xl font-bold">{completedToday.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Total</span>
              </div>
              <div className="text-2xl font-bold">{rider.totalDeliveries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Bike className="h-4 w-4" />
                <span className="text-xs">Status</span>
              </div>
              <Badge className="capitalize text-xs">{rider.status}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Availability Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="availability" className="text-base font-semibold">
                  Available for Deliveries
                </Label>
                <p className="text-xs text-muted-foreground">
                  Toggle to receive new delivery assignments
                </p>
              </div>
              <Switch
                id="availability"
                checked={rider.isAvailable}
                onCheckedChange={handleToggleAvailability}
                disabled={updateAvailabilityMutation.isPending}
                data-testid="switch-availability"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Update */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">GPS Location</span>
                </div>
                {rider.lastLocationUpdate && (
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(rider.lastLocationUpdate), { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateLocationMutation.mutate()}
                disabled={updateLocationMutation.isPending}
                data-testid="button-update-location"
              >
                {updateLocationMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Active Deliveries */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Active Deliveries ({activeDeliveries.length})
          </h2>

          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">No active deliveries</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rider.isAvailable ? "Waiting for assignments..." : "Enable availability to receive deliveries"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeDeliveries.map((delivery) => {
                const nextAction = getNextStatus(delivery.status);
                const NextIcon = nextAction?.icon;

                return (
                  <Card key={delivery.id} className="border-2" data-testid={`delivery-card-${delivery.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          #{delivery.order?.orderNumber || "N/A"}
                        </CardTitle>
                        <Badge className="capitalize" data-testid={`status-${delivery.id}`}>
                          {delivery.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{delivery.order?.customerName || "Unknown"}</p>
                            {delivery.order?.customerPhone && (
                              <a 
                                href={`tel:${delivery.order.customerPhone}`}
                                className="text-xs text-primary flex items-center gap-1 hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                {delivery.order.customerPhone}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm">{delivery.order?.customerAddress || "No address"}</p>
                            {delivery.order?.deliveryArea && (
                              <p className="text-xs text-muted-foreground">({delivery.order.deliveryArea})</p>
                            )}
                          </div>
                        </div>

                        {delivery.order?.deliveryInstructions && (
                          <div className="p-2 bg-muted rounded text-xs">
                            <span className="font-medium">Instructions:</span> {delivery.order.deliveryInstructions}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Order Details */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-bold text-lg">{formatCurrency(parseFloat(delivery.order?.total || "0"))}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Payment Method</span>
                        <Badge variant="outline" className="capitalize">
                          {delivery.order?.paymentMethod || "N/A"}
                        </Badge>
                      </div>

                      {delivery.estimatedTime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>ETA: {delivery.estimatedTime} minutes</span>
                        </div>
                      )}

                      {/* Action Button */}
                      {nextAction && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => handleUpdateStatus(delivery.id, nextAction.next)}
                          disabled={updateDeliveryMutation.isPending}
                          data-testid={`button-${nextAction.next}-${delivery.id}`}
                        >
                          {NextIcon && <NextIcon className="h-4 w-4" />}
                          {nextAction.label}
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        Assigned {formatDistanceToNow(new Date(delivery.assignedAt), { addSuffix: true })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Today */}
        {completedToday.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Today ({completedToday.length})
            </h2>
            <div className="space-y-2">
              {completedToday.map((delivery) => (
                <Card key={delivery.id} className="border-green-200 dark:border-green-900">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">#{delivery.order?.orderNumber || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{delivery.order?.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(parseFloat(delivery.order?.total || "0"))}</p>
                        <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                          Delivered
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
