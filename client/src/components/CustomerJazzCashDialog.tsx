import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CustomerJazzCashDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  branchId: string;
  onPaymentComplete?: () => void;
}

const JAZZCASH_MERCHANT_NUMBER = "03001234567"; // TODO: Make this configurable per branch

export function CustomerJazzCashDialog({
  open,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  branchId,
  onPaymentComplete,
}: CustomerJazzCashDialogProps) {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Number copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "jazzcash",
          paymentStatus: "awaiting_verification",
          jazzCashTransactionId: transactionId.trim(),
          jazzCashPayerPhone: payerPhone.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to submit payment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted!",
        description: "Your payment details have been submitted for verification. We'll confirm your order shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setTransactionId("");
      setPayerPhone("");
      onPaymentComplete?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!transactionId.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter the transaction ID",
        variant: "destructive",
      });
      return;
    }

    if (!payerPhone.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter your JazzCash phone number",
        variant: "destructive",
      });
      return;
    }

    const phoneRegex = /^03\d{9}$/;
    if (!phoneRegex.test(payerPhone.replace(/\s/g, ''))) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number (03XXXXXXXXX)",
        variant: "destructive",
      });
      return;
    }

    submitPaymentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <DialogTitle data-testid="text-jazzcash-dialog-title">Complete JazzCash Payment</DialogTitle>
          </div>
          <DialogDescription>
            Order #{orderNumber} - Rs. {totalAmount.toFixed(0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Instructions */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Payment Instructions
              </h3>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Open your JazzCash app</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Send <strong className="text-foreground">Rs. {totalAmount.toFixed(0)}</strong> to the number below</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Enter the transaction ID and your JazzCash number below</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Merchant JazzCash Number */}
          <div className="space-y-2">
            <Label>Send Payment To</Label>
            <div className="flex gap-2">
              <Input
                value={JAZZCASH_MERCHANT_NUMBER}
                readOnly
                className="font-mono text-base"
                data-testid="input-merchant-number"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(JAZZCASH_MERCHANT_NUMBER)}
                data-testid="button-copy-number"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Amount Display */}
          <div className="space-y-2">
            <Label>Amount to Send</Label>
            <Input
              value={`Rs. ${totalAmount.toFixed(0)}`}
              readOnly
              className="font-semibold text-lg"
              data-testid="input-amount"
            />
          </div>

          {/* Transaction ID Input */}
          <div className="space-y-2">
            <Label htmlFor="transactionId">JazzCash Transaction ID *</Label>
            <Input
              id="transactionId"
              placeholder="e.g., TXN1234567890"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              data-testid="input-transaction-id"
            />
            <p className="text-xs text-muted-foreground">
              Enter the transaction ID from your JazzCash app
            </p>
          </div>

          {/* Payer Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="payerPhone">Your JazzCash Number *</Label>
            <Input
              id="payerPhone"
              placeholder="03XXXXXXXXX"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              data-testid="input-payer-phone"
            />
            <p className="text-xs text-muted-foreground">
              Phone number you used to send the payment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitPaymentMutation.isPending}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitPaymentMutation.isPending}
              data-testid="button-submit-payment"
            >
              {submitPaymentMutation.isPending ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
