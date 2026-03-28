"use client";

import { Avatar, Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";

export function DashboardHeader() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-default-200 px-6">
      <div className="md:hidden">
        <span className="text-xl font-bold">Enfuce</span>
      </div>
      <div className="flex-1" />
      <Dropdown>
        <Dropdown.Trigger>
          <Avatar size="sm">
            <Avatar.Fallback>A</Avatar.Fallback>
          </Avatar>
        </Dropdown.Trigger>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item id="signout" onAction={handleSignOut}>
              Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </header>
  );
}
