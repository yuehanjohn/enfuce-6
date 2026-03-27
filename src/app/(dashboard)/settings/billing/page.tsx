"use client";

import { useState, useEffect } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/stripe/plans";

interface SubscriptionData {
  plan: string;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setSubscription(
        (data as SubscriptionData) || {
          plan: "free",
          status: "active",
          current_period_end: null,
          stripe_customer_id: null,
        }
      );
      setIsLoading(false);
    }
    loadSubscription();
  }, [supabase]);

  async function handlePortal() {
    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.assign(data.url);
    } catch {
      console.error("Failed to open portal");
    }
    setIsPortalLoading(false);
  }

  async function handleCheckout(priceId: string) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.assign(data.url);
    } catch {
      console.error("Failed to create checkout");
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-default-500">Loading...</div>;
  }

  const currentPlan = PLANS[subscription?.plan || "free"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <Card>
        <Card.Header className="flex items-center justify-between">
          <Card.Title>Current Plan</Card.Title>
          <Chip color={subscription?.status === "active" ? "success" : "warning"} size="sm">
            <Chip.Label>{subscription?.status || "active"}</Chip.Label>
          </Chip>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <div>
            <p className="text-2xl font-bold">{currentPlan?.name || "Free"}</p>
            <p className="text-default-500">{currentPlan?.description}</p>
          </div>
          {subscription?.current_period_end && (
            <p className="text-sm text-default-500">
              Current period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          {subscription?.stripe_customer_id && (
            <Button variant="outline" onPress={handlePortal} isDisabled={isPortalLoading}>
              {isPortalLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
        </Card.Content>
      </Card>

      {subscription?.plan === "free" && (
        <Card>
          <Card.Header>
            <Card.Title>Upgrade Your Plan</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(PLANS)
                .filter(([key]) => key !== "free")
                .map(([key, plan]) => (
                  <Card key={key} variant="secondary">
                    <Card.Content className="flex flex-col gap-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-2xl font-bold">
                        ${plan.price}
                        <span className="text-sm text-default-500">/mo</span>
                      </p>
                      <p className="text-sm text-default-500">{plan.description}</p>
                      <Button
                        variant={key === "pro" ? "primary" : "outline"}
                        onPress={() => plan.priceId && handleCheckout(plan.priceId)}
                        className="mt-2"
                      >
                        Upgrade to {plan.name}
                      </Button>
                    </Card.Content>
                  </Card>
                ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
