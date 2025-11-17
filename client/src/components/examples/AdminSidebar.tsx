import { useState } from 'react';
import AdminSidebar from '../AdminSidebar';

export default function AdminSidebarExample() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div className="h-screen w-64">
      <AdminSidebar
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onLogout={() => console.log('Logout clicked')}
      />
    </div>
  );
}
