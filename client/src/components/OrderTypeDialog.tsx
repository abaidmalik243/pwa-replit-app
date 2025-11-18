import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  const cities = Array.from(new Set(branches.filter(b => b.isActive).map(b => b.city)));

  const filteredBranches = selectedCity
    ? branches.filter(b => b.city === selectedCity && b.isActive)
    : [];

  const deliveryAreas = selectedBranch?.deliveryAreas || [];

  // Restore previous selection when dialog opens
  useEffect(() => {
    if (isOpen && currentSelection && branches.length > 0) {
      const branch = branches.find(b => b.id === currentSelection.branchId);
      if (branch) {
        setSelectedCity(branch.city);
        setSelectedBranch(branch);
        setSelectedArea(currentSelection.area || "");
        setOrderType(currentSelection.orderType);
      }
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
    if (!selectedBranch) return;

    // Validate branch belongs to selected city
    if (selectedBranch.city !== selectedCity) return;

    if (orderType === "delivery" && !selectedArea) {
      return;
    }

    onSelect(orderType, selectedBranch.id, selectedArea);
    onClose();
  };

  const handleUseCurrentLocation = () => {
    // Quick selection: Auto-select first available city
    // Note: Full geolocation requires branch coordinates in database
    if (cities.length > 0) {
      setSelectedCity(cities[0]);
    }
  };

  const canProceed = selectedBranch && 
                    selectedBranch.city === selectedCity && 
                    (orderType === "pickup" || (orderType === "delivery" && selectedArea));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-order-type">
        <VisuallyHidden>
          <DialogTitle>Select Order Type and Location</DialogTitle>
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
                >
                  DELIVERY
                </Button>
                <Button
                  variant={orderType === "pickup" ? "default" : "secondary"}
                  className="flex-1 h-12"
                  onClick={() => setOrderType("pickup")}
                  data-testid="button-pickup"
                >
                  PICK-UP
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-center font-semibold text-lg" data-testid="text-location-heading">
                Please select your location
              </h3>

              <Button
                variant="secondary"
                className="w-full h-12 gap-2"
                onClick={handleUseCurrentLocation}
                data-testid="button-use-location"
              >
                <MapPin className="h-4 w-4" />
                Use Current Location
              </Button>

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
