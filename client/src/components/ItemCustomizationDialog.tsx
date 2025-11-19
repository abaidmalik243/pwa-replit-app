import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "./MenuItemCard";

export interface VariantOption {
  id: string;
  name: string;
  price?: number;
}

export interface VariantGroup {
  id: string;
  name: string;
  required: boolean;
  options: VariantOption[];
}

export interface CustomizationSelection {
  variantSelections: Record<string, string>;
  instructions: string;
  quantity: number;
}

interface ItemCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  variantGroups?: VariantGroup[];
  onAddToCart: (item: MenuItem, customization: CustomizationSelection) => void;
}

export default function ItemCustomizationDialog({ 
  isOpen, 
  onClose, 
  item,
  variantGroups = [],
  onAddToCart 
}: ItemCustomizationDialogProps) {
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  const handleVariantChange = (groupId: string, optionId: string) => {
    setVariantSelections(prev => ({
      ...prev,
      [groupId]: optionId
    }));
  };

  const calculateTotalPrice = () => {
    let total = item.price;
    variantGroups.forEach(group => {
      const selectedOptionId = variantSelections[group.id];
      if (selectedOptionId) {
        const option = group.options.find(o => o.id === selectedOptionId);
        if (option?.price) {
          total += option.price;
        }
      }
    });
    return total * quantity;
  };

  const handleAddToCart = () => {
    const requiredGroups = variantGroups.filter(g => g.required);
    const allRequiredSelected = requiredGroups.every(g => variantSelections[g.id]);
    
    if (!allRequiredSelected) {
      return;
    }

    onAddToCart(item, {
      variantSelections,
      instructions,
      quantity
    });

    setVariantSelections({});
    setInstructions("");
    setQuantity(1);
    onClose();
  };

  const requiredGroups = variantGroups.filter(g => g.required);
  const allRequiredSelected = requiredGroups.every(g => variantSelections[g.id]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 gap-0">
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          <div className="md:w-1/2 relative bg-black flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={onClose}
              data-testid="button-close-dialog"
            >
              <X className="h-5 w-5" />
            </Button>
            <img 
              src={item.image} 
              alt={item.name}
              className="w-full h-full object-cover md:object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <h2 className="text-2xl font-bold mb-2" data-testid="text-dialog-item-name">
                {item.name}
              </h2>
              <p className="text-sm text-gray-200" data-testid="text-dialog-item-description">
                {item.description}
              </p>
            </div>
          </div>

          <div className="md:w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {variantGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">{group.name}</Label>
                    {group.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <RadioGroup
                    value={variantSelections[group.id] || ""}
                    onValueChange={(value) => handleVariantChange(group.id, value)}
                  >
                    {group.options.map((option) => (
                      <div 
                        key={option.id}
                        className="flex items-center space-x-2 p-3 rounded-md hover-elevate border"
                      >
                        <RadioGroupItem 
                          value={option.id} 
                          id={`${group.id}-${option.id}`}
                          data-testid={`radio-${group.id}-${option.id}`}
                        />
                        <Label 
                          htmlFor={`${group.id}-${option.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option.name}
                          {option.price && option.price > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              +{formatCurrency(option.price)}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}

              <div className="space-y-3">
                <Label htmlFor="instructions" className="text-base font-semibold">
                  Instructions
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="e.g. No onions, extra spicy, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="resize-none min-h-[100px]"
                  data-testid="textarea-instructions"
                />
              </div>
            </div>

            <div className="border-t p-6 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white border-0"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="button-decrease-quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center" data-testid="text-quantity">
                    {quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white border-0"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="button-increase-quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-base"
                onClick={handleAddToCart}
                disabled={!allRequiredSelected}
                data-testid="button-add-to-cart-dialog"
              >
                <span className="flex-1 text-left">{formatCurrency(calculateTotalPrice())}</span>
                <span>Add To Cart</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
