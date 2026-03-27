"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Label, TextField, FieldError } from "@heroui/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: ForgotPasswordForm) {
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  if (success) {
    return (
      <Card>
        <Card.Content className="gap-4 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-default-500">
            If an account exists with that email, we&apos;ve sent a password reset link.
          </p>
          <Link href="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1">
          <Card.Title>Forgot password?</Card.Title>
          <Card.Description>Enter your email to receive a reset link</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField isInvalid={!!errors.email}>
            <Label>Email</Label>
            <Input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            <FieldError>{errors.email?.message}</FieldError>
          </TextField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" isDisabled={isLoading} className="w-full">
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="text-center text-sm text-default-500">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card.Content>
    </Card>
  );
}
