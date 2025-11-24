import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { Clock, MapPin, Calendar, CheckCircle, XCircle, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { format, differenceInMinutes } from "date-fns";
import type { ShiftAttendance, ShiftAssignment, StaffShift } from "@shared/schema";

export default function StaffAttendance() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [clockInDialogOpen, setClockInDialogOpen] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ShiftAssignment | null>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({ 
            title: "Location Error", 
            description: "Unable to get your current location. GPS features may not work.",
            variant: "destructive"
          });
        }
      );
    }
  }, []);

  // Fetch active attendance for current user
  const { data: activeAttendance, isLoading: activeLoading } = useQuery<ShiftAttendance | null>({
    queryKey: ["/api/attendance/active", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/active?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch active attendance");
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch all attendance records for current user
  const { data: attendanceRecords = [], isLoading: recordsLoading } = useQuery<ShiftAttendance[]>({
    queryKey: ["/api/attendance", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Fetch today's shift assignments for current user
  const { data: todaysAssignments = [] } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/shift-assignments", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/shift-assignments?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch shift assignments");
      const allAssignments = await response.json();
      const today = format(new Date(), "yyyy-MM-dd");
      return allAssignments.filter((a: ShiftAssignment) => 
        format(new Date(a.assignmentDate), "yyyy-MM-dd") === today
      );
    },
    enabled: !!user?.id,
  });

  // Fetch shift details
  const { data: shifts = [] } = useQuery<StaffShift[]>({
    queryKey: ["/api/shifts"],
  });

  // Clock In mutation
  const clockInMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      apiRequest("/api/attendance/clock-in", "POST", {
        assignmentId,
        clockInLatitude: currentLocation?.latitude,
        clockInLongitude: currentLocation?.longitude,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-assignments"] });
      toast({ title: "Success", description: "Clocked in successfully" });
      setClockInDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Clock Out mutation
  const clockOutMutation = useMutation({
    mutationFn: () => {
      if (!activeAttendance) throw new Error("No active attendance found");
      return apiRequest(`/api/attendance/clock-out/${activeAttendance.id}`, "POST", {
        clockOutLatitude: currentLocation?.latitude,
        clockOutLongitude: currentLocation?.longitude,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-assignments"] });
      toast({ title: "Success", description: "Clocked out successfully" });
      setClockOutDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleClockIn = (assignment: ShiftAssignment) => {
    setSelectedAssignment(assignment);
    setClockInDialogOpen(true);
  };

  const handleClockOut = () => {
    setClockOutDialogOpen(true);
  };

  const confirmClockIn = () => {
    if (selectedAssignment) {
      clockInMutation.mutate(selectedAssignment.id);
    }
  };

  const confirmClockOut = () => {
    clockOutMutation.mutate();
  };

  const getShiftName = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId)?.shiftName || "Unknown Shift";
  };

  const calculateElapsedTime = () => {
    if (!activeAttendance) return "00:00:00";
    const minutes = differenceInMinutes(currentTime, new Date(activeAttendance.clockInTime));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = Math.floor((currentTime.getTime() - new Date(activeAttendance.clockInTime).getTime()) / 1000) % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLoading = activeLoading || recordsLoading;

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
          onLogout={logout}
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          breadcrumbs={["Staff", "Attendance Tracking"]}
          notificationCount={0}
          userName={user?.username || "Staff User"}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-6xl mx-auto space-y-4">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Attendance Tracking</h1>
              <p className="text-muted-foreground">Clock in and out of your shifts</p>
            </div>

            {/* Current Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
                <CardDescription>
                  {format(currentTime, "EEEE, MMMM d, yyyy - h:mm:ss a")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : activeAttendance ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Currently Clocked In</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Clocked in at {format(new Date(activeAttendance.clockInTime), "h:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold font-mono" data-testid="text-elapsed-time">
                          {calculateElapsedTime()}
                        </div>
                        <p className="text-sm text-muted-foreground">Elapsed Time</p>
                      </div>
                    </div>

                    {currentLocation && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Location: {currentLocation.latitude}, {currentLocation.longitude}</span>
                      </div>
                    )}

                    <Button 
                      variant="destructive" 
                      onClick={handleClockOut}
                      size="lg"
                      className="w-full"
                      data-testid="button-clock-out"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Not Currently Clocked In</p>
                      <p className="text-sm text-muted-foreground">Select a shift below to clock in</p>
                    </div>

                    {currentLocation && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                        <MapPin className="h-4 w-4" />
                        <span>Current Location: {currentLocation.latitude}, {currentLocation.longitude}</span>
                      </div>
                    )}

                    {todaysAssignments.length > 0 ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">Today's Shifts</h3>
                        {todaysAssignments.map((assignment) => {
                          const shift = shifts.find(s => s.id === assignment.shiftId);
                          const hasAttendance = attendanceRecords.some(
                            a => a.assignmentId === assignment.id
                          );

                          return (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                              data-testid={`card-shift-assignment-${assignment.id}`}
                            >
                              <div className="space-y-1">
                                <div className="font-medium">{getShiftName(assignment.shiftId)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {shift?.startTime} - {shift?.endTime}
                                </div>
                                <Badge variant={
                                  assignment.status === "completed" ? "default" :
                                  assignment.status === "in_progress" ? "secondary" :
                                  "outline"
                                }>
                                  {assignment.status}
                                </Badge>
                              </div>
                              {!hasAttendance && assignment.status === "scheduled" && (
                                <Button 
                                  onClick={() => handleClockIn(assignment)}
                                  data-testid={`button-clock-in-${assignment.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Clock In
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No shifts assigned for today
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>Your recent clock in/out records</CardDescription>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : attendanceRecords.length > 0 ? (
                  <div className="space-y-2">
                    {attendanceRecords.slice(0, 10).map((record) => {
                      const shift = shifts.find(s => 
                        todaysAssignments.find(a => a.id === record.assignmentId)?.shiftId === s.id
                      );

                      return (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`card-attendance-${record.id}`}
                        >
                          <div className="space-y-1">
                            <div className="font-medium">
                              {shift ? shift.shiftName : "Unknown Shift"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(record.clockInTime), "MMM d, yyyy - h:mm a")}
                              {record.clockOutTime && (
                                <> to {format(new Date(record.clockOutTime), "h:mm a")}</>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {record.clockInLatitude && record.clockInLongitude && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  In: {record.clockInLatitude}, {record.clockInLongitude}
                                </div>
                              )}
                              {record.clockOutLatitude && record.clockOutLongitude && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Out: {record.clockOutLatitude}, {record.clockOutLongitude}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={record.status === "clocked_out" ? "default" : "secondary"}>
                              {record.status}
                            </Badge>
                            {record.totalMinutesWorked !== null && (
                              <div className="text-sm">
                                <div className="font-medium">
                                  {Math.floor(record.totalMinutesWorked / 60)}h {record.totalMinutesWorked % 60}m
                                </div>
                                <div className="text-xs text-muted-foreground">Total Time</div>
                              </div>
                            )}
                            {record.overtimeMinutes !== null && record.overtimeMinutes > 0 && (
                              <div className="text-xs text-orange-600">
                                +{record.overtimeMinutes}m OT
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Clock In Confirmation Dialog */}
      <Dialog open={clockInDialogOpen} onOpenChange={setClockInDialogOpen}>
        <DialogContent data-testid="dialog-clock-in">
          <DialogHeader>
            <DialogTitle>Confirm Clock In</DialogTitle>
            <DialogDescription>
              Are you sure you want to clock in for this shift?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedAssignment && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Shift:</span>
                  <span className="font-medium">{getShiftName(selectedAssignment.shiftId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="font-medium">{format(currentTime, "h:mm a")}</span>
                </div>
                {currentLocation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="text-sm font-mono">
                      {currentLocation.latitude}, {currentLocation.longitude}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockInDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmClockIn} 
              disabled={clockInMutation.isPending}
              data-testid="button-confirm-clock-in"
            >
              {clockInMutation.isPending ? "Clocking In..." : "Confirm Clock In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clock Out Confirmation Dialog */}
      <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
        <DialogContent data-testid="dialog-clock-out">
          <DialogHeader>
            <DialogTitle>Confirm Clock Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to clock out?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {activeAttendance && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Clocked in at:</span>
                  <span className="font-medium">
                    {format(new Date(activeAttendance.clockInTime), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Clocking out at:</span>
                  <span className="font-medium">{format(currentTime, "h:mm a")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total time:</span>
                  <span className="font-medium text-lg">{calculateElapsedTime()}</span>
                </div>
                {currentLocation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="text-sm font-mono">
                      {currentLocation.latitude}, {currentLocation.longitude}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmClockOut} 
              disabled={clockOutMutation.isPending}
              data-testid="button-confirm-clock-out"
            >
              {clockOutMutation.isPending ? "Clocking Out..." : "Confirm Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
