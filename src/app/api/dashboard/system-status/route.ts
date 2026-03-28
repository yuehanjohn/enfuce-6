import { getMockSystemStatus } from "@/lib/dashboard/system-status";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getMockSystemStatus());
}
