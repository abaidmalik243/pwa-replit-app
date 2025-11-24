import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";
import type { Branch, DeliveryChargesConfig } from "@shared/schema";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { useAuth } from "@/context/AuthContext";

export default function AdminDeliveryCharges() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { logout } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Fetch branches
  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch delivery charges configs
  const { data: configs, isLoading: configsLoading } = useQuery<DeliveryChargesConfig[]>({
    queryKey: ["/api/delivery-charges"],
  });

  // Find config for selected branch
  const selectedConfig = configs?.find(c => c.branchId === selectedBranchId);

  // Form state
  const [chargeType, setChargeType] = useState<string>(selectedConfig?.chargeType || "static");
  const [staticCharge, setStaticCharge] = useState<string>(selectedConfig?.staticCharge || "50");
  const [baseCharge, setBaseCharge] = useState<string>(selectedConfig?.baseCharge || "50");
  const [perKmCharge, setPerKmCharge] = useState<string>(selectedConfig?.perKmCharge || "20");
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<string>(selectedConfig?.freeDeliveryThreshold || "1500");
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState<string>(selectedConfig?.maxDeliveryDistance || "15");
  const [isActive, setIsActive] = useState<boolean>(selectedConfig?.isActive ?? true);

  // Update form when branch or config changes
  useEffect(() => {
    if (selectedConfig) {
      setChargeType(selectedConfig.chargeType);
      setStaticCharge(selectedConfig.staticCharge || "50");
      setBaseCharge(selectedConfig.baseCharge || "50");
      setPerKmCharge(selectedConfig.perKmCharge || "20");
      setFreeDeliveryThreshold(selectedConfig.freeDeliveryThreshold || "1500");
      setMaxDeliveryDistance(selectedConfig.maxDeliveryDistance || "15");
      setIsActive(selectedConfig.isActive);
    } else {
      // Reset to defaults if no config exists
      setChargeType("static");
      setStaticCharge("50");
      setBaseCharge("50");
      setPerKmCharge("20");
      setFreeDeliveryThreshold("1500");
      setMaxDeliveryDistance("15");
      setIsActive(true);
    }
  }, [selectedBranchId, selectedConfig]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/delivery-charges/${selectedBranchId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-charges"] });
      toast({
        title: "Success",
        description: "Delivery charges configuration saved successfully",
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

  const handleSave = () => {
    if (!selectedBranchId) {
      toast({
        title: "Error",
        description: "Please select a branch",
        variant: "destructive",
      });
      return;
    }

    const data = {
      chargeType,
      staticCharge,
      baseCharge,
      perKmCharge,
      freeDeliveryThreshold,
      maxDeliveryDistance,
      isActive,
    };

    saveConfigMutation.mutate(data);
  };

  if (branchesLoading || configsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Delivery Charges"]}
          notificationCount={0}
          userName="Admin User"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Delivery Charges Configuration</h1>
                <p className="text-muted-foreground">Manage delivery charges for each branch</p>
              </div>
      </div>

      <div className="grid gap-6">
        {/* Branch Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Branch</CardTitle>
            <CardDescription>Choose a branch to configure delivery charges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="branch" data-testid="select-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} - {branch.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        {selectedBranchId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Delivery Charges Settings
              </CardTitle>
              <CardDescription>
                Configure how delivery charges are calculated for this branch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Charge Type */}
              <div>
                <Label htmlFor="chargeType">Pricing Model</Label>
                <Select value={chargeType} onValueChange={setChargeType}>
                  <SelectTrigger id="chargeType" data-testid="select-charge-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">Static (Fixed Fee)</SelectItem>
                    <SelectItem value="dynamic">Dynamic (Distance-Based)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {chargeType === "static" 
                    ? "Fixed delivery fee for all orders" 
                    : "Delivery fee calculated based on distance"}
                </p>
              </div>

              {/* Static Charge (shown only for static pricing) */}
              {chargeType === "static" && (
                <div>
                  <Label htmlFor="staticCharge">Fixed Delivery Charge (₨)</Label>
                  <Input
                    id="staticCharge"
                    type="number"
                    value={staticCharge}
                    onChange={(e) => setStaticCharge(e.target.value)}
                    placeholder="50"
                    data-testid="input-static-charge"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Flat delivery fee for all orders (unless free delivery threshold is met)
                  </p>
                </div>
              )}

              {/* Dynamic Charges (shown only for dynamic pricing) */}
              {chargeType === "dynamic" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseCharge">Base Charge (₨)</Label>
                      <Input
                        id="baseCharge"
                        type="number"
                        value={baseCharge}
                        onChange={(e) => setBaseCharge(e.target.value)}
                        placeholder="50"
                        data-testid="input-base-charge"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Minimum delivery charge
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="perKmCharge">Per KM Charge (₨)</Label>
                      <Input
                        id="perKmCharge"
                        type="number"
                        value={perKmCharge}
                        onChange={(e) => setPerKmCharge(e.target.value)}
                        placeholder="20"
                        data-testid="input-per-km-charge"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Additional charge per kilometer
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="maxDistance">Maximum Delivery Distance (KM)</Label>
                    <Input
                      id="maxDistance"
                      type="number"
                      value={maxDeliveryDistance}
                      onChange={(e) => setMaxDeliveryDistance(e.target.value)}
                      placeholder="15"
                      data-testid="input-max-distance"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Orders beyond this distance will not be accepted
                    </p>
                  </div>
                </>
              )}

              {/* Free Delivery Threshold (common for both) */}
              <div>
                <Label htmlFor="freeThreshold">Free Delivery Above (₨)</Label>
                <Input
                  id="freeThreshold"
                  type="number"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                  placeholder="1500"
                  data-testid="input-free-threshold"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Orders above this amount qualify for free delivery
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saveConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {saveConfigMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {selectedBranchId && (
          <Card>
            <CardHeader>
              <CardTitle>Current Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pricing Model:</span>
                  <span className="font-medium capitalize">{chargeType}</span>
                </div>
                {chargeType === "static" ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fixed Charge:</span>
                    <span className="font-medium">₨{staticCharge}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Charge:</span>
                      <span className="font-medium">₨{baseCharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per KM Charge:</span>
                      <span className="font-medium">₨{perKmCharge}/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Distance:</span>
                      <span className="font-medium">{maxDeliveryDistance} KM</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Delivery Above:</span>
                  <span className="font-medium">₨{freeDeliveryThreshold}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {chargeType === "static" 
                      ? `Example: All delivery orders will be charged ₨${staticCharge} (unless order is ≥ ₨${freeDeliveryThreshold})`
                      : `Example: For a 5 KM delivery = ₨${baseCharge} + (5 × ₨${perKmCharge}) = ₨${parseFloat(baseCharge) + (5 * parseFloat(perKmCharge))}`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}
