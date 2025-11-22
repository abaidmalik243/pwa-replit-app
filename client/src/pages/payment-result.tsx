import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [_, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const message = searchParams.get("message");

  useEffect(() => {
    // Auto-redirect after a few seconds if successful
    if (status === "success" && orderId) {
      const timer = setTimeout(() => {
        navigate(`/order-confirmation/${orderId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, orderId, navigate]);

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-center mt-4">Processing payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <CardTitle>Payment Successful!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your payment has been successfully processed. Thank you for your order!
            </p>
            {orderId && (
              <p className="text-sm text-muted-foreground">
                Redirecting to order confirmation...
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => navigate("/")}>
                Back to Home
              </Button>
              {orderId && (
                <Button variant="outline" onClick={() => navigate(`/order-confirmation/${orderId}`)}>
                  View Order
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <CardTitle>Payment Failed</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {message || "We couldn't process your payment. Please try again."}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")}>
              Back to Home
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
