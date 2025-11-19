import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreVertical, Users, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PosTable } from "@shared/schema";
import { useLocation } from "wouter";

export default function POSTables() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<PosTable | null>(null);
  const [formData, setFormData] = useState({
    tableName: "",
    tableNumber: "",
    capacity: "",
    section: "",
  });

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

  // Fetch tables
  const { data: tables = [] } = useQuery<PosTable[]>({
    queryKey: ["/api/pos/tables", userBranchId],
    queryFn: () => fetch(`/api/pos/tables?branchId=${userBranchId}`).then(res => res.json()),
    enabled: !!userBranchId,
  });

  // Create/update table mutation
  const saveTableMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTable) {
        const response = await fetch(`/api/pos/tables/${editingTable.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update table");
        return response.json();
      } else {
        const response = await fetch("/api/pos/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            branchId: userBranchId,
            status: "available",
          }),
        });
        if (!response.ok) throw new Error("Failed to create table");
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/tables", userBranchId] });
      setShowDialog(false);
      resetForm();
      toast({
        title: editingTable ? "Table updated" : "Table created",
        description: editingTable ? "Table has been updated successfully" : "New table has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save table",
        variant: "destructive",
      });
    },
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const response = await fetch(`/api/pos/tables/${tableId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/tables", userBranchId] });
      toast({
        title: "Table deleted",
        description: "Table has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete table",
        variant: "destructive",
      });
    },
  });

  // Update table status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: string; status: string }) => {
      const response = await fetch(`/api/pos/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/tables", userBranchId] });
      toast({
        title: "Status updated",
        description: "Table status has been updated",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      tableName: "",
      tableNumber: "",
      capacity: "",
      section: "",
    });
    setEditingTable(null);
  };

  const handleEdit = (table: PosTable) => {
    setEditingTable(table);
    setFormData({
      tableName: table.tableName,
      tableNumber: table.tableNumber.toString(),
      capacity: table.capacity.toString(),
      section: table.section || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTableMutation.mutate({
      tableName: formData.tableName,
      tableNumber: parseInt(formData.tableNumber),
      capacity: parseInt(formData.capacity),
      section: formData.section || null,
    });
  };

  const handleCreateOrder = (table: PosTable) => {
    // Navigate to POS main with table pre-selected
    navigate(`/admin/pos?table=${table.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "occupied":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "reserved":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cleaning":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-muted";
    }
  };

  // Group tables by section
  const groupedTables = tables.reduce((acc, table) => {
    const key = table.section || "Main Area";
    if (!acc[key]) acc[key] = [];
    acc[key].push(table);
    return acc;
  }, {} as Record<string, PosTable[]>);

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="lg:hidden">
          <AdminSidebar />
        </div>
      )}

      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader breadcrumbs={["POS", "Tables"]} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="heading-tables">Table Management</h1>
                <p className="text-muted-foreground">Manage restaurant tables and floor plan</p>
              </div>
              <Button onClick={() => setShowDialog(true)} data-testid="button-add-table">
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold" data-testid="stat-available">
                      {tables.filter(t => t.status === "available").length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupied</p>
                    <p className="text-2xl font-bold" data-testid="stat-occupied">
                      {tables.filter(t => t.status === "occupied").length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reserved</p>
                    <p className="text-2xl font-bold" data-testid="stat-reserved">
                      {tables.filter(t => t.status === "reserved").length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tables</p>
                    <p className="text-2xl font-bold" data-testid="stat-total">
                      {tables.length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Table layout grid */}
            {Object.entries(groupedTables).map(([section, sectionTables]) => (
              <div key={section}>
                <h2 className="text-xl font-semibold mb-4">{section}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sectionTables.map((table) => (
                    <Card
                      key={table.id}
                      className={`p-4 hover-elevate cursor-pointer ${getStatusColor(table.status)}`}
                      data-testid={`card-table-${table.id}`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-lg font-bold" data-testid={`text-table-number-${table.id}`}>
                              {table.tableName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <Users className="w-3 h-3 inline mr-1" />
                              {table.capacity} seats
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-6 w-6" data-testid={`button-table-menu-${table.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(table)} data-testid={`menu-edit-${table.id}`}>
                                Edit Table
                              </DropdownMenuItem>
                              {table.status === "available" && (
                                <DropdownMenuItem
                                  onClick={() => handleCreateOrder(table)}
                                  data-testid={`menu-create-order-${table.id}`}
                                >
                                  Create Order
                                </DropdownMenuItem>
                              )}
                              {table.status === "available" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ tableId: table.id, status: "reserved" })}
                                  data-testid={`menu-reserve-${table.id}`}
                                >
                                  Mark as Reserved
                                </DropdownMenuItem>
                              )}
                              {table.status === "occupied" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ tableId: table.id, status: "available" })}
                                  data-testid={`menu-clear-${table.id}`}
                                >
                                  Clear Table
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => deleteTableMutation.mutate(table.id)}
                                className="text-destructive"
                                data-testid={`menu-delete-${table.id}`}
                              >
                                Delete Table
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="mt-auto">
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${table.id}`}>
                            {table.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No tables configured yet</p>
                <Button onClick={() => setShowDialog(true)} data-testid="button-add-first-table">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Table
                </Button>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Add/Edit Table Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent data-testid="dialog-table-form">
          <DialogHeader>
            <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tableName">Table Name *</Label>
                <Input
                  id="tableName"
                  data-testid="input-table-name"
                  value={formData.tableName}
                  onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                  placeholder="e.g., Table 1, VIP-A, Window-3"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tableNumber">Table Number *</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  data-testid="input-table-number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  placeholder="1"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (seats) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  data-testid="input-capacity"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="4"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  data-testid="input-section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="Main Area, Window, Patio, VIP, etc."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDialog(false); resetForm(); }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveTableMutation.isPending} data-testid="button-save-table">
                {saveTableMutation.isPending ? "Saving..." : editingTable ? "Update Table" : "Create Table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
