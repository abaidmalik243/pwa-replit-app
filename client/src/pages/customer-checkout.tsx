import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { Branch } from "@shared/schema";

export default function CustomerCheckout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get cart data from localStorage
  const [cartData, setCartData] = useState<any>(null);
  const [orderInfo, setOrderInfo] = useState<any>(null);

  useEffect(() => {
    const savedCart = localStorage.getItem("kebabish-cart");
    const savedOrderInfo = localStorage.getItem("kebabish-order-info");
    
    if (!savedCart || !savedOrderInfo) {
      setLocation("/");
      return;
    }

    try {
      setCartData(JSON.parse(savedCart));
      setOrderInfo(JSON.parse(savedOrderInfo));
    } catch (e) {
      setLocation("/");
    }
  }, [setLocation]);

  // Fetch branches for delivery charges
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const selectedBranch = branches.find(b => b.id === orderInfo?.branchId);

  if (!cartData || !orderInfo) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const cartItems = cartData.items || [];
  const subtotal = cartData.subtotal || 0;
  const deliveryCharges = orderInfo.orderType === "delivery" ? 50 : 0; // Default delivery charge
  const discount = 0; // Will be calculated from promo code
  const total = subtotal + deliveryCharges - discount;

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (orderInfo.orderType === "delivery" && !customerAddress) {
      toast({
        title: "Missing address",
        description: "Please provide a delivery address.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const orderPayload = {
        customerName,
        customerPhone,
        customerAddress: orderInfo.orderType === "delivery" ? customerAddress : "",
        deliveryArea: orderInfo.area || "",
        orderType: orderInfo.orderType,
        orderSource: "online",
        paymentMethod,
        branchId: orderInfo.branchId,
        items: JSON.stringify(cartItems),
        subtotal: subtotal.toString(),
        deliveryCharges: deliveryCharges.toString(),
        total: total.toString(),
        notes,
      };

      const response = await apiRequest("POST", "/api/orders", orderPayload) as any;

      // Clear cart
      localStorage.removeItem("kebabish-cart");

      if (paymentMethod === "stripe") {
        // Redirect to Stripe checkout
        window.location.href = response.checkoutUrl;
      } else if (paymentMethod === "jazzcash") {
        // Store order ID for JazzCash verification
        localStorage.setItem("pending-order-id", response.id);
        setLocation("/payment-result?status=pending&method=jazzcash&orderId=" + response.id);
      } else {
        // Cash payment - order confirmed
        toast({
          title: "Order placed successfully",
          description: `Order #${response.orderNumber} confirmed!`,
        });
        setLocation(`/account/orders`);
      }
    } catch (error: any) {
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b">
          <div className="flex items-center gap-4 p-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-checkout-title">Checkout</h1>
          </div>
        </div>

        <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card className="p-6" data-testid="card-customer-info">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-customer-info">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" data-testid="label-customer-name">Full Name</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" data-testid="label-customer-phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03001234567"
                    data-testid="input-customer-phone"
                  />
                </div>
                {orderInfo.orderType === "delivery" && (
                  <div>
                    <Label htmlFor="address" data-testid="label-customer-address">Delivery Address</Label>
                    <Textarea
                      id="address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Enter your delivery address"
                      data-testid="textarea-customer-address"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6" data-testid="card-payment-method">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-payment-method">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} data-testid="radio-payment-method">
                <div className="flex items-center space-x-2 mb-4">
                  <RadioGroupItem value="cash" id="cash" data-testid="radio-payment-cash" />
                  <Label htmlFor="cash" className="cursor-pointer">Cash on Delivery</Label>
                </div>
                <div className="flex items-center space-x-2 mb-4">
                  <RadioGroupItem value="card" id="card" data-testid="radio-payment-card" />
                  <Label htmlFor="card" className="cursor-pointer">Credit/Debit Card (Stripe)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jazzcash" id="jazzcash" data-testid="radio-payment-jazzcash" />
                  <Label htmlFor="jazzcash" className="cursor-pointer">JazzCash</Label>
                </div>
              </RadioGroup>
            </Card>

            {/* Special Instructions */}
            <Card className="p-6" data-testid="card-instructions">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-special-instructions">Special Instructions</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or allergies?"
                data-testid="textarea-special-instructions"
              />
            </Card>

            {/* Promo Code */}
            <Card className="p-6" data-testid="card-promo-code">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-promo-code">Promo Code</h2>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  data-testid="input-promo-code"
                />
                <Button variant="outline" disabled data-testid="button-apply-promo">Apply</Button>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-20" data-testid="card-order-summary">
              <h2 className="text-xl font-semibold mb-4" data-testid="text-order-summary">Order Summary</h2>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cartItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm" data-testid={`row-cart-item-${idx}`}>
                    <div>
                      <div className="font-medium" data-testid={`text-item-name-${idx}`}>{item.name}</div>
                      {item.variants && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-item-variants-${idx}`}>
                          {item.variants.map((v: any) => v.optionName).join(", ")}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground" data-testid={`text-item-quantity-${idx}`}>
                        Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="font-semibold" data-testid={`text-item-price-${idx}`}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between" data-testid="row-subtotal">
                  <span data-testid="text-subtotal-label">Subtotal</span>
                  <span className="font-semibold" data-testid="text-subtotal-value">{formatCurrency(subtotal)}</span>
                </div>
                {orderInfo.orderType === "delivery" && (
                  <div className="flex justify-between" data-testid="row-delivery">
                    <span data-testid="text-delivery-label">Delivery</span>
                    <span className="font-semibold" data-testid="text-delivery-value">{formatCurrency(deliveryCharges)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600" data-testid="row-discount">
                    <span data-testid="text-discount-label">Discount</span>
                    <span className="font-semibold" data-testid="text-discount-value">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2" data-testid="row-total">
                  <span data-testid="text-total-label">Total</span>
                  <span data-testid="text-total-value">{formatCurrency(total)}</span>
                </div>
              </div>

              <Button 
                className="w-full mt-6 h-12 text-lg"
                onClick={handleCheckout}
                disabled={isProcessing}
                data-testid="button-place-order"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
