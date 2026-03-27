import { NextResponse } from "next/server";
import { getDemoCredentials, setSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const creds = getDemoCredentials();

  if (email === creds.email && password === creds.password) {
    await setSession();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
