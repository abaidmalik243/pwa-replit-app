import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import CustomerHeader from "@/components/CustomerHeader";
import Footer from "@/components/Footer";
import { Award, TrendingUp, TrendingDown, ChevronLeft, Gift } from "lucide-react";
import { format } from "date-fns";

interface LoyaltyData {
  balance: number;
}

interface LoyaltyTransaction {
  id: string;
  type: "earn" | "redeem";
  points: number;
  description: string;
  createdAt: string;
}

export default function CustomerLoyalty() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState("");

  if (!isAuthenticated || user?.role !== "customer") {
    setLocation("/login");
    return null;
  }

  const { data: loyaltyData } = useQuery<LoyaltyData>({
    queryKey: [`/api/customers/${user.id}/loyalty-points`],
  });

  const { data: transactions = [], isLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: [`/api/customers/${user.id}/loyalty-points/history`],
  });

  const redeemMutation = useMutation({
    mutationFn: (points: number) =>
      apiRequest(`/api/customers/${user.id}/loyalty-points/redeem`, "POST", { points }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/loyalty-points`] });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${user.id}/loyalty-points/history`] });
      toast({ title: "Success", description: "Points redeemed successfully" });
      setIsRedeemDialogOpen(false);
      setRedeemPoints("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleRedeem = () => {
    const points = parseInt(redeemPoints);
    if (isNaN(points) || points <= 0) {
      toast({ title: "Error", description: "Please enter a valid number of points", variant: "destructive" });
      return;
    }
    if (points > (loyaltyData?.balance || 0)) {
      toast({ title: "Error", description: "Insufficient points", variant: "destructive" });
      return;
    }
    redeemMutation.mutate(points);
  };

  const pointsValue = (loyaltyData?.balance || 0) * 1; // 1 point = Rs. 1

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CustomerHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/account")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Loyalty Points</h1>
              <p className="text-muted-foreground">Earn points with every purchase</p>
            </div>
          </div>

          {/* Points Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>Available Points</CardDescription>
                  <CardTitle className="text-4xl mt-2" data-testid="text-points-balance">
                    {loyaltyData?.balance || 0}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-points-value">
                    Worth ₨{pointsValue.toFixed(2)}
                  </p>
                </div>
                <Award className="h-16 w-16 text-primary/30" data-testid="icon-award" />
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsRedeemDialogOpen(true)}
                disabled={!loyaltyData || loyaltyData.balance <= 0}
                data-testid="button-redeem-points"
              >
                <Gift className="h-4 w-4 mr-2" />
                Redeem Points
              </Button>
            </CardContent>
          </Card>

          {/* How It Works Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">• Earn 1 point for every ₨100 spent</p>
              <p className="text-sm text-muted-foreground">• Redeem points for discounts on future orders</p>
              <p className="text-sm text-muted-foreground">• 1 point = ₨1 discount</p>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <div>
            <h2 className="text-2xl font-bold mb-4" data-testid="text-history-title">Transaction History</h2>
            {isLoading ? (
              <p data-testid="text-loading">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="text-empty-state">No transactions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start earning points by placing orders
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} data-testid={`card-transaction-${transaction.id}`}>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {transaction.type === "earn" ? (
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-green-600" data-testid={`icon-earn-${transaction.id}`} />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                              <TrendingDown className="h-5 w-5 text-red-600" data-testid={`icon-redeem-${transaction.id}`} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium" data-testid={`text-description-${transaction.id}`}>
                              {transaction.description}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-date-${transaction.id}`}>
                              {format(new Date(transaction.createdAt), "PPp")}
                            </p>
                          </div>
                        </div>
                        <p className={`text-lg font-bold ${transaction.type === "earn" ? "text-green-600" : "text-red-600"}`} data-testid={`text-points-${transaction.id}`}>
                          {transaction.type === "earn" ? "+" : "-"}{transaction.points}
                        </p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Redeem Dialog */}
      <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
        <DialogContent data-testid="dialog-redeem-points">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Redeem Points</DialogTitle>
            <DialogDescription>
              Enter the number of points you want to redeem
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="points">Points to Redeem</Label>
              <Input
                id="points"
                type="number"
                placeholder="Enter points"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                min="1"
                max={loyaltyData?.balance || 0}
                data-testid="input-redeem-points"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Available: {loyaltyData?.balance || 0} points
              </p>
            </div>

            {redeemPoints && !isNaN(parseInt(redeemPoints)) && (
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">Discount Value</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-discount-value">
                    ₨{(parseInt(redeemPoints) * 1).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRedeemDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleRedeem}
              disabled={redeemMutation.isPending}
              data-testid="button-confirm-redeem"
            >
              {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
