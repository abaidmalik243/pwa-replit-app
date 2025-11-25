import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 19, 2025</p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Kebabish Pizza ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our online food ordering platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We collect the following types of information:
            </p>
            
            <h3 className="text-xl font-medium mt-4 mb-2">Personal Information:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Name, email address, and phone number</li>
              <li>Delivery address and location data</li>
              <li>Payment information (processed securely)</li>
              <li>Order history and preferences</li>
            </ul>

            <h3 className="text-xl font-medium mt-4 mb-2">Automatically Collected Information:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Browser type and device information</li>
              <li>IP address and location data</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Process and fulfill your orders</li>
              <li>Communicate order status and updates</li>
              <li>Provide customer support</li>
              <li>Improve our services and user experience</li>
              <li>Send promotional offers (with your consent)</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Service Providers:</strong> Third-party vendors who help us operate our business (payment processors, delivery partners)</li>
              <li><strong>Legal Compliance:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li>Encryption of sensitive data (passwords, payment information)</li>
              <li>Secure HTTPS connections</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and remember your preferences. You can control cookie settings through your browser, but some features may not function properly if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent at any time</li>
              <li>Request a copy of your data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Order history may be retained for accounting and legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Changes to Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-3 text-muted-foreground space-y-1">
              <p>Email: privacy@kebabishpizza.com</p>
              <p>Phone: +92-300-1234567</p>
              <p>Address: Main Bazaar, Okara, Pakistan</p>
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
