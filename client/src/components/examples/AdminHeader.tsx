import AdminHeader from '../AdminHeader';

export default function AdminHeaderExample() {
  return (
    <AdminHeader
      breadcrumbs={['Admin', 'Orders']}
      notificationCount={5}
      userName="John Doe"
    />
  );
}
