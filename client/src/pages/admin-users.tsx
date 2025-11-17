import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import UserRoleTable, { UserData } from "@/components/UserRoleTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

//todo: remove mock functionality
const MOCK_USERS: UserData[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    isActive: true,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "manager",
    isActive: true,
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "staff",
    isActive: true,
  },
  {
    id: "4",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "staff",
    isActive: false,
  },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>(MOCK_USERS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  const handleEdit = (user: UserData) => {
    console.log("Edit user:", user);
    toast({
      title: "Edit user",
      description: `Edit functionality for ${user.name}`,
    });
  };

  const handleDelete = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast({
      title: "User deleted",
      description: "User has been removed from the system",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64">
        <AdminSidebar
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onLogout={() => console.log("Logout")}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader breadcrumbs={["Admin", "Users & Roles"]} userName="Admin User" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Users & Roles</h1>
              <p className="text-muted-foreground">
                Manage user accounts and role assignments
              </p>
            </div>
            <Button onClick={() => console.log("Add user")} data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <UserRoleTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
        </main>
      </div>
    </div>
  );
}
