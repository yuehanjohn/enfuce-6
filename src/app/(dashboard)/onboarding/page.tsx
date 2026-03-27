"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
  ProgressBar,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Welcome", "About You", "Preferences"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    role: "",
    theme: "system",
  });
  const router = useRouter();
  const supabase = createClient();

  async function handleComplete() {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ full_name: formData.fullName } as Record<string, unknown>)
      .eq("id", user.id);

    await supabase
      .from("user_preferences")
      .update({
        theme: formData.theme,
        onboarding_completed: true,
      } as Record<string, unknown>)
      .eq("user_id", user.id);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ProgressBar value={((step + 1) / STEPS.length) * 100}>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>

      <Card>
        <Card.Header>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-default-500">
              Step {step + 1} of {STEPS.length}
            </p>
            <Card.Title>{STEPS[step]}</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-default-500">
                Let&apos;s get you set up. This will only take a minute.
              </p>
              <TextField>
                <Label>Full Name</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name"
                />
              </TextField>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <TextField>
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Your company (optional)"
                />
              </TextField>
              <TextField>
                <Label>Your Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Developer, Founder"
                />
              </TextField>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <Label>Theme Preference</Label>
              <RadioGroup
                value={formData.theme}
                onChange={(value: string) => setFormData({ ...formData, theme: value })}
              >
                <Radio value="light">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>Light</Radio.Content>
                </Radio>
                <Radio value="dark">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>Dark</Radio.Content>
                </Radio>
                <Radio value="system">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>System</Radio.Content>
                </Radio>
              </RadioGroup>
            </div>
          )}
        </Card.Content>
        <Card.Footer className="flex justify-between">
          <Button variant="ghost" onPress={() => setStep(step - 1)} isDisabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onPress={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" onPress={handleComplete} isDisabled={isLoading}>
              {isLoading ? "Completing..." : "Complete Setup"}
            </Button>
          )}
        </Card.Footer>
      </Card>
    </div>
  );
}
