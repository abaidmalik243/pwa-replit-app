import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Calendar, Clock, Users, Edit, Trash2, Plus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import type { StaffShift, ShiftAssignment, User, Branch } from "@shared/schema";

// Shift template schema
const shiftSchema = z.object({
  shiftName: z.string().min(1, "Shift name is required"),
  branchId: z.string().min(1, "Branch is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  durationMinutes: z.number().min(1, "Duration is required"),
  breakDurationMinutes: z.number().optional().default(0),
  overtimeMultiplier: z.string().optional().default("1.5"),
  isActive: z.boolean().default(true),
});

// Shift assignment schema
const assignmentSchema = z.object({
  shiftId: z.string().min(1, "Shift template is required"),
  userId: z.string().min(1, "Staff member is required"),
  assignmentDate: z.string().min(1, "Assignment date is required"),
  startDateTime: z.string().min(1, "Start date/time is required"),
  endDateTime: z.string().min(1, "End date/time is required"),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;
type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function AdminShifts() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<StaffShift | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date()));
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");

  // Fetch all branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch all shifts
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<StaffShift[]>({
    queryKey: ["/api/shifts"],
  });

  // Fetch staff users
  const { data: staffUsers = [], isLoading: staffLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "staff" || u.role === "admin"),
  });

  // Fetch shift assignments for the selected week
  const weekEnd = endOfWeek(selectedWeekStart);
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/shift-assignments", { searchParams: { 
      startDate: selectedWeekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      branchId: selectedBranchFilter === "all" ? undefined : selectedBranchFilter,
    }}],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: selectedWeekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      if (selectedBranchFilter !== "all") {
        params.append("branchId", selectedBranchFilter);
      }
      const response = await fetch(`/api/shift-assignments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
  });

  const shiftForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      shiftName: "",
      branchId: user?.branchId || "",
      startTime: "09:00",
      endTime: "17:00",
      durationMinutes: 480,
      breakDurationMinutes: 60,
      overtimeMultiplier: "1.5",
      isActive: true,
    },
  });

  const assignmentForm = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      shiftId: "",
      userId: "",
      assignmentDate: format(new Date(), "yyyy-MM-dd"),
      startDateTime: "",
      endDateTime: "",
      notes: "",
    },
  });

  // Mutation to create/update shift template
  const shiftMutation = useMutation({
    mutationFn: (data: any) =>
      selectedShift
        ? apiRequest(`/api/shifts/${selectedShift.id}`, "PUT", data)
        : apiRequest("/api/shifts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ 
        title: "Success", 
        description: selectedShift ? "Shift updated successfully" : "Shift created successfully" 
      });
      setShiftDialogOpen(false);
      setSelectedShift(null);
      shiftForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to delete shift
  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/shifts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "Success", description: "Shift deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to create/update shift assignment
  const assignmentMutation = useMutation({
    mutationFn: (data: any) =>
      selectedAssignment
        ? apiRequest(`/api/shift-assignments/${selectedAssignment.id}`, "PUT", data)
        : apiRequest("/api/shift-assignments", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-assignments"] });
      toast({ 
        title: "Success", 
        description: selectedAssignment ? "Assignment updated successfully" : "Shift assigned successfully" 
      });
      setAssignmentDialogOpen(false);
      setSelectedAssignment(null);
      assignmentForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/shift-assignments/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-assignments"] });
      toast({ title: "Success", description: "Assignment deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditShift = (shift: StaffShift) => {
    setSelectedShift(shift);
    shiftForm.reset({
      shiftName: shift.shiftName,
      branchId: shift.branchId,
      startTime: shift.startTime,
      endTime: shift.endTime,
      durationMinutes: shift.durationMinutes,
      breakDurationMinutes: shift.breakDurationMinutes || 0,
      overtimeMultiplier: shift.overtimeMultiplier || "1.5",
      isActive: shift.isActive ?? true,
    });
    setShiftDialogOpen(true);
  };

  const handleCreateAssignment = () => {
    setSelectedAssignment(null);
    assignmentForm.reset({
      shiftId: "",
      userId: "",
      assignmentDate: format(new Date(), "yyyy-MM-dd"),
      startDateTime: "",
      endDateTime: "",
      notes: "",
    });
    setAssignmentDialogOpen(true);
  };

  const handleEditAssignment = (assignment: ShiftAssignment) => {
    setSelectedAssignment(assignment);
    assignmentForm.reset({
      shiftId: assignment.shiftId,
      userId: assignment.userId,
      assignmentDate: format(new Date(assignment.assignmentDate), "yyyy-MM-dd"),
      startDateTime: format(new Date(assignment.startDateTime), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(new Date(assignment.endDateTime), "yyyy-MM-dd'T'HH:mm"),
      notes: assignment.notes || "",
    });
    setAssignmentDialogOpen(true);
  };

  const onShiftSubmit = (data: ShiftFormData) => {
    shiftMutation.mutate(data);
  };

  const onAssignmentSubmit = (data: AssignmentFormData) => {
    assignmentMutation.mutate(data);
  };

  // Generate week days for calendar view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));

  // Get branch name by ID
  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || "Unknown";
  };

  // Get shift name by ID
  const getShiftName = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId)?.shiftName || "Unknown";
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = staffUsers.find(u => u.id === userId);
    return user?.fullName || user?.username || "Unknown";
  };

  // Get assignments for a specific day
  const getAssignmentsForDay = (date: Date) => {
    return assignments.filter(a => {
      const assignmentDate = new Date(a.assignmentDate);
      return format(assignmentDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  // Filter shifts by selected branch
  const filteredShifts = selectedBranchFilter === "all" 
    ? shifts 
    : shifts.filter(s => s.branchId === selectedBranchFilter);

  const isLoading = branchesLoading || shiftsLoading || staffLoading || assignmentsLoading;

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebar onLogout={logout} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Admin", "Shift Management"]}
          notificationCount={0}
          userName={user?.username || "Admin User"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Staff Shift Management</h1>
                <p className="text-muted-foreground">Schedule shifts and manage staff assignments</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                  <SelectTrigger className="w-48" data-testid="select-branch-filter">
                    <SelectValue placeholder="Filter by branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="calendar" className="space-y-4">
              <TabsList>
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar View
                </TabsTrigger>
                <TabsTrigger value="shifts" data-testid="tab-shifts">
                  <Clock className="h-4 w-4 mr-2" />
                  Shift Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <CardTitle>Weekly Schedule</CardTitle>
                        <CardDescription>
                          {format(selectedWeekStart, "MMM d, yyyy")} - {format(weekEnd, "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}
                          data-testid="button-prev-week"
                        >
                          Previous Week
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedWeekStart(startOfWeek(new Date()))}
                          data-testid="button-current-week"
                        >
                          Current Week
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}
                          data-testid="button-next-week"
                        >
                          Next Week
                        </Button>
                        <Button onClick={handleCreateAssignment} data-testid="button-assign-shift">
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Shift
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day, index) => (
                        <div key={index} className="border rounded-lg p-2 min-h-48">
                          <div className="font-medium text-sm mb-2">
                            {format(day, "EEE, MMM d")}
                          </div>
                          <div className="space-y-1">
                            {getAssignmentsForDay(day).map((assignment) => {
                              const shift = shifts.find(s => s.id === assignment.shiftId);
                              return (
                                <div
                                  key={assignment.id}
                                  className="text-xs p-2 rounded hover-elevate cursor-pointer bg-primary/10 border border-primary/20"
                                  onClick={() => handleEditAssignment(assignment)}
                                  data-testid={`card-assignment-${assignment.id}`}
                                >
                                  <div className="font-medium truncate">{getUserName(assignment.userId)}</div>
                                  <div className="text-muted-foreground truncate">{shift?.shiftName}</div>
                                  <div className="text-muted-foreground">{shift?.startTime} - {shift?.endTime}</div>
                                  <Badge 
                                    variant={
                                      assignment.status === "completed" ? "default" :
                                      assignment.status === "in_progress" ? "secondary" :
                                      assignment.status === "cancelled" ? "destructive" :
                                      "outline"
                                    }
                                    className="mt-1"
                                  >
                                    {assignment.status}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shifts" className="space-y-4">
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      setSelectedShift(null);
                      shiftForm.reset();
                      setShiftDialogOpen(true);
                    }}
                    data-testid="button-create-shift"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shift Template
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredShifts.map((shift) => (
                    <Card key={shift.id} data-testid={`card-shift-${shift.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{shift.shiftName}</CardTitle>
                            <CardDescription>{getBranchName(shift.branchId)}</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditShift(shift)}
                              data-testid={`button-edit-shift-${shift.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteShiftMutation.mutate(shift.id)}
                              data-testid={`button-delete-shift-${shift.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">{shift.startTime} - {shift.endTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{shift.durationMinutes} min</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Break:</span>
                          <span className="font-medium">{shift.breakDurationMinutes || 0} min</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">OT Multiplier:</span>
                          <span className="font-medium">{shift.overtimeMultiplier || "1.5"}x</span>
                        </div>
                        <Badge variant={shift.isActive ? "default" : "secondary"}>
                          {shift.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Shift Template Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent data-testid="dialog-shift-form">
          <DialogHeader>
            <DialogTitle>{selectedShift ? "Edit Shift Template" : "Create Shift Template"}</DialogTitle>
            <DialogDescription>
              {selectedShift ? "Update the shift template details" : "Create a new shift template"}
            </DialogDescription>
          </DialogHeader>
          <Form {...shiftForm}>
            <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-4">
              <FormField
                control={shiftForm.control}
                name="shiftName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Morning Shift" data-testid="input-shift-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shiftForm.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shift-branch">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={shiftForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shiftForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={shiftForm.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shiftForm.control}
                  name="breakDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break (minutes)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" data-testid="input-break-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={shiftForm.control}
                name="overtimeMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime Multiplier</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.1" placeholder="1.5" data-testid="input-overtime-multiplier" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShiftDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={shiftMutation.isPending} data-testid="button-submit-shift">
                  {shiftMutation.isPending ? "Saving..." : selectedShift ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shift Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent data-testid="dialog-assignment-form">
          <DialogHeader>
            <DialogTitle>{selectedAssignment ? "Edit Shift Assignment" : "Assign Shift"}</DialogTitle>
            <DialogDescription>
              {selectedAssignment ? "Update the shift assignment" : "Assign a shift to a staff member"}
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="shiftId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Template</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-shift">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shifts.map(shift => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {shift.shiftName} ({shift.startTime} - {shift.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-user">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="assignmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-assignment-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-start-datetime" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assignmentForm.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="datetime-local" data-testid="input-end-datetime" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={assignmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add any notes..." data-testid="input-assignment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={assignmentMutation.isPending} data-testid="button-submit-assignment">
                  {assignmentMutation.isPending ? "Saving..." : selectedAssignment ? "Update" : "Assign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
