// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

// 🔑 Stripe initialisieren – STRIPE_SECRET_KEY in .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
apiVersion: "2023-10-16" as any,
});

export async function POST(req: NextRequest) {
const signature = req.headers.get("stripe-signature");

if (!signature) {
return NextResponse.json(
{ error: "Missing stripe-signature header" },
{ status: 400 }
);
}

const body = await req.text();
let event: Stripe.Event;

try {
event = stripe.webhooks.constructEvent(
body,
signature,
process.env.STRIPE_WEBHOOK_SECRET as string
);
} catch (err: any) {
console.error("❌ Webhook Error:", err.message);
return NextResponse.json(
{ error: `Webhook Error: ${err.message}` },
{ status: 400 }
);
}

// Kleine Helper-Funktion zum Loggen
const logStripeEvent = async (
eventType: string,
clientEmail: string | null,
status: "active" | "past_due" | "canceled" | null
) => {
try {
await supabase.from("StripeEvents").insert({
event_type: eventType,
client_email: clientEmail ? clientEmail.toLowerCase() : null,
subscription_status: status,
});
} catch (e) {
console.error("Fehler beim Einfügen in StripeEvents:", e);
}
};

// ================================
// EVENTS HANDLING
// ================================
switch (event.type) {
// ✅ Zahlung erfolgreich
case "invoice.payment_succeeded": {
const data = event.data.object as any;
const customerEmail: string | null =
data.customer_email || data.customer?.email || null;

if (customerEmail) {
// 1) Klienten-Status auf "active" setzen
await supabase
.from("Klienten")
.update({ subscription_status: "active" })
.eq("Email", customerEmail.toLowerCase());

// 2) Event loggen
await logStripeEvent("invoice.payment_succeeded", customerEmail, "active");
} else {
await logStripeEvent("invoice.payment_succeeded", null, "active");
}

console.log("✅ Payment succeeded for:", customerEmail);
break;
}

// ⚠️ Zahlung fehlgeschlagen
case "invoice.payment_failed": {
const data = event.data.object as any;
const customerEmail: string | null =
data.customer_email || data.customer?.email || null;

if (customerEmail) {
await supabase
.from("Klienten")
.update({ subscription_status: "past_due" })
.eq("Email", customerEmail.toLowerCase());

await logStripeEvent("invoice.payment_failed", customerEmail, "past_due");
} else {
await logStripeEvent("invoice.payment_failed", null, "past_due");
}

console.log("⚠️ Payment failed for:", customerEmail);
break;
}

// ⛔ Abo gekündigt / ausgelaufen
case "customer.subscription.deleted": {
const data = event.data.object as any;
const customerEmail: string | null =
data.customer_email || data.customer?.email || null;

if (customerEmail) {
await supabase
.from("Klienten")
.update({ subscription_status: "canceled" })
.eq("Email", customerEmail.toLowerCase());

await logStripeEvent(
"customer.subscription.deleted",
customerEmail,
"canceled"
);
} else {
await logStripeEvent("customer.subscription.deleted", null, "canceled");
}

console.log("⛔ Subscription canceled for:", customerEmail);
break;
}

default: {
// Unbekannte Events trotzdem loggen, damit du siehst was reinkommt
await logStripeEvent(event.type, null, null);
console.log("ℹ️ Unhandled Stripe event:", event.type);
}
}

return NextResponse.json({ received: true }, { status: 200 });
}