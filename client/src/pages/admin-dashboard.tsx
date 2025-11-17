import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import OrderCard, { Order } from "@/components/OrderCard";
import { useToast } from "@/hooks/use-toast";

//todo: remove mock functionality
const MOCK_ORDERS: Order[] = [
  {
    id: "1",
    orderNumber: "1234",
    customerName: "John Doe",
    customerPhone: "+1 (555) 123-4567",
    items: [
      { name: "Gourmet Burger", quantity: 2, price: 12.99 },
      { name: "Crispy Fries", quantity: 1, price: 4.99 },
    ],
    total: 30.97,
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: "2",
    orderNumber: "1235",
    customerName: "Jane Smith",
    customerPhone: "+1 (555) 234-5678",
    items: [
      { name: "Pepperoni Pizza", quantity: 1, price: 14.99 },
      { name: "Iced Lemonade", quantity: 2, price: 3.99 },
    ],
    total: 22.97,
    status: "preparing",
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "3",
    orderNumber: "1236",
    customerName: "Bob Wilson",
    customerPhone: "+1 (555) 345-6789",
    items: [
      { name: "Caesar Salad", quantity: 1, price: 10.99 },
      { name: "Chocolate Lava Cake", quantity: 1, price: 7.99 },
    ],
    total: 18.98,
    status: "ready",
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  const handleAccept = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: "preparing" as const } : order
      )
    );
    toast({
      title: "Order accepted",
      description: "Order has been moved to preparing status",
    });
  };

  const handleReject = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: "cancelled" as const } : order
      )
    );
    toast({
      title: "Order rejected",
      description: "Order has been cancelled",
      variant: "destructive",
    });
  };

  const handleMarkReady = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: "ready" as const } : order
      )
    );
    toast({
      title: "Order ready",
      description: "Order is ready for pickup",
    });
  };

  const handleCancel = (id: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: "cancelled" as const } : order
      )
    );
    toast({
      title: "Order cancelled",
      description: "Order has been cancelled",
      variant: "destructive",
    });
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

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
        <AdminHeader
          breadcrumbs={["Admin", "Dashboard"]}
          notificationCount={pendingOrders.length}
          userName="Admin User"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Order Dashboard</h1>
            <p className="text-muted-foreground">
              Manage incoming orders and update their status
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                New Orders
                {pendingOrders.length > 0 && (
                  <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
                    {pendingOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
                {pendingOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No pending orders</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                In Progress
                {preparingOrders.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {preparingOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkReady={handleMarkReady}
                    onCancel={handleCancel}
                  />
                ))}
                {preparingOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No orders in progress</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                Ready for Pickup
                {readyOrders.length > 0 && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {readyOrders.length}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {readyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
                {readyOrders.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No orders ready</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
