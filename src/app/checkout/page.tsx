
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export default function CheckoutPage() {

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
            <Card className="bg-transparent border-0 shadow-none">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Checkout</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">Complete your purchase below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CheckoutFlow />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
