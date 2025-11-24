import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Database, CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";

interface DiagnosticsData {
  development: {
    branches: number;
    categories: number;
    menuItems: number;
    orders: number;
    customers: number;
    users: number;
    riders: number;
    totalRecords: number;
  };
  production: {
    branches: number;
    categories: number;
    menuItems: number;
    orders: number;
    customers: number;
    users: number;
    riders: number;
    totalRecords: number;
    pendingOrders: number;
    lastBackup: string | null;
  };
  canClone: boolean;
  blockingReasons: string[];
}

export default function AdminCloneToProduction() {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [prodDbUrl, setProdDbUrl] = useState("");
  const [cloneStatus, setCloneStatus] = useState<any>(null);

  const { data: diagnostics, isLoading: loadingDiagnostics } = useQuery<DiagnosticsData>({
    queryKey: ["/api/admin/clone-diagnostics"],
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/clone-to-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmationText: confirmText, prodDbUrl }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Clone failed");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setCloneStatus(data);
    },
    onError: (error: any) => {
      setCloneStatus({ success: false, error: error.message });
    },
  });

  const canProceedStep1 = diagnostics?.canClone && step === 1;
  const canProceedStep2 = confirmText === "CLONE ALL DATA" && step === 2;
  const canProceedStep3 = prodDbUrl.includes("postgres") && step === 3;

  const handleClone = () => {
    if (confirm("FINAL WARNING: This will DELETE ALL production data and replace it with development data. Are you absolutely sure?")) {
      cloneMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Database className="w-8 h-8" />
            Clone Development to Production
          </h1>
          <p className="text-muted-foreground">
            Complete database migration with automatic backup and rollback
          </p>
        </div>

        {/* Critical Warning */}
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">⚠️ CRITICAL OPERATION</AlertTitle>
          <AlertDescription className="text-base">
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>ALL production data will be PERMANENTLY DELETED</li>
              <li>All customers, orders, and transactions will be replaced</li>
              <li>Production will be unavailable for 2-5 minutes</li>
              <li>Automatic backup will be created before cloning</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Diagnostics Panel */}
        {loadingDiagnostics ? (
          <Card className="p-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading database diagnostics...</span>
            </div>
          </Card>
        ) : diagnostics ? (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database Diagnostics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Development Stats */}
              <div>
                <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">Development Database (Source)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Branches:</span>
                    <span className="font-mono" data-testid="text-dev-branches">{diagnostics.development.branches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories:</span>
                    <span className="font-mono" data-testid="text-dev-categories">{diagnostics.development.categories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Menu Items:</span>
                    <span className="font-mono" data-testid="text-dev-menu-items">{diagnostics.development.menuItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orders:</span>
                    <span className="font-mono" data-testid="text-dev-orders">{diagnostics.development.orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customers:</span>
                    <span className="font-mono" data-testid="text-dev-customers">{diagnostics.development.customers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users/Staff:</span>
                    <span className="font-mono" data-testid="text-dev-users">{diagnostics.development.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Riders:</span>
                    <span className="font-mono" data-testid="text-dev-riders">{diagnostics.development.riders}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                    <span>Total Records:</span>
                    <span className="font-mono" data-testid="text-dev-total">{diagnostics.development.totalRecords}</span>
                  </div>
                </div>
              </div>

              {/* Production Stats */}
              <div>
                <h3 className="font-semibold mb-3 text-destructive">Production Database (Will be DELETED)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Branches:</span>
                    <span className="font-mono" data-testid="text-prod-branches">{diagnostics.production.branches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Categories:</span>
                    <span className="font-mono" data-testid="text-prod-categories">{diagnostics.production.categories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Menu Items:</span>
                    <span className="font-mono" data-testid="text-prod-menu-items">{diagnostics.production.menuItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orders:</span>
                    <span className="font-mono text-destructive font-bold" data-testid="text-prod-orders">{diagnostics.production.orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customers:</span>
                    <span className="font-mono" data-testid="text-prod-customers">{diagnostics.production.customers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users/Staff:</span>
                    <span className="font-mono" data-testid="text-prod-users">{diagnostics.production.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Riders:</span>
                    <span className="font-mono" data-testid="text-prod-riders">{diagnostics.production.riders}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
                    <span>Total Records:</span>
                    <span className="font-mono text-destructive font-bold" data-testid="text-prod-total">{diagnostics.production.totalRecords}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span>Pending Orders:</span>
                    <span className={`font-mono ${diagnostics.production.pendingOrders > 0 ? 'text-destructive font-bold' : ''}`} data-testid="text-prod-pending">
                      {diagnostics.production.pendingOrders}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Backup:</span>
                    <span className="text-xs" data-testid="text-prod-backup">{diagnostics.production.lastBackup || "Never"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blocking Reasons */}
            {diagnostics.blockingReasons.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cannot Proceed - Blocking Issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {diagnostics.blockingReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </Card>
        ) : null}

        {/* Three-Step Confirmation Process */}
        {diagnostics && diagnostics.canClone && !cloneStatus && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Confirmation Process (3 Steps)</h2>
            
            {/* Step 1 */}
            <div className={`mb-6 ${step >= 1 ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 1 ? 'bg-green-500' : step === 1 ? 'bg-primary' : 'bg-muted'} text-white font-bold`}>
                  {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                </div>
                <h3 className="font-semibold">Review Diagnostics Above</h3>
              </div>
              {step === 1 && (
                <div className="ml-10">
                  <p className="text-sm text-muted-foreground mb-3">
                    Carefully review the database statistics above. {diagnostics.production.totalRecords} production records will be deleted.
                  </p>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    data-testid="button-proceed-step-1"
                  >
                    I have reviewed the diagnostics
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2 */}
            {step >= 2 && (
              <div className={`mb-6 ${step >= 2 ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > 2 ? 'bg-green-500' : step === 2 ? 'bg-primary' : 'bg-muted'} text-white font-bold`}>
                    {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                  </div>
                  <h3 className="font-semibold">Type Confirmation Text</h3>
                </div>
                {step === 2 && (
                  <div className="ml-10 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Type <strong>CLONE ALL DATA</strong> (exactly) to confirm you understand the consequences:
                    </p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="CLONE ALL DATA"
                      className="max-w-md"
                      data-testid="input-confirm-text"
                    />
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      data-testid="button-proceed-step-2"
                    >
                      Continue to Final Step
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step >= 3 && (
              <div className={`mb-6 ${step >= 3 ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 3 ? 'bg-primary' : 'bg-muted'} text-white font-bold`}>
                    3
                  </div>
                  <h3 className="font-semibold">Re-enter Production Database URL</h3>
                </div>
                {step === 3 && (
                  <div className="ml-10 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      As a final safety check, re-enter your production database URL:
                    </p>
                    <Input
                      type="password"
                      value={prodDbUrl}
                      onChange={(e) => setProdDbUrl(e.target.value)}
                      placeholder="postgres://..."
                      className="max-w-md font-mono text-sm"
                      data-testid="input-prod-db-url"
                    />
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>FINAL WARNING</AlertTitle>
                      <AlertDescription>
                        Clicking "Start Clone" will immediately begin the process. This cannot be undone without restoring from backup.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleClone}
                      disabled={!canProceedStep3 || cloneMutation.isPending}
                      variant="destructive"
                      size="lg"
                      data-testid="button-start-clone"
                    >
                      {cloneMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cloning in Progress...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Start Clone to Production
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Clone Status */}
        {cloneStatus && (
          <Card className="p-6" data-testid="card-clone-status">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" data-testid="text-clone-status-title">
              {cloneStatus.success ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Clone Completed Successfully
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-destructive" />
                  Clone Failed
                </>
              )}
            </h2>
            
            {cloneStatus.success ? (
              <div className="space-y-4">
                <Alert data-testid="alert-clone-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    Production database has been successfully cloned from development.
                  </AlertDescription>
                </Alert>
                {cloneStatus.message && (
                  <p className="text-sm text-muted-foreground" data-testid="text-clone-message">{cloneStatus.message}</p>
                )}
                {cloneStatus.timestamp && (
                  <p className="text-sm text-muted-foreground" data-testid="text-clone-timestamp">
                    Completed at: {new Date(cloneStatus.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {cloneStatus.error || "An unknown error occurred"}
                  </AlertDescription>
                </Alert>
                {cloneStatus.rollback && (
                  <Alert>
                    <AlertTitle>Rollback Applied</AlertTitle>
                    <AlertDescription>
                      Production has been restored from backup. No data was lost.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
