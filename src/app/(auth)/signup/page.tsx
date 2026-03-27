"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Label, TextField, FieldError, Separator } from "@heroui/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupForm) {
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  async function handleOAuth(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  if (success) {
    return (
      <Card>
        <Card.Content className="gap-4 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-default-500">
            We&apos;ve sent a confirmation link to your email address. Please click it to activate
            your account.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1">
          <Card.Title>Create an account</Card.Title>
          <Card.Description>Start your journey with us</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onPress={() => handleOAuth("google")}>
            Google
          </Button>
          <Button variant="outline" className="flex-1" onPress={() => handleOAuth("github")}>
            GitHub
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-xs text-default-400">OR</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField isInvalid={!!errors.fullName}>
            <Label>Full Name</Label>
            <Input {...register("fullName")} placeholder="John Doe" autoComplete="name" />
            <FieldError>{errors.fullName?.message}</FieldError>
          </TextField>

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

          <TextField isInvalid={!!errors.password}>
            <Label>Password</Label>
            <Input
              {...register("password")}
              type="password"
              placeholder="Create a password"
              autoComplete="new-password"
            />
            <FieldError>{errors.password?.message}</FieldError>
          </TextField>

          <TextField isInvalid={!!errors.confirmPassword}>
            <Label>Confirm Password</Label>
            <Input
              {...register("confirmPassword")}
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </TextField>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" variant="primary" isDisabled={isLoading} className="w-full">
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-default-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card.Content>
    </Card>
  );
}
