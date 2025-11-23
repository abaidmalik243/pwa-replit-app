import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Plus, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PosSession } from "@shared/schema";
import { format } from "date-fns";

export default function PosSessions() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  // Get user from localStorage
  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();
  const userBranchId = user.branchId;
  const userId = user.id;

  if (!userBranchId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No branch assigned to user</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact an administrator</p>
        </div>
      </div>
    );
  }

  const viewingAllBranches = userBranchId === "all";

  // Fetch active session (only for specific branch)
  const { data: activeSession } = useQuery<PosSession | null>({
    queryKey: ["/api/pos/sessions/active", userBranchId],
    queryFn: async () => {
      const response = await fetch(`/api/pos/sessions/active/${userBranchId}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch active session");
      return response.json();
    },
    enabled: !!userBranchId && !viewingAllBranches,
  });

  // Fetch session history
  const { data: sessions = [] } = useQuery<PosSession[]>({
    queryKey: ["/api/pos/sessions", userBranchId],
    queryFn: () => {
      const url = viewingAllBranches 
        ? "/api/pos/sessions" 
        : `/api/pos/sessions?branchId=${userBranchId}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!userBranchId,
  });

  // Open session mutation
  const openSessionMutation = useMutation({
    mutationFn: async (openingBalance: number) => {
      const response = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: userBranchId,
          openedBy: userId,
          openingCash: openingBalance.toString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to open session");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active", userBranchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions", userBranchId] });
      setShowOpenDialog(false);
      setOpeningCash("");
      toast({
        title: "Session opened",
        description: "Cash register is now active",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open session",
        variant: "destructive",
      });
    },
  });

  // Close session mutation
  const closeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, closingCash, notes }: { sessionId: string; closingCash: number; notes?: string }) => {
      // Use simplified session close endpoint
      const response = await fetch(`/api/pos/sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingCash,
          notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to close session");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active", userBranchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions", userBranchId] });
      setShowCloseDialog(false);
      setClosingCash("");
      setClosingNotes("");
      toast({
        title: "Session closed",
        description: "Cash register has been closed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close session",
        variant: "destructive",
      });
    },
  });

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid opening balance",
        variant: "destructive",
      });
      return;
    }
    openSessionMutation.mutate(amount);
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid closing balance",
        variant: "destructive",
      });
      return;
    }
    closeSessionMutation.mutate({
      sessionId: activeSession.id,
      closingCash: amount,
      notes: closingNotes || undefined,
    });
  };

  const calculateVariance = (session: PosSession) => {
    if (!session.closingCash) return null;
    const expected = parseFloat(session.openingCash);
    const actual = parseFloat(session.closingCash);
    return actual - expected;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `Rs. ${num.toLocaleString()}`;
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar
          soundEnabled={true}
          onToggleSound={() => {}}
          onLogout={() => {
            localStorage.removeItem("user");
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader 
          breadcrumbs={["POS", "Sessions"]} 
          notificationCount={0}
          userName={user.fullName || "User"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
        />

        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold" data-testid="heading-sessions">Cash Register Sessions</h1>
                <p className="text-sm text-muted-foreground">Manage cash register opening and closing</p>
              </div>
              {!activeSession && !viewingAllBranches && (
                <Button onClick={() => setShowOpenDialog(true)} data-testid="button-open-session" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Open Session
                </Button>
              )}
              {viewingAllBranches && (
                <Badge variant="outline">Viewing All Branches</Badge>
              )}
            </div>

            {/* Active session */}
            {activeSession && (
              <Card className="p-4 sm:p-6 border-2 border-primary">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold">Active Session</h2>
                        <Badge variant="default" data-testid="badge-active">
                          <Clock className="w-3 h-3 mr-1" />
                          Open
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Session {activeSession.sessionNumber}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCloseDialog(true)}
                      data-testid="button-close-session"
                      className="w-full sm:w-auto"
                    >
                      Close Session
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Opened At</p>
                      <p className="text-lg font-semibold" data-testid="text-opened-at">
                        {format(new Date(activeSession.openedAt), "PPp")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Opening Cash</p>
                      <p className="text-lg font-semibold" data-testid="text-opening-cash">
                        {formatCurrency(activeSession.openingCash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-lg font-semibold">
                        {Math.floor((Date.now() - new Date(activeSession.openedAt).getTime()) / 1000 / 60)} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* No active session message */}
            {!activeSession && !viewingAllBranches && (
              <Card className="p-6 sm:p-12 text-center">
                <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg sm:text-xl font-semibold mb-2">No Active Session</p>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Open a cash register session to start taking orders</p>
                <Button onClick={() => setShowOpenDialog(true)} data-testid="button-open-first-session" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Open Session
                </Button>
              </Card>
            )}

            {/* Session history */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Session History</h2>
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <Card className="p-4 sm:p-6 text-center text-muted-foreground text-sm sm:text-base">
                    No sessions yet
                  </Card>
                ) : (
                  sessions.map((session) => {
                    const variance = calculateVariance(session);
                    const isActive = session.status === "open";
                    
                    return (
                      <Card key={session.id} className="p-3 sm:p-4" data-testid={`card-session-${session.id}`}>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base" data-testid={`text-session-number-${session.id}`}>
                                Session {session.sessionNumber}
                              </p>
                              {isActive ? (
                                <Badge variant="default" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Open
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Closed
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                              <div>
                                <p className="text-muted-foreground">Opened</p>
                                <p className="font-medium">{format(new Date(session.openedAt), "PP")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(session.openedAt), "p")}
                                </p>
                              </div>
                              {session.closedAt && (
                                <div>
                                  <p className="text-muted-foreground">Closed</p>
                                  <p className="font-medium">{format(new Date(session.closedAt), "PP")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(session.closedAt), "p")}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-muted-foreground">Opening Cash</p>
                                <p className="font-medium">{formatCurrency(session.openingCash)}</p>
                              </div>
                              {session.closingCash && (
                                <div>
                                  <p className="text-muted-foreground">Closing Cash</p>
                                  <p className="font-medium">{formatCurrency(session.closingCash)}</p>
                                </div>
                              )}
                            </div>
                            {variance !== null && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Variance: </span>
                                  <span className={`font-semibold ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}`}>
                                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                  </span>
                                </p>
                              </div>
                            )}
                            {session.notes && (
                              <p className="mt-2 text-sm text-muted-foreground italic">
                                Note: {session.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Open Session Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent data-testid="dialog-open-session">
          <DialogHeader>
            <DialogTitle>Open Cash Register</DialogTitle>
            <DialogDescription>
              Enter the opening cash balance to start a new session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenSession}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="openingCash">Opening Cash Balance *</Label>
                <Input
                  id="openingCash"
                  type="number"
                  step="0.01"
                  data-testid="input-opening-cash"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the amount of cash in the register at the start of the shift
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                data-testid="button-cancel-open"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={openSessionMutation.isPending} data-testid="button-confirm-open">
                {openSessionMutation.isPending ? "Opening..." : "Open Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent data-testid="dialog-close-session">
          <DialogHeader>
            <DialogTitle>Close Cash Register</DialogTitle>
            <DialogDescription>
              Count the closing cash and record the session ending.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseSession}>
            <div className="space-y-4 py-4">
              {activeSession && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Opening Cash</p>
                  <p className="text-lg font-semibold">{formatCurrency(activeSession.openingCash)}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="closingCash">Closing Cash Count *</Label>
                <Input
                  id="closingCash"
                  type="number"
                  step="0.01"
                  data-testid="input-closing-cash"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Count all cash in the register and enter the total amount
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingNotes">Notes (optional)</Label>
                <Input
                  id="closingNotes"
                  data-testid="input-closing-notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Any notes about this session..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                data-testid="button-cancel-close"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={closeSessionMutation.isPending}
                data-testid="button-confirm-close"
              >
                {closeSessionMutation.isPending ? "Closing..." : "Close Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
