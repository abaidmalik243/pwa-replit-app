import { Clock, User, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

interface OrderCardProps {
  order: Order;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onMarkReady?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-600",
  preparing: "bg-blue-600",
  ready: "bg-green-600",
  delivered: "bg-gray-600",
  cancelled: "bg-red-600",
};

export default function OrderCard({ order, onAccept, onReject, onMarkReady, onCancel }: OrderCardProps) {
  const elapsedMinutes = Math.floor((new Date().getTime() - order.createdAt.getTime()) / 60000);

  return (
    <Card className="p-6" data-testid={`card-order-${order.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold mb-1" data-testid={`text-order-number-${order.id}`}>
            #{order.orderNumber}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid={`text-elapsed-time-${order.id}`}>{elapsedMinutes} min ago</span>
          </div>
        </div>
        <Badge className={statusColors[order.status]} data-testid={`badge-status-${order.id}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium" data-testid={`text-customer-name-${order.id}`}>{order.customerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm" data-testid={`text-customer-phone-${order.id}`}>{order.customerPhone}</span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm" data-testid={`order-item-${order.id}-${index}`}>
            <span>{item.quantity}x {item.name}</span>
            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between font-semibold text-lg mb-4">
        <span>Total</span>
        <span data-testid={`text-order-total-${order.id}`}>${order.total.toFixed(2)}</span>
      </div>

      <div className="flex gap-2">
        {order.status === "pending" && (
          <>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => onAccept?.(order.id)}
              data-testid={`button-accept-${order.id}`}
            >
              Accept
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => onReject?.(order.id)}
              data-testid={`button-reject-${order.id}`}
            >
              Reject
            </Button>
          </>
        )}
        {order.status === "preparing" && (
          <>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => onMarkReady?.(order.id)}
              data-testid={`button-mark-ready-${order.id}`}
            >
              Mark Ready
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => onCancel?.(order.id)}
              data-testid={`button-cancel-${order.id}`}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
