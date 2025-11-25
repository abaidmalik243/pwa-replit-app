import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Smartphone, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JazzCashPaymentGatewayProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

interface JazzCashFormData {
  formData: {
    pp_Version: string;
    pp_TxnType: string;
    pp_Language: string;
    pp_MerchantID: string;
    pp_SubMerchantID: string;
    pp_Password: string;
    pp_TxnRefNo: string;
    pp_Amount: string;
    pp_TxnCurrency: string;
    pp_TxnDateTime: string;
    pp_BillReference: string;
    pp_Description: string;
    pp_TxnExpiryDateTime: string;
    pp_ReturnURL: string;
    pp_SecureHash: string;
    ppmpf_1?: string;
    ppmpf_2?: string;
    ppmpf_3?: string;
    ppmpf_4?: string;
    ppmpf_5?: string;
    pp_MobileNumber?: string;
  };
  paymentUrl: string;
}

export function JazzCashPaymentGateway({
  open,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
}: JazzCashPaymentGatewayProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentData, setPaymentData] = useState<JazzCashFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      initializePayment();
    }
  }, [open, orderId]);

  const initializePayment = async () => {
    setIsLoading(true);
    try {
      // Create return URL for callback
      const returnUrl = `${window.location.origin}/api/payments/jazzcash/callback`;

      const response = await fetch("/api/payments/jazzcash/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          returnUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initialize payment");
      }

      const data: JazzCashFormData = await response.json();
      setPaymentData(data);

      // Auto-submit form after a brief delay
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 500);
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize JazzCash payment. Please try again.",
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <DialogTitle data-testid="text-jazzcash-gateway-title">
              JazzCash Payment
            </DialogTitle>
          </div>
          <DialogDescription>
            Order #{orderNumber} - ₨{totalAmount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">
                  {isLoading ? "Initializing payment..." : "Redirecting to JazzCash..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to the secure JazzCash payment gateway
                </p>
              </div>

              <div className="w-full space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="font-semibold">•</span>
                  Enter your JazzCash mobile number
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">•</span>
                  Enter your MPIN to authorize payment
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">•</span>
                  Enter OTP sent to your phone
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hidden auto-submit form */}
        {paymentData && (
          <form
            ref={formRef}
            method="POST"
            action={paymentData.paymentUrl}
            style={{ display: 'none' }}
          >
            {Object.entries(paymentData.formData).map(([key, value]) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={value || ''}
              />
            ))}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
