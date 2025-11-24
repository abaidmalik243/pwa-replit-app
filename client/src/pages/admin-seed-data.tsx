import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminSeedData() {
  const { toast } = useToast();
  const [seedResults, setSeedResults] = useState<any>(null);

  const seedDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/seed-data", {}) as any;
    },
    onSuccess: (data) => {
      setSeedResults(data.results);
      toast({
        title: "Seeding complete!",
        description: "Production database has been populated with sample data.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Seeding failed",
        description: error.message || "Failed to seed data. Please try again.",
        variant: "destructive",
      });
      setSeedResults({ error: error.message });
    },
  });

  const handleSeed = () => {
    const message = seedResults 
      ? "Re-run seeding to complete any missing data. This is safe and will skip existing records. Continue?"
      : "This will populate your production database with sample data. Continue?";
    
    if (confirm(message)) {
      setSeedResults(null);
      seedDataMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-seed-title">
            <Database className="w-8 h-8" />
            Seed Production Data
          </h1>
          <p className="text-muted-foreground mt-2">
            Populate your production database with realistic sample data
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Idempotent Seeding</AlertTitle>
          <AlertDescription>
            This operation is safe to run multiple times. It will skip existing records and only create missing data. Perfect for completing partial seeding or recovering from errors.
          </AlertDescription>
        </Alert>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">What will be created?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>3 Branches</strong> - Main, North, South locations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>5 Categories</strong> - Pizzas, Burgers, Sides, etc.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>9 Menu Items</strong> - With size & variant options</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>3 Staff Users</strong> - Manager, Cashier, Kitchen</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>2 Riders</strong> - For delivery assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>2 Promo Codes</strong> - WELCOME10, SAVE200</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span><strong>5 POS Tables</strong> - For dine-in orders</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <h3 className="font-semibold mb-2">Staff Login Credentials:</h3>
            <div className="space-y-1 text-sm font-mono">
              <p>• Manager: manager@kebabish.com / manager123</p>
              <p>• Cashier: cashier1@kebabish.com / cashier123</p>
              <p>• Kitchen: kitchen1@kebabish.com / kitchen123</p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSeed}
              disabled={seedDataMutation.isPending}
              size="lg"
              className="w-full"
              data-testid="button-seed-data"
            >
              {seedDataMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding Database...
                </>
              ) : seedResults ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Re-run Seeding (Idempotent)
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Seed Production Data
                </>
              )}
            </Button>
            {seedResults && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Safe to re-run - will skip existing data and add only missing items
              </p>
            )}
          </div>
        </Card>

        {seedResults && !seedResults.error && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Seeding Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-branches-count">{seedResults.branches}</div>
                <div className="text-sm text-muted-foreground">Branches Created</div>
                {seedResults.branchesSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.branchesSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-categories-count">{seedResults.categories}</div>
                <div className="text-sm text-muted-foreground">Categories Created</div>
                {seedResults.categoriesSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.categoriesSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-menu-items-count">{seedResults.menuItems}</div>
                <div className="text-sm text-muted-foreground">Menu Items Created</div>
                {seedResults.menuItemsSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.menuItemsSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-staff-count">{seedResults.staff}</div>
                <div className="text-sm text-muted-foreground">Staff Created</div>
                {seedResults.staffSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.staffSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-riders-count">{seedResults.riders}</div>
                <div className="text-sm text-muted-foreground">Riders Created</div>
                {seedResults.ridersSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.ridersSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-promos-count">{seedResults.promos}</div>
                <div className="text-sm text-muted-foreground">Promo Codes Created</div>
                {seedResults.promosSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.promosSkipped} skipped)</div>
                )}
              </div>
              <div className="text-center p-4 bg-muted rounded-md">
                <div className="text-3xl font-bold text-primary" data-testid="text-tables-count">{seedResults.tables}</div>
                <div className="text-sm text-muted-foreground">POS Tables Created</div>
                {seedResults.tablesSkipped > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">({seedResults.tablesSkipped} skipped)</div>
                )}
              </div>
            </div>

            {seedResults.errors && seedResults.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4" />
                  Errors ({seedResults.errors.length})
                </h3>
                <div className="space-y-1">
                  {seedResults.errors.map((error: string, idx: number) => (
                    <p key={idx} className="text-sm text-muted-foreground">• {error}</p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {seedResults?.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Seeding Failed</AlertTitle>
            <AlertDescription>{seedResults.error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
