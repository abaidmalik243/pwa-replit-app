import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminJazzCash() {
  const { data: jazzCashConfig } = useQuery({
    queryKey: ["/api/payments/jazzcash/config"],
  });

  const { data: jazzCashTransactions } = useQuery({
    queryKey: ["/api/payments/jazzcash/transactions"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/payments/jazzcash/stats"],
  });

  const isConfigured = jazzCashConfig?.configured || false;
  const environment = jazzCashConfig?.environment || "sandbox";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">JazzCash Payment Gateway</h1>
          <p className="text-muted-foreground">
            Monitor and manage JazzCash mobile wallet payments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Configuration</CardTitle>
              {isConfigured ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" data-testid="icon-configured" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" data-testid="icon-not-configured" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-config-status">
                {isConfigured ? "Active" : "Not Configured"}
              </div>
              <p className="text-xs text-muted-foreground">
                Environment: <Badge variant="secondary" data-testid="badge-environment">{environment}</Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-transactions">
                {stats?.totalTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.successRate || 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-amount">
                PKR {stats?.totalAmount?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                All time revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending">
                {stats?.pendingCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="testing" data-testid="tab-testing">Testing Guide</TabsTrigger>
            <TabsTrigger value="production" data-testid="tab-production">Production Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent JazzCash Transactions</CardTitle>
                <CardDescription>All JazzCash mobile wallet payments</CardDescription>
              </CardHeader>
              <CardContent>
                {!jazzCashTransactions || jazzCashTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No JazzCash transactions yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jazzCashTransactions.map((txn: any) => (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`transaction-${txn.id}`}
                      >
                        <div className="space-y-1">
                          <div className="font-medium">Order #{txn.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            Transaction ID: {txn.jazzCashTransactionId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(txn.createdAt), "PPpp")}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-bold">PKR {parseFloat(txn.total).toLocaleString()}</div>
                          <Badge
                            variant={txn.paymentStatus === "paid" ? "default" : "secondary"}
                            data-testid={`badge-status-${txn.id}`}
                          >
                            {txn.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sandbox Testing Guide</CardTitle>
                <CardDescription>How to test JazzCash payments in sandbox environment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Prerequisites
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>JazzCash sandbox merchant account</li>
                    <li>Test credentials configured in Replit Secrets</li>
                    <li>Sandbox environment enabled (current: <Badge>{environment}</Badge>)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Test Credentials</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Merchant ID:</strong> Your sandbox merchant ID</div>
                    <div><strong>Password:</strong> Your sandbox password</div>
                    <div><strong>Integrity Salt:</strong> Your sandbox integrity salt</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      These are stored securely in Replit Secrets
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Testing Steps</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Create a test order as a customer</li>
                    <li>Select JazzCash payment method at checkout</li>
                    <li>You'll be redirected to JazzCash sandbox gateway</li>
                    <li>Use test mobile number: <code className="bg-muted px-1">03001234567</code></li>
                    <li>Enter any MPIN (sandbox accepts any value)</li>
                    <li>Complete OTP verification (sandbox auto-accepts)</li>
                    <li>You'll be redirected back with payment status</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Test Scenarios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="border p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">✅ Successful Payment</div>
                      <div className="text-xs text-muted-foreground">
                        Complete the payment flow normally
                      </div>
                    </div>
                    <div className="border p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">❌ Failed Payment</div>
                      <div className="text-xs text-muted-foreground">
                        Cancel during JazzCash gateway
                      </div>
                    </div>
                    <div className="border p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">⏱️ Timeout</div>
                      <div className="text-xs text-muted-foreground">
                        Wait 1 hour without completing
                      </div>
                    </div>
                    <div className="border p-3 rounded-lg">
                      <div className="font-medium text-sm mb-1">🔄 Duplicate Payment</div>
                      <div className="text-xs text-muted-foreground">
                        Try paying already-paid order (blocked)
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Setup</CardTitle>
                <CardDescription>Steps to switch to production JazzCash gateway</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div className="space-y-1">
                      <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                        Production Checklist
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        Complete all steps before going live
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 1: Get Production Credentials</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Contact JazzCash to activate production merchant account</li>
                    <li>Complete business verification and compliance</li>
                    <li>Receive production merchant ID, password, and integrity salt</li>
                    <li>Review and sign merchant agreement</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 2: Update Environment Variables</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                    <div>Go to Replit Secrets and update:</div>
                    <code className="block bg-background p-2 rounded">
                      JAZZCASH_MERCHANT_ID=your_production_merchant_id<br />
                      JAZZCASH_PASSWORD=your_production_password<br />
                      JAZZCASH_INTEGRITY_SALT=your_production_salt<br />
                      JAZZCASH_BASE_URL=https://payments.jazzcash.com.pk
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 3: Update Return URLs</h3>
                  <div className="text-sm text-muted-foreground">
                    Ensure your production domain is whitelisted in JazzCash merchant portal:
                  </div>
                  <code className="block bg-muted p-2 rounded text-sm">
                    https://your-domain.com/payment-result
                  </code>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 4: Test in Production</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Make a small test transaction (PKR 10-50)</li>
                    <li>Verify payment flow works end-to-end</li>
                    <li>Check webhook callbacks are received</li>
                    <li>Confirm order status updates correctly</li>
                    <li>Test refund process (if applicable)</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 5: Monitor & Maintain</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Monitor this dashboard for transaction status</li>
                    <li>Set up alerts for failed payments</li>
                    <li>Review daily settlement reports</li>
                    <li>Keep credentials secure and rotate periodically</li>
                  </ul>
                </div>

                <Button className="w-full" data-testid="button-contact-support">
                  Contact JazzCash Support
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
