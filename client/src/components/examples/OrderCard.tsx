import OrderCard from '../OrderCard';

export default function OrderCardExample() {
  const order = {
    id: '1',
    orderNumber: '1234',
    customerName: 'John Doe',
    customerPhone: '+1 (555) 123-4567',
    items: [
      { name: 'Gourmet Burger', quantity: 2, price: 12.99 },
      { name: 'French Fries', quantity: 1, price: 4.99 }
    ],
    total: 30.97,
    status: 'pending' as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000)
  };

  return (
    <div className="w-full max-w-md">
      <OrderCard
        order={order}
        onAccept={(id) => console.log('Accept order:', id)}
        onReject={(id) => console.log('Reject order:', id)}
        onMarkReady={(id) => console.log('Mark ready:', id)}
        onCancel={(id) => console.log('Cancel order:', id)}
      />
    </div>
  );
}
