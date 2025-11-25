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
                Order #{orderId.slice(0, 8)}...
              </p>
            )}
            <div className="flex gap-2">
              <Button data-testid="button-home" onClick={() => navigate("/")}>
                Back to Home
              </Button>
              {orderId && (
                <Button data-testid="button-view-orders" variant="outline" onClick={() => navigate("/customer/orders")}>
                  View My Orders
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
            <XCircle className="h-8 w-8 text-destructive" data-testid="icon-error" />
            <CardTitle data-testid="text-title">Payment Failed</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground" data-testid="text-error-message">
            {message || "We couldn't process your payment. Please try again."}
          </p>
          <div className="flex gap-2">
            <Button data-testid="button-home" onClick={() => navigate("/")}>
              Back to Home
            </Button>
            <Button data-testid="button-try-again" variant="outline" onClick={() => window.history.back()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
