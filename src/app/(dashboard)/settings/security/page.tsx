"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Label, TextField, FieldError } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SecurityPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function onSubmit(data: PasswordForm) {
    setIsLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully." });
      reset();
    }
    setIsLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Security Settings</h1>

      <Card>
        <Card.Header>
          <Card.Title>Change Password</Card.Title>
        </Card.Header>
        <Card.Content>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <TextField isInvalid={!!errors.password}>
              <Label>New Password</Label>
              <Input {...register("password")} type="password" autoComplete="new-password" />
              <FieldError>{errors.password?.message}</FieldError>
            </TextField>

            <TextField isInvalid={!!errors.confirmPassword}>
              <Label>Confirm New Password</Label>
              <Input {...register("confirmPassword")} type="password" autoComplete="new-password" />
              <FieldError>{errors.confirmPassword?.message}</FieldError>
            </TextField>

            {message && (
              <p
                className={`text-sm ${message.type === "success" ? "text-success" : "text-danger"}`}
              >
                {message.text}
              </p>
            )}

            <Button type="submit" variant="primary" isDisabled={isLoading} className="self-start">
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Two-Factor Authentication</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-default-500">
            Two-factor authentication adds an extra layer of security to your account. This feature
            is coming soon.
          </p>
          <Button variant="outline" isDisabled className="mt-4">
            Enable 2FA (Coming Soon)
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
}
