// Upgrade endpoint. POST to begin a Pro checkout. Dormant (503) until a live
// STRIPE_SECRET_KEY is set — mirrors the AI Sherpa scaffold. When billing goes
// live, create a Stripe Checkout session here and return { url } to redirect to.

import { currentUser } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/pro-data";
import type { PlanInterval } from "@/lib/pro";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { interval?: PlanInterval } | null;
  const interval: PlanInterval = body?.interval === "annual" ? "annual" : "monthly";

  if (!isStripeConfigured) {
    return Response.json(
      { error: "Upward Pro is launching soon — you're on the early list.", soon: true },
      { status: 503 },
    );
  }

  // When STRIPE_SECRET_KEY is present, create a Checkout session for `interval`
  // (raw REST against api.stripe.com or the Stripe SDK) and return its `url`.
  // Stubbed until billing is activated.
  return Response.json({ error: "Checkout isn't wired yet.", interval }, { status: 501 });
}
