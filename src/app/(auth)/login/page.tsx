"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      router.push("/screening");
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Card.Header>
        <div className="w-full text-center">
          <h1 className="text-2xl font-bold">Enfuce</h1>
          <p className="text-sm text-default-500 mt-1">Sanctions & PEP Screening Platform</p>
        </div>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</div>}

          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@enfuce.demo"
              required
              className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isDisabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-xs text-default-400 text-center">
            Demo credentials: analyst@enfuce.demo / enfuce2026
          </p>
        </form>
      </Card.Content>
    </Card>
  );
}
