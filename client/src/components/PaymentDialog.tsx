import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, Smartphone, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PaymentMethod {
  id: string;
  type: "cash" | "card" | "jazzcash";
  amount: number;
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  branchId: string;
  onPaymentComplete?: () => void;
}

export function PaymentDialog({
  open,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  branchId,
  onPaymentComplete,
}: PaymentDialogProps) {
  const { toast } = useToast();
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod] = useState<"cash" | "card" | "jazzcash">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [splitPayments, setSplitPayments] = useState<PaymentMethod[]>([
    { id: "1", type: "cash", amount: 0 },
  ]);

  // Ensure totalAmount is valid, default to 0 if NaN or invalid
  const validTotalAmount = isNaN(totalAmount) || totalAmount === null || totalAmount === undefined ? 0 : totalAmount;

  const calculateChange = () => {
    if (paymentMode === "single" && singleMethod === "cash") {
      const received = parseFloat(cashReceived) || 0;
      return Math.max(0, received - validTotalAmount);
    }
    return 0;
  };

  const calculateTotalPaid = () => {
    if (paymentMode === "single") {
      // For non-cash methods, the payment amount is automatically the order total
      if (singleMethod !== "cash") {
        return validTotalAmount;
      }
      return parseFloat(cashReceived) || 0;
    }
    return splitPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const isPaymentValid = () => {
    const totalPaid = calculateTotalPaid();
    if (paymentMode === "single") {
      // For non-cash, payment is always valid as it matches total automatically
      if (singleMethod !== "cash") {
        return true;
      }
      // For cash, must receive at least the total amount
      return totalPaid >= validTotalAmount;
    }
    return Math.abs(totalPaid - validTotalAmount) < 0.01; // Account for floating point precision
  };

  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      let paymentMethodStr = "";
      let paymentDetails: any = {};

      if (paymentMode === "single") {
        paymentMethodStr = singleMethod;
        if (singleMethod === "cash") {
          paymentDetails = {
            cashReceived: parseFloat(cashReceived),
            change: calculateChange(),
          };
        }
      } else {
        paymentMethodStr = "split";
        paymentDetails = {
          methods: splitPayments.map(p => ({
            type: p.type,
            amount: p.amount,
          })),
        };
      }

      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: paymentMethodStr,
          paymentStatus: "paid",
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to process payment");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment processed",
        description: `Order ${orderNumber} has been paid successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active", branchId] });
      onPaymentComplete?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcessPayment = () => {
    if (!isPaymentValid()) {
      toast({
        title: "Invalid payment",
        description: "Payment amount must equal order total",
        variant: "destructive",
      });
      return;
    }
    processPaymentMutation.mutate();
  };

  const addSplitPayment = () => {
    setSplitPayments([
      ...splitPayments,
      { id: Date.now().toString(), type: "cash", amount: 0 },
    ]);
  };

  const removeSplitPayment = (id: string) => {
    if (splitPayments.length > 1) {
      setSplitPayments(splitPayments.filter(p => p.id !== id));
    }
  };

  const updateSplitPayment = (id: string, field: "type" | "amount", value: any) => {
    setSplitPayments(
      splitPayments.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-4 h-4" />;
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "jazzcash":
        return <Smartphone className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const remainingAmount = validTotalAmount - calculateTotalPaid();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-payment">
        <DialogHeader>
          <DialogTitle className="text-2xl">Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="text-lg font-semibold" data-testid="text-order-number">{orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-amount">
                    PKR {validTotalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Mode Selection */}
          <div className="space-y-3">
            <Label>Payment Mode</Label>
            <RadioGroup
              value={paymentMode}
              onValueChange={(value: "single" | "split") => setPaymentMode(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" data-testid="radio-payment-single" />
                <Label htmlFor="single" className="cursor-pointer">Single Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="split" id="split" data-testid="radio-payment-split" />
                <Label htmlFor="split" className="cursor-pointer">Split Payment</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Single Payment */}
          {paymentMode === "single" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={singleMethod}
                  onValueChange={(value: "cash" | "card" | "jazzcash") => {
                    setSingleMethod(value);
                    // Reset cash received when switching methods
                    setCashReceived("");
                  }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div>
                    <RadioGroupItem value="cash" id="cash" className="sr-only" />
                    <Label
                      htmlFor="cash"
                      className={`flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer hover-elevate ${
                        singleMethod === "cash" ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid="label-method-cash"
                    >
                      <Banknote className="w-5 h-5" />
                      Cash
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="card" id="card" className="sr-only" />
                    <Label
                      htmlFor="card"
                      className={`flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer hover-elevate ${
                        singleMethod === "card" ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid="label-method-card"
                    >
                      <CreditCard className="w-5 h-5" />
                      Card
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="jazzcash" id="jazzcash" className="sr-only" />
                    <Label
                      htmlFor="jazzcash"
                      className={`flex items-center justify-center gap-2 p-4 border rounded-md cursor-pointer hover-elevate ${
                        singleMethod === "jazzcash" ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid="label-method-jazzcash"
                    >
                      <Smartphone className="w-5 h-5" />
                      JazzCash
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {singleMethod === "cash" && (
                <div className="space-y-2">
                  <Label htmlFor="cash-received">Cash Received</Label>
                  <Input
                    id="cash-received"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    data-testid="input-cash-received"
                  />
                  {cashReceived && (
                    <div className="flex justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">Change</span>
                      <span className="text-sm font-bold" data-testid="text-change">
                        PKR {calculateChange().toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {singleMethod !== "cash" && (
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Payment Amount</span>
                    <span className="text-lg font-bold">PKR {validTotalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {singleMethod === "card" ? "Process card payment for full amount" : "Process JazzCash payment for full amount"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Split Payment */}
          {paymentMode === "split" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Payment Methods</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplitPayment}
                  data-testid="button-add-split"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Method
                </Button>
              </div>

              <div className="space-y-3">
                {splitPayments.map((payment, index) => (
                  <Card key={payment.id}>
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className="text-xs mb-2 block">Method</Label>
                          <RadioGroup
                            value={payment.type}
                            onValueChange={(value) => updateSplitPayment(payment.id, "type", value)}
                            className="flex gap-2"
                          >
                            <div className="flex-1">
                              <RadioGroupItem value="cash" id={`split-cash-${payment.id}`} className="sr-only" />
                              <Label
                                htmlFor={`split-cash-${payment.id}`}
                                className={`flex items-center justify-center gap-1 p-2 border rounded text-xs cursor-pointer hover-elevate ${
                                  payment.type === "cash" ? "border-primary bg-primary/5" : ""
                                }`}
                                data-testid={`label-split-cash-${index}`}
                              >
                                {getMethodIcon("cash")}
                                Cash
                              </Label>
                            </div>
                            <div className="flex-1">
                              <RadioGroupItem value="card" id={`split-card-${payment.id}`} className="sr-only" />
                              <Label
                                htmlFor={`split-card-${payment.id}`}
                                className={`flex items-center justify-center gap-1 p-2 border rounded text-xs cursor-pointer hover-elevate ${
                                  payment.type === "card" ? "border-primary bg-primary/5" : ""
                                }`}
                                data-testid={`label-split-card-${index}`}
                              >
                                {getMethodIcon("card")}
                                Card
                              </Label>
                            </div>
                            <div className="flex-1">
                              <RadioGroupItem value="jazzcash" id={`split-jazzcash-${payment.id}`} className="sr-only" />
                              <Label
                                htmlFor={`split-jazzcash-${payment.id}`}
                                className={`flex items-center justify-center gap-1 p-2 border rounded text-xs cursor-pointer hover-elevate ${
                                  payment.type === "jazzcash" ? "border-primary bg-primary/5" : ""
                                }`}
                                data-testid={`label-split-jazzcash-${index}`}
                              >
                                {getMethodIcon("jazzcash")}
                                Jazz
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="w-32">
                          <Label className="text-xs mb-2 block">Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={payment.amount || ""}
                            onChange={(e) => updateSplitPayment(payment.id, "amount", parseFloat(e.target.value) || 0)}
                            data-testid={`input-split-amount-${index}`}
                          />
                        </div>
                        {splitPayments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-6"
                            onClick={() => removeSplitPayment(payment.id)}
                            data-testid={`button-remove-split-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <div>
                  <span className="text-sm font-medium">Total Paid</span>
                  <Badge variant={remainingAmount === 0 ? "default" : "destructive"} className="ml-2">
                    {remainingAmount === 0 ? "Complete" : `Short by PKR ${Math.abs(remainingAmount).toFixed(2)}`}
                  </Badge>
                </div>
                <span className="text-lg font-bold" data-testid="text-split-total">
                  PKR {calculateTotalPaid().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={processPaymentMutation.isPending}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleProcessPayment}
              disabled={!isPaymentValid() || processPaymentMutation.isPending}
              data-testid="button-process-payment"
            >
              {processPaymentMutation.isPending ? "Processing..." : "Process Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
