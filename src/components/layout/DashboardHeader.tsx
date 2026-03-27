"use client";

import { Button, Avatar, Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardHeader() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-default-200 px-6">
      <div className="md:hidden">
        <span className="text-xl font-bold">SaaS</span>
      </div>
      <div className="flex-1" />
      <Dropdown>
        <Dropdown.Trigger>
          <Button variant="ghost" isIconOnly>
            <Avatar size="sm">
              <Avatar.Fallback>U</Avatar.Fallback>
            </Avatar>
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item href="/settings/profile" id="profile">
              Profile
            </Dropdown.Item>
            <Dropdown.Item href="/settings/billing" id="billing">
              Billing
            </Dropdown.Item>
            <Dropdown.Item id="signout" onAction={handleSignOut}>
              Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </header>
  );
}
