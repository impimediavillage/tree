import { Card, CardContent } from "@/components/ui/card";
import { Order } from "@/types/order";
import { CheckCircle2, Circle, Clock, Package, ShoppingCart, Truck } from "lucide-react";

interface OrderTimelineProps {
  order: Order;
}

interface TimelineStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "upcoming";
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const getOrderTimeline = (status: string): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        title: "Order Placed",
        description: `Order #${order.orderNumber} has been placed`,
        icon: <ShoppingCart className="h-6 w-6" />,
        status: "completed"
      },
      {
        title: "Processing",
        description: "Order is being processed",
        icon: <Package className="h-6 w-6" />,
        status: "upcoming"
      },
      {
        title: "Shipped",
        description: "Order has been shipped",
        icon: <Truck className="h-6 w-6" />,
        status: "upcoming"
      },
      {
        title: "Delivered",
        description: "Order has been delivered",
        icon: <CheckCircle2 className="h-6 w-6" />,
        status: "upcoming"
      }
    ];

    const statusIndex = {
      pending: 0,
      processing: 1,
      shipped: 2,
      delivered: 3,
      cancelled: -1
    }[status] || 0;

    return steps.map((step, index) => ({
      ...step,
      status: index < statusIndex ? "completed" : 
              index === statusIndex ? "current" : 
              "upcoming"
    }));
  };

  const timeline = getOrderTimeline(order.status);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-8">
          {timeline.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={
                  step.status === "completed" ? "text-green-500" :
                  step.status === "current" ? "text-blue-500" :
                  "text-gray-300"
                }>
                  {step.icon}
                </div>
                {index !== timeline.length - 1 && (
                  <div className={`h-16 w-px my-2 ${
                    step.status === "completed" ? "bg-green-500" :
                    step.status === "current" ? "bg-blue-500" :
                    "bg-gray-200"
                  }`} />
                )}
              </div>
              <div className="flex-1 pt-1">
                <h4 className="font-medium mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.status === "current" && (
                  <div className="flex items-center gap-2 text-sm text-blue-500 mt-2">
                    <Clock className="h-4 w-4" />
                    <span>In Progress</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}