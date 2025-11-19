import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-6">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 19, 2025</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Kebabish Pizza. By accessing and using our website and services, you agree to comply with and be bound by the following terms and conditions. Please review them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Use of Service</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Our online food ordering platform allows you to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Browse our menu and place orders for delivery or pickup</li>
              <li>Track your order status in real-time</li>
              <li>Save your delivery addresses for future orders</li>
              <li>View order history and reorder favorite items</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Order Acceptance</h2>
            <p className="text-muted-foreground leading-relaxed">
              All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including but not limited to product availability, errors in pricing or product information, or problems identified by our credit and fraud detection department.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Pricing and Payment</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              All prices are listed in Pakistani Rupees (PKR) and are subject to change without notice. We accept the following payment methods:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Cash on Delivery (COD)</li>
              <li>JazzCash</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Delivery</h2>
            <p className="text-muted-foreground leading-relaxed">
              Delivery charges are calculated based on distance from the selected branch. We strive to deliver within the estimated time, but actual delivery times may vary due to traffic, weather conditions, or order volume. Delivery is available within designated delivery areas only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Cancellation and Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your order within 5 minutes of placement by contacting the branch directly. Once food preparation has begun, cancellations may not be possible. Refunds, if applicable, will be processed within 7-10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Food Safety and Allergies</h2>
            <p className="text-muted-foreground leading-relaxed">
              While we take precautions to ensure food safety, customers with food allergies should contact our staff directly before placing an order. We cannot guarantee that menu items are completely free from allergens.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility. Please notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Kebabish Pizza shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services or products.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of the service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms & Conditions, please contact us at:
            </p>
            <div className="mt-3 text-muted-foreground space-y-1">
              <p>Email: support@kebabishpizza.com</p>
              <p>Phone: +92-300-1234567</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <Link href="/">
            <Button data-testid="button-back-home-bottom">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
