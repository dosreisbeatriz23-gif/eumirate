// Edge Function: stripe-webhook
// Recebe eventos do Stripe (assinatura paga, cancelada, etc.) e atualiza
// o status Premium do usuário. A assinatura do webhook é verificada
// criptograficamente — só o Stripe de verdade consegue chamar isso com sucesso.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

Deno.serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey || !webhookSecret) {
    return new Response("Stripe não configurado", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, webhookSecret);
  } catch (err) {
    console.error("Assinatura inválida do webhook:", err);
    return new Response("Assinatura inválida", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              is_premium: true,
              stripe_subscription_id: session.subscription as string,
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const isActive = ["active", "trialing"].includes(subscription.status);
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_premium: isActive })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_premium: false })
            .eq("user_id", userId);
        }
        break;
      }

      default:
        console.log("Evento Stripe ignorado:", event.type);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Erro ao processar evento:", error);
    return new Response(String(error), { status: 500 });
  }
});
