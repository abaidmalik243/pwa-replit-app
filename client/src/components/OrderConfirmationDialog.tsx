import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, MapPin, Phone, CreditCard, User, MessageSquare } from "lucide-react";
import type { CartItem } from "./CartDrawer";

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  orderType: "delivery" | "pickup";
  branchName?: string;
  selectedArea?: string;
  onConfirmOrder: (orderDetails: OrderDetails) => void;
  isSubmitting?: boolean;
}

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  alternativePhone?: string;
  customerAddress?: string;
  paymentMethod: "cash" | "jazzcash";
  notes?: string;
}

export default function OrderConfirmationDialog({
  open,
  onOpenChange,
  cartItems,
  orderType,
  branchName,
  selectedArea,
  onConfirmOrder,
  isSubmitting = false,
}: OrderConfirmationDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [alternativePhone, setAlternativePhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "jazzcash">("cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;

  const validatePhone = (phone: string): boolean => {
    // Pakistani phone number format: 03XX XXXXXXX or 03XXXXXXXXX
    const phoneRegex = /^03\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleConfirm = () => {
    const newErrors: Record<string, string> = {};

    // Validate customer name
    if (!customerName.trim()) {
      newErrors.customerName = "Name is required";
    }

    // Validate phone number
    if (!customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required";
    } else if (!validatePhone(customerPhone)) {
      newErrors.customerPhone = "Invalid phone format. Use: 03XX XXXXXXX";
    }

    // Validate alternative phone if provided
    if (alternativePhone.trim() && !validatePhone(alternativePhone)) {
      newErrors.alternativePhone = "Invalid phone format. Use: 03XX XXXXXXX";
    }

    // Validate address for delivery
    if (orderType === "delivery" && !customerAddress.trim()) {
      newErrors.customerAddress = "Delivery address is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onConfirmOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim().replace(/\s/g, ''),
      alternativePhone: alternativePhone.trim() ? alternativePhone.trim().replace(/\s/g, '') : undefined,
      customerAddress: orderType === "delivery" ? customerAddress.trim() : undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  const isValid = customerName.trim() && customerPhone.trim() && 
                  validatePhone(customerPhone) &&
                  (!alternativePhone.trim() || validatePhone(alternativePhone)) &&
                  (orderType === "pickup" || customerAddress.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Your Order</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please review and confirm your order details
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-5 w-5" />
              <span>Order Summary</span>
            </div>
            <div className="space-y-2 pl-7">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">Rs. {subtotal.toFixed(0)}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium">Rs. {deliveryFee}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">Rs. {total.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Order Type & Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <MapPin className="h-5 w-5" />
              <span>Order Type</span>
            </div>
            <div className="pl-7 space-y-1">
              <p className="text-sm">
                <span className="font-medium capitalize">{orderType}</span>
                {orderType === "pickup" && branchName && ` from ${branchName}`}
                {orderType === "delivery" && selectedArea && ` to ${selectedArea}`}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <User className="h-5 w-5" />
              <span>Customer Information</span>
            </div>
            <div className="pl-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Full Name *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) {
                      setErrors(prev => ({ ...prev, customerName: "" }));
                    }
                  }}
                  placeholder="Enter your full name"
                  data-testid="input-customer-name"
                  className={errors.customerName ? "border-destructive" : ""}
                  required
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone Number *</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (errors.customerPhone) {
                        setErrors(prev => ({ ...prev, customerPhone: "" }));
                      }
                    }}
                    placeholder="03XX XXXXXXX"
                    data-testid="input-customer-phone"
                    className={errors.customerPhone ? "border-destructive" : ""}
                    required
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-destructive">{errors.customerPhone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternative-phone">Alternative Phone</Label>
                  <Input
                    id="alternative-phone"
                    value={alternativePhone}
                    onChange={(e) => {
                      setAlternativePhone(e.target.value);
                      if (errors.alternativePhone) {
                        setErrors(prev => ({ ...prev, alternativePhone: "" }));
                      }
                    }}
                    placeholder="03XX XXXXXXX"
                    data-testid="input-alternative-phone"
                    className={errors.alternativePhone ? "border-destructive" : ""}
                  />
                  {errors.alternativePhone && (
                    <p className="text-sm text-destructive">{errors.alternativePhone}</p>
                  )}
                </div>
              </div>

              {orderType === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="customer-address">Delivery Address *</Label>
                  <Textarea
                    id="customer-address"
                    value={customerAddress}
                    onChange={(e) => {
                      setCustomerAddress(e.target.value);
                      if (errors.customerAddress) {
                        setErrors(prev => ({ ...prev, customerAddress: "" }));
                      }
                    }}
                    placeholder="Enter complete delivery address with landmarks"
                    rows={3}
                    data-testid="input-customer-address"
                    className={errors.customerAddress ? "border-destructive" : ""}
                    required
                  />
                  {errors.customerAddress && (
                    <p className="text-sm text-destructive">{errors.customerAddress}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-5 w-5" />
              <span>Payment Method</span>
            </div>
            <div className="pl-7">
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "cash" | "jazzcash")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" data-testid="radio-cash" />
                  <Label htmlFor="cash" className="font-normal cursor-pointer">
                    Cash on Delivery (Default)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jazzcash" id="jazzcash" data-testid="radio-jazzcash" />
                  <Label htmlFor="jazzcash" className="font-normal cursor-pointer">
                    JazzCash
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <MessageSquare className="h-5 w-5" />
              <span>Special Instructions (Optional)</span>
            </div>
            <div className="pl-7">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or instructions for your order..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="button-cancel-order"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            data-testid="button-confirm-order"
          >
            {isSubmitting ? "Placing Order..." : `Confirm Order - Rs. ${total.toFixed(0)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
