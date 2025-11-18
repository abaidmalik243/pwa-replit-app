import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type UserRole = "admin" | "manager" | "staff";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface UserRoleTableProps {
  users: UserData[];
  onEdit?: (user: UserData) => void;
  onDelete?: (userId: string) => void;
}

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-600",
  manager: "bg-blue-600",
  staff: "bg-green-600",
};

export default function UserRoleTable({ users, onEdit, onDelete }: UserRoleTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium" data-testid={`text-user-name-${user.id}`}>
                    {user.name}
                  </span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-user-email-${user.id}`}>
                {user.email}
              </TableCell>
              <TableCell>
                <Badge className={roleColors[user.role]} data-testid={`badge-role-${user.id}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "secondary"} data-testid={`badge-status-${user.id}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => onEdit?.(user)}
                    data-testid={`button-edit-${user.id}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete?.(user.id)}
                    data-testid={`button-delete-${user.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
