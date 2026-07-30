import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { sendPaymentFailedNotice } from "@/lib/email/transactional-notification-jobs";
import {
  handleStripeCheckoutCompleted,
  handleStripeSubscriptionDeleted,
  handleStripeSubscriptionUpdated,
} from "@/lib/billing/stripe-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("[stripe-webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleStripeCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleStripeSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleStripeSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
        }).subscription;
        await sendPaymentFailedNotice({
          invoiceId: invoice.id,
          customerId:
            typeof invoice.customer === "string" ? invoice.customer : null,
          subscriptionId:
            typeof subscription === "string" ? subscription : subscription?.id ?? null,
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe-webhook] handler failed:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
