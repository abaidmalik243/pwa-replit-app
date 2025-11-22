import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Bike, Clock, Activity } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useSocketEvent } from "@/context/SocketContext";
import { queryClient } from "@/lib/queryClient";

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
  currentLatitude: string | null;
  currentLongitude: string | null;
  lastLocationUpdate: string | null;
  branchId: string;
  totalDeliveries: number;
  rating: string;
};

type Delivery = {
  id: string;
  orderId: string;
  riderId: string;
  status: string;
  estimatedTime: number | null;
  assignedAt: string;
  order?: {
    orderNumber: string;
    customerName: string;
    customerAddress: string;
  };
};

type Branch = {
  id: string;
  name: string;
  address: string;
};

export default function AdminRiderTracking() {
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const { data: riders = [], isLoading: ridersLoading } = useQuery<Rider[]>({
    queryKey: ["/api/riders"],
  });

  const { data: deliveries = [] } = useQuery<Delivery[]>({
    queryKey: ["/api/deliveries"],
  });

  // Real-time rider location updates via WebSocket
  useSocketEvent<{ riderId: string; latitude: string; longitude: string }>("rider:locationUpdated", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
  });

  // Real-time delivery status updates via WebSocket
  useSocketEvent<any>("delivery:statusUpdated", () => {
    queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Filter riders by branch and active status
  const filteredRiders = riders.filter((rider) => {
    if (selectedBranch !== "all" && rider.branchId !== selectedBranch) {
      return false;
    }
    return rider.isActive;
  });

  // Get active deliveries for riders
  const activeRiders = filteredRiders.filter((rider) => 
    deliveries.some((d) => d.riderId === rider.id && d.status !== "delivered" && d.status !== "cancelled")
  );

  const availableRiders = filteredRiders.filter((rider) => 
    rider.status === "online" && rider.isAvailable
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-400";
      case "on_break": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  const getRiderDeliveries = (riderId: string) => {
    return deliveries.filter((d) => d.riderId === riderId && d.status !== "delivered" && d.status !== "cancelled");
  };

  // Simple coordinate normalization for display (mock map)
  const normalizeCoordinate = (lat: string | null, lng: string | null) => {
    if (!lat || !lng) return { x: 50, y: 50 }; // Center default
    
    // Simple normalization for visualization (you can replace with real map later)
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    // Normalize to 0-100 range for display
    const x = ((lngNum + 180) / 360) * 100;
    const y = ((90 - latNum) / 180) * 100;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  if (ridersLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading rider tracking data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-rider-tracking">
      <div>
        <h1 className="text-3xl font-bold">Live Rider Tracking</h1>
        <p className="text-muted-foreground">Monitor active riders and deliveries in real-time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Riders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRiders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Delivery</CardTitle>
            <Bike className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRiders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRiders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Branch:</label>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-64" data-testid="select-branch-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Rider Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden border" data-testid="map-container">
              {/* Simple Map Grid */}
              <svg className="absolute inset-0 w-full h-full opacity-10">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>

              {/* Rider Markers */}
              {filteredRiders.map((rider) => {
                const { x, y } = normalizeCoordinate(rider.currentLatitude, rider.currentLongitude);
                const hasDelivery = getRiderDeliveries(rider.id).length > 0;
                
                return (
                  <div
                    key={rider.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    data-testid={`marker-rider-${rider.id}`}
                  >
                    <div className="relative">
                      {/* Status Ring */}
                      <div className={`w-12 h-12 rounded-full ${getStatusColor(rider.status)} opacity-30 animate-ping absolute`} />
                      
                      {/* Rider Icon */}
                      <div className={`w-12 h-12 rounded-full ${getStatusColor(rider.status)} flex items-center justify-center shadow-lg border-2 border-white relative z-10`}>
                        <Bike className="h-6 w-6 text-white" />
                      </div>

                      {/* Active Delivery Indicator */}
                      {hasDelivery && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20" />
                      )}

                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border text-sm whitespace-nowrap">
                          <div className="font-semibold">{rider.name}</div>
                          <div className="text-xs text-muted-foreground">{rider.vehicleType} - {rider.vehicleNumber}</div>
                          <div className="text-xs capitalize">{rider.status}</div>
                          {rider.lastLocationUpdate && (
                            <div className="text-xs text-muted-foreground">
                              Updated {formatDistanceToNow(new Date(rider.lastLocationUpdate), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        <div className="w-2 h-2 bg-popover transform rotate-45 mx-auto -mt-1 border-r border-b" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* No Location Message */}
              {filteredRiders.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No active riders to display</p>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Busy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>On Break</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Offline</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rider List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRiders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bike className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No active riders</p>
                </div>
              ) : (
                filteredRiders.map((rider) => {
                  const riderDeliveries = getRiderDeliveries(rider.id);
                  
                  return (
                    <div
                      key={rider.id}
                      className="p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`rider-card-${rider.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rider.name}</span>
                            <Badge variant={rider.status === "online" ? "default" : "secondary"} className="text-xs">
                              {rider.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {rider.vehicleType} • {rider.vehicleNumber}
                          </div>
                          
                          {riderDeliveries.length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                <Navigation className="h-3 w-3" />
                                {riderDeliveries.length} active {riderDeliveries.length === 1 ? "delivery" : "deliveries"}
                              </div>
                            </div>
                          )}

                          {rider.lastLocationUpdate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(rider.lastLocationUpdate), { addSuffix: true })}
                            </div>
                          )}
                        </div>

                        <div className={`w-3 h-3 rounded-full ${getStatusColor(rider.status)} mt-1`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Deliveries Detail */}
      {activeRiders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRiders.map((rider) => {
                const riderDeliveries = getRiderDeliveries(rider.id);
                
                return riderDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`active-delivery-${delivery.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${getStatusColor(rider.status)} flex items-center justify-center`}>
                        <Bike className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{rider.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {delivery.order?.customerName || "Unknown Customer"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {delivery.order?.customerAddress || "No address"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge className="capitalize" data-testid={`delivery-status-${delivery.id}`}>
                        {delivery.status.replace("_", " ")}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(delivery.assignedAt), { addSuffix: true })}
                      </div>
                      {delivery.estimatedTime && (
                        <div className="text-xs text-muted-foreground">
                          ETA: {delivery.estimatedTime} min
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
