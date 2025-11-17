import UserRoleTable, { UserData } from '../UserRoleTable';

export default function UserRoleTableExample() {
  const users: UserData[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', isActive: true },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', isActive: true },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'staff', isActive: false },
  ];

  return (
    <div className="w-full p-6">
      <UserRoleTable
        users={users}
        onEdit={(user) => console.log('Edit user:', user)}
        onDelete={(id) => console.log('Delete user:', id)}
      />
    </div>
  );
}
