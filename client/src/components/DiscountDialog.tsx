import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Percent, DollarSign } from "lucide-react";

interface DiscountDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  branchId: string;
  onDiscountApplied?: () => void;
}

export function DiscountDialog({
  open,
  onClose,
  orderId,
  orderNumber,
  subtotal,
  branchId,
  onDiscountApplied,
}: DiscountDialogProps) {
  const { toast } = useToast();
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  const calculateDiscount = () => {
    const value = parseFloat(discountValue) || 0;
    if (discountType === "percentage") {
      return Math.min((subtotal * value) / 100, subtotal);
    }
    return Math.min(value, subtotal);
  };

  const calculatedDiscount = calculateDiscount();
  const newTotal = Math.max(0, subtotal - calculatedDiscount);

  const applyDiscountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount: calculatedDiscount,
          discountReason: discountReason || `${discountType === "percentage" ? discountValue + "%" : "PKR " + discountValue} discount`,
        }),
      });

      if (!response.ok) throw new Error("Failed to apply discount");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Discount applied",
        description: `Discount of PKR ${calculatedDiscount.toFixed(2)} applied to order ${orderNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", branchId] });
      onDiscountApplied?.();
      onClose();
      // Reset form
      setDiscountValue("");
      setDiscountReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to apply discount",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApplyDiscount = () => {
    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast({
        title: "Invalid discount",
        description: "Please enter a valid discount amount",
        variant: "destructive",
      });
      return;
    }

    if (calculatedDiscount > subtotal) {
      toast({
        title: "Invalid discount",
        description: "Discount cannot exceed order subtotal",
        variant: "destructive",
      });
      return;
    }

    applyDiscountMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-discount">
        <DialogHeader>
          <DialogTitle className="text-2xl">Apply Discount</DialogTitle>
          <DialogDescription>
            Apply a percentage or fixed amount discount to order {orderNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="p-4 bg-muted rounded-md">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Order Number</span>
              <span className="text-sm font-semibold" data-testid="text-order-number">{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold">PKR {subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Discount Type */}
          <div className="space-y-3">
            <Label>Discount Type</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value: "percentage" | "fixed") => {
                setDiscountType(value);
                setDiscountValue("");
              }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="percentage" id="percentage" className="sr-only" />
                <Label
                  htmlFor="percentage"
                  className={`flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer hover-elevate ${
                    discountType === "percentage" ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid="label-discount-percentage"
                >
                  <Percent className="w-5 h-5" />
                  Percentage
                </Label>
              </div>
              <div>
                <RadioGroupItem value="fixed" id="fixed" className="sr-only" />
                <Label
                  htmlFor="fixed"
                  className={`flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer hover-elevate ${
                    discountType === "fixed" ? "border-primary bg-primary/5" : ""
                  }`}
                  data-testid="label-discount-fixed"
                >
                  <DollarSign className="w-5 h-5" />
                  Fixed Amount
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (PKR)"}
            </Label>
            <Input
              id="discount-value"
              type="number"
              step={discountType === "percentage" ? "1" : "0.01"}
              min="0"
              max={discountType === "percentage" ? "100" : subtotal.toString()}
              placeholder={discountType === "percentage" ? "10" : "100.00"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              data-testid="input-discount-value"
            />
          </div>

          {/* Discount Reason */}
          <div className="space-y-2">
            <Label htmlFor="discount-reason">Reason (Optional)</Label>
            <Textarea
              id="discount-reason"
              placeholder="e.g., Loyalty discount, Manager approval, etc."
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              rows={2}
              data-testid="input-discount-reason"
            />
          </div>

          {/* Preview */}
          {discountValue && parseFloat(discountValue) > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>PKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount</span>
                <span data-testid="text-discount-amount">- PKR {calculatedDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>New Total</span>
                <span data-testid="text-new-total">PKR {newTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={applyDiscountMutation.isPending}
              data-testid="button-cancel-discount"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleApplyDiscount}
              disabled={!discountValue || parseFloat(discountValue) <= 0 || applyDiscountMutation.isPending}
              data-testid="button-apply-discount"
            >
              {applyDiscountMutation.isPending ? "Applying..." : "Apply Discount"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
