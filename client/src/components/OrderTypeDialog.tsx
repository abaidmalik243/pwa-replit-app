import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { Branch } from "@shared/schema";

interface OrderTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onSelect: (orderType: "delivery" | "pickup", branchId: string, area?: string) => void;
  currentSelection?: {
    orderType: "delivery" | "pickup";
    branchId: string;
    area?: string;
  };
}

export default function OrderTypeDialog({ isOpen, onClose, branches, onSelect, currentSelection }: OrderTypeDialogProps) {
  const [orderType, setOrderType] = useState<"delivery" | "pickup">(currentSelection?.orderType || "delivery");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>(currentSelection?.area || "");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [locationMessage, setLocationMessage] = useState<string>("");

  const cities = Array.from(new Set(branches.filter(b => b.isActive).map(b => b.city)));

//   const cities = [
//   {
//     "id": "35aa7683-e846-4f85-a135-14982b00f6d5",
//     "name": "Kebabish Pizza Sahiwal",
//     "city": "Sahiwal",
//     "address": "Civil Lines, Sahiwal",
//     "phone": "+92-300-2345678",
//     "is_active": true,
//     "delivery_areas": [
//       "Farid Town",
//       "Allama Iqbal Colony",
//       "Civil Lines",
//       "High Street",
//       "Jinnah Colony"
//     ],
//     "logo_url": null,
//     "primary_color": null,
//     "latitude": "30.6708000",
//     "longitude": "73.1116000"
//   },
//   {
//     "id": "dd54d237-0f8b-4b71-94c0-fa14be3159b7",
//     "name": "Kebabish Pizza Faisalabad",
//     "city": "Faisalabad",
//     "address": "Kohinoor City, Faisalabad",
//     "phone": "+92-300-3456789",
//     "is_active": true,
//     "delivery_areas": [
//       "D-Ground",
//       "Peoples Colony",
//       "Susan Road",
//       "Madina Town",
//       "Gulberg"
//     ],
//     "logo_url": null,
//     "primary_color": null,
//     "latitude": "31.4180000",
//     "longitude": "73.0790000"
//   },
//   {
//     "id": "e225ab39-ce72-4170-89b5-8dc5bff3f2c3",
//     "name": "Kebabish Pizza Okara",
//     "city": "Okara",
//     "address": "Ravi Road opp JS Bank, Okara",
//     "phone": "+92-306-4966646",
//     "is_active": true,
//     "delivery_areas": [
//       "City Center",
//       "Model Town",
//       "Satellite Town",
//       "Sadar Bazaar",
//       "Civil Lines",
//       "M.A Jinnah Road",
//       "Gallah Mandi"
//     ],
//     "logo_url": "",
//     "primary_color": "",
//     "latitude": "30.8081000",
//     "longitude": "73.4534000"
//   }
// ];

  const filteredBranches = selectedCity
    ? branches.filter(b => b.city === selectedCity && b.isActive)
    : [];

  const deliveryAreas = selectedBranch?.deliveryAreas || [];

  // Restore previous selection when dialog opens
  useEffect(() => {
    if (isOpen && currentSelection && branches.length > 0) {
      const branch = branches.find(b => b.id === currentSelection.branchId);
      if (branch) {
        setOrderType(currentSelection.orderType); // Set this first
        setSelectedCity(branch.city);
        setSelectedBranch(branch);
        setSelectedArea(currentSelection.area || "");
      }
    } else if (isOpen) {
      // Clear message when dialog opens fresh
      setLocationMessage("");
    }
  }, [isOpen, currentSelection, branches]);

  // Auto-select branch when city has only one branch
  useEffect(() => {
    if (selectedCity && filteredBranches.length > 0) {
      if (filteredBranches.length === 1) {
        setSelectedBranch(filteredBranches[0]);
      } else {
        // Check if current branch is in the filtered list
        const currentBranchInCity = selectedBranch && filteredBranches.some(b => b.id === selectedBranch.id);
        if (!currentBranchInCity) {
          setSelectedBranch(null);
        }
      }
    }
  }, [selectedCity, filteredBranches]);

  const handleSelect = () => {
    console.log("[OrderTypeDialog] handleSelect called", { selectedBranch, selectedCity, selectedArea, orderType });
    if (!selectedBranch) {
      console.warn("[OrderTypeDialog] No branch selected");
      return;
    }

    // Validate branch belongs to selected city
    if (selectedBranch.city !== selectedCity) {
      console.warn("[OrderTypeDialog] Branch city mismatch");
      return;
    }

    if (orderType === "delivery" && !selectedArea) {
      console.warn("[OrderTypeDialog] No area selected for delivery");
      return;
    }

    console.log("[OrderTypeDialog] Calling onSelect with:", orderType, selectedBranch.id, selectedArea);
    onSelect(orderType, selectedBranch.id, selectedArea);
    onClose();
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        // Find nearest branch
        let nearestBranch: Branch | null = null;
        let minDistance = Infinity;

        branches.forEach((branch: Branch) => {
          if (!branch.isActive || !branch.latitude || !branch.longitude) return;

          const branchLat = parseFloat(branch.latitude);
          const branchLon = parseFloat(branch.longitude);
          const distance = calculateDistance(userLat, userLon, branchLat, branchLon);

          if (distance < minDistance) {
            minDistance = distance;
            nearestBranch = branch;
          }
        });

        if (nearestBranch !== null) {
          const branch: Branch = nearestBranch;
          setSelectedCity(branch.city);
          setSelectedBranch(branch);
          setSelectedArea(""); // Clear area to force user confirmation
          setLocationMessage(`Found nearest branch: ${branch.name}`);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationMessage("Location access denied. Please select manually.");
        // Fallback to first city if location access denied
        if (cities.length > 0) {
          setSelectedCity(cities[0]);
        }
      }
    );
  };

  const canProceed = selectedBranch && 
                    selectedBranch.city === selectedCity && 
                    (orderType === "pickup" || (orderType === "delivery" && (deliveryAreas.length === 0 || selectedArea)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-order-type">
        <VisuallyHidden>
          <DialogTitle>Select Order Type and Location</DialogTitle>
          <DialogDescription>
            Choose delivery or pickup and select your preferred branch location.
          </DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl">🍕</span>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary" data-testid="text-dialog-logo">
                Kebabish Pizza
              </h2>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div>
              <h3 className="text-center font-semibold text-lg mb-3" data-testid="text-order-type-heading">
                Select your order type
              </h3>
              <div className="flex gap-3">
                <Button
                  variant={orderType === "delivery" ? "default" : "secondary"}
                  className="flex-1 h-12"
                  onClick={() => setOrderType("delivery")}
                  data-testid="button-delivery"
                  aria-pressed={orderType === "delivery"}
                >
                  DELIVERY
                </Button>
                <Button
                  variant={orderType === "pickup" ? "default" : "secondary"}
                  className="flex-1 h-12"
                  onClick={() => setOrderType("pickup")}
                  data-testid="button-pickup"
                  aria-pressed={orderType === "pickup"}
                >
                  PICK-UP
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-center font-semibold text-lg" data-testid="text-location-heading">
                Please select your location
              </h3>

              <div className="space-y-2 w-full">
                <Button
                  variant="secondary"
                  className="w-full h-12 gap-2"
                  onClick={handleUseCurrentLocation}
                  data-testid="button-use-location"
                >
                  <MapPin className="h-4 w-4" />
                  Use Current Location
                </Button>
                {locationMessage && (
                  <p className="text-sm text-center text-muted-foreground" data-testid="text-location-message">
                    {locationMessage}
                  </p>
                )}
              </div>

              <Select value={selectedCity} onValueChange={(value) => {
                setSelectedCity(value);
                setSelectedArea("");
                setSelectedBranch(null);
              }}>
                <SelectTrigger className="h-12" data-testid="select-city">
                  <SelectValue placeholder="Select City / Region" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city} data-testid={`city-${city.toLowerCase()}`}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filteredBranches.length > 1 && (
                <Select value={selectedBranch?.id || ""} onValueChange={(value) => {
                  const branch = filteredBranches.find(b => b.id === value);
                  setSelectedBranch(branch || null);
                  setSelectedArea("");
                }}>
                  <SelectTrigger className="h-12" data-testid="select-branch">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} data-testid={`branch-${branch.id}`}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {orderType === "delivery" && selectedBranch && deliveryAreas.length > 0 && (
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="h-12" data-testid="select-area">
                    <SelectValue placeholder="Select Area / Sub Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryAreas.map((area) => (
                      <SelectItem key={area} value={area} data-testid={`area-${area.toLowerCase().replace(/\s+/g, '-')}`}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleSelect}
              disabled={!canProceed}
              data-testid="button-select-location"
            >
              Select
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
