import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    customerEmail: string;
    orderId: string;
    orderNumber: string;
    description?: string;
  }) {
    const stripe = await getUncachableStripeClient();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency || 'pkr',
      receipt_email: params.customerEmail,
      description: params.description || `Order ${params.orderNumber} - Kebabish Pizza`,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  }

  async createRefund(params: {
    paymentIntentId: string;
    amount: number;
    reason?: string;
  }) {
    const stripe = await getUncachableStripeClient();
    
    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: Math.round(params.amount * 100),
      reason: params.reason as any,
    });

    return refund;
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async confirmPayment(paymentIntentId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.paymentIntents.confirm(paymentIntentId);
  }
}

export const stripeService = new StripeService();
