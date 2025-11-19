import { Bell, User, Menu, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@shared/schema";

interface AdminHeaderProps {
  breadcrumbs: string[];
  notificationCount?: number;
  userName?: string;
  onMenuToggle?: () => void;
}

export default function AdminHeader({ breadcrumbs, notificationCount = 0, userName = "Admin", onMenuToggle }: AdminHeaderProps) {
  const { toast } = useToast();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Get user from localStorage
  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  const isAdmin = user.role === "admin";

  // Fetch all branches for admin users
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin,
  });

  // Initialize selected branch from user data
  useEffect(() => {
    if (user.branchId) {
      setSelectedBranchId(user.branchId);
    }
  }, [user.branchId]);

  // Handle branch change
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    
    // Update user in localStorage
    const updatedUser = { ...user, branchId };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    
    // Show toast
    const branch = branches.find(b => b.id === branchId);
    toast({
      title: "Branch switched",
      description: `Now viewing: ${branch?.name || "Unknown Branch"}`,
    });

    // Reload page to refresh all data
    window.location.reload();
  };

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          {onMenuToggle && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="md:hidden" 
              onClick={onMenuToggle}
              data-testid="button-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <nav className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1 md:gap-2">
                {index > 0 && <span className="text-muted-foreground">/</span>}
                <span 
                  className={index === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"}
                  data-testid={`breadcrumb-${index}`}
                >
                  {crumb}
                </span>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Branch Switcher - Only for Admins */}
          {isAdmin && branches.length > 0 && (
            <Select value={selectedBranchId} onValueChange={handleBranchChange}>
              <SelectTrigger 
                className="w-[180px] md:w-[220px] h-9"
                data-testid="select-branch"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select branch" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.filter(b => b.isActive).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full p-0 flex items-center justify-center text-[10px] md:text-xs"
                data-testid="badge-notification-count"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 md:gap-3">
            <Avatar className="h-7 w-7 md:h-9 md:w-9">
              <AvatarFallback data-testid="avatar-user">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm md:text-base hidden sm:inline" data-testid="text-user-name">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
