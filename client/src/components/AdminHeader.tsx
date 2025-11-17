import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminHeaderProps {
  breadcrumbs: string[];
  notificationCount?: number;
  userName?: string;
}

export default function AdminHeader({ breadcrumbs, notificationCount = 0, userName = "Admin" }: AdminHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
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

        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                data-testid="badge-notification-count"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback data-testid="avatar-user">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium" data-testid="text-user-name">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
