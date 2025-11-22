import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Calendar, Clock, DollarSign, TrendingUp, Users, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { ShiftAttendance, ShiftAssignment, User, Branch, OvertimeRecord } from "@shared/schema";

export default function AdminShiftReports() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const monthStart = startOfMonth(new Date(selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedMonth));

  // Fetch branches
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch staff users
  const { data: staffUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "staff" || u.role === "admin"),
  });

  // Fetch attendance records for the selected month
  const { data: attendanceRecords = [] } = useQuery<ShiftAttendance[]>({
    queryKey: ["/api/attendance", selectedMonth],
    queryFn: async () => {
      const response = await fetch("/api/attendance");
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const allRecords = await response.json();
      return allRecords.filter((record: ShiftAttendance) => {
        const clockInDate = new Date(record.clockInTime);
        return clockInDate >= monthStart && clockInDate <= monthEnd;
      });
    },
  });

  // Fetch shift assignments
  const { data: assignments = [] } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/shift-assignments", { searchParams: {
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    }}],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      });
      const response = await fetch(`/api/shift-assignments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
  });

  // Fetch overtime records
  const { data: overtimeRecords = [] } = useQuery<OvertimeRecord[]>({
    queryKey: ["/api/overtime", { searchParams: {
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    }}],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
      });
      const response = await fetch(`/api/overtime?${params}`);
      if (!response.ok) throw new Error("Failed to fetch overtime");
      return response.json();
    },
  });

  // Calculate metrics
  const totalShiftsScheduled = assignments.length;
  const completedShifts = assignments.filter(a => a.status === "completed").length;
  const totalHoursWorked = attendanceRecords.reduce((sum, record) => {
    return sum + (record.totalMinutesWorked || 0);
  }, 0) / 60;
  const totalOvertimeHours = attendanceRecords.reduce((sum, record) => {
    return sum + (record.overtimeMinutes || 0);
  }, 0) / 60;
  const completionRate = totalShiftsScheduled > 0 ? (completedShifts / totalShiftsScheduled) * 100 : 0;

  // Staff performance data
  const staffPerformance = staffUsers.map(staff => {
    const staffAttendance = attendanceRecords.filter(a => a.userId === staff.id);
    const staffAssignments = assignments.filter(a => a.userId === staff.id);
    const staffOvertime = overtimeRecords.filter(o => o.userId === staff.id);

    const totalMinutes = staffAttendance.reduce((sum, a) => sum + (a.totalMinutesWorked || 0), 0);
    const overtimeMinutes = staffAttendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
    const completedCount = staffAssignments.filter(a => a.status === "completed").length;

    return {
      userId: staff.id,
      name: `${staff.firstName} ${staff.lastName}`,
      totalShifts: staffAssignments.length,
      completedShifts: completedCount,
      totalHours: totalMinutes / 60,
      overtimeHours: overtimeMinutes / 60,
      attendanceRate: staffAssignments.length > 0 ? (completedCount / staffAssignments.length) * 100 : 0,
    };
  }).filter(p => p.totalShifts > 0).sort((a, b) => b.totalHours - a.totalHours);

  // Generate month options for last 6 months
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  return (
    <div className="flex h-screen w-full">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          user={user}
          logout={logout}
        />

        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">Shift Reports</h1>
                <p className="text-muted-foreground">Performance analytics and metrics</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
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
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48" data-testid="select-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Overview Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-shifts">{totalShiftsScheduled}</div>
                  <p className="text-xs text-muted-foreground">
                    {completedShifts} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-hours">{totalHoursWorked.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">
                    {totalOvertimeHours.toFixed(1)}h overtime
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-completion-rate">{completionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {completedShifts} of {totalShiftsScheduled} shifts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-staff">{staffPerformance.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Staff members with shifts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Staff Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
                <CardDescription>Individual staff metrics for {format(monthStart, "MMMM yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                {staffPerformance.length > 0 ? (
                  <div className="space-y-2">
                    {staffPerformance.map((staff, index) => (
                      <div
                        key={staff.userId}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`card-staff-performance-${staff.userId}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                            <span className="font-medium">#{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-medium">{staff.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {staff.totalShifts} shifts assigned
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm font-medium">{staff.totalHours.toFixed(1)}h</div>
                            <div className="text-xs text-muted-foreground">Total Hours</div>
                          </div>
                          {staff.overtimeHours > 0 && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-orange-600">
                                +{staff.overtimeHours.toFixed(1)}h
                              </div>
                              <div className="text-xs text-muted-foreground">Overtime</div>
                            </div>
                          )}
                          <div className="text-right">
                            <div className="text-sm font-medium">{staff.attendanceRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Completion</div>
                          </div>
                          <Badge variant={staff.attendanceRate >= 90 ? "default" : staff.attendanceRate >= 70 ? "secondary" : "destructive"}>
                            {staff.attendanceRate >= 90 ? "Excellent" : staff.attendanceRate >= 70 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No staff performance data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overtime Summary */}
            {overtimeRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Overtime Summary</CardTitle>
                  <CardDescription>Unpaid overtime hours for {format(monthStart, "MMMM yyyy")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overtimeRecords.filter(o => !o.isPaid).map((record) => {
                      const staff = staffUsers.find(u => u.id === record.userId);
                      const overtimeHours = parseFloat(record.overtimeHours);
                      const multiplier = parseFloat(record.multiplier);
                      
                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`card-overtime-${record.id}`}
                        >
                          <div>
                            <div className="font-medium">
                              {staff ? `${staff.firstName} ${staff.lastName}` : "Unknown Staff"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(record.calculationDate), "MMM d, yyyy")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-medium text-orange-600">
                              {overtimeHours.toFixed(1)}h @ {multiplier}x
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.overtimeMinutes} minutes overtime
                            </div>
                            <Badge variant="secondary" className="mt-1">
                              {record.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
