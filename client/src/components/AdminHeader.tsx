import { Bell, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminHeaderProps {
  breadcrumbs: string[];
  notificationCount?: number;
  userName?: string;
  onMenuToggle?: () => void;
}

export default function AdminHeader({ breadcrumbs, notificationCount = 0, userName = "Admin", onMenuToggle }: AdminHeaderProps) {
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
