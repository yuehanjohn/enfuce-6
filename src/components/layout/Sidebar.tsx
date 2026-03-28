"use client";

import { Avatar, Dropdown } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  Icon: React.FC<{ className?: string }>;
};

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconReviewQueue({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
      <circle cx="17" cy="7" r="3.25" fill="#f2f2f2" />
      <circle cx="17" cy="7" r="3.25" />
      <path strokeLinecap="round" d="M17 5.75v2.1M17 9.4v.15" />
    </svg>
  );
}

function IconAuditLog({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7.5 12 4l8 3.5V17L12 20.5 4 17V7.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 11l8-3.5M12 11v9.5" />
    </svg>
  );
}

/** Double chevron (Figma / Lucide-style ChevronsLeft) — collapse sidebar */
function IconChevronsLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}

/** Double chevron (Figma / Lucide-style ChevronsRight) — expand sidebar */
function IconChevronsRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
    Icon: IconDashboard,
  },
  {
    href: "/queue",
    label: "Review queue",
    match: (p) => p === "/queue" || p.startsWith("/queue/") || p.startsWith("/review"),
    Icon: IconReviewQueue,
  },
  {
    href: "/audit",
    label: "Audit log",
    match: (p) => p === "/audit" || p.startsWith("/audit/"),
    Icon: IconAuditLog,
  },
];

function EnfuseLogo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    // Show only the circular mark (leftmost ~25px of the 100px-wide SVG)
    return (
      <div className="relative h-6.25 w-6.25 shrink-0 overflow-hidden" aria-hidden>
        <Image
          src="/logo.svg"
          alt=""
          width={100}
          height={35}
          unoptimized
          className="pointer-events-none absolute left-0 top-0 h-6.25 w-auto max-w-none select-none"
        />
      </div>
    );
  }

  return (
    <Image
      src="/logo.svg"
      alt="Enfuce"
      width={100}
      height={35}
      unoptimized
      priority
      className="pointer-events-none h-8.75 w-auto max-w-38 shrink-0 select-none"
    />
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push("/settings/profile");
  }, [router]);

  return (
    <aside
      className={`relative hidden h-full shrink-0 flex-col border-r border-neutral-200/80 bg-[#f2f2f2] md:flex ${collapsed ? "md:w-[4.25rem]" : "md:w-60"}`}
    >
      <div
        className={`flex shrink-0 items-center gap-2 px-3 py-3 ${collapsed ? "flex-col gap-3" : "h-[3.75rem] justify-between pr-2"}`}
      >
        <Link
          href="/dashboard"
          className={`flex min-w-0 items-center text-[#1e3a5f] ${collapsed ? "justify-center" : ""}`}
          aria-label="Enfuse home"
        >
          <EnfuseLogo collapsed={collapsed} />
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-300/50 hover:text-neutral-900"
            aria-label="Collapse sidebar"
          >
            <IconChevronsLeft className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-300/50 hover:text-neutral-900"
            aria-label="Expand sidebar"
          >
            <IconChevronsRight className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 pt-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const { Icon } = item;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-300/40 ${
                isActive ? "bg-neutral-300/70 text-neutral-900" : ""
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <Icon className="size-5 shrink-0 text-neutral-700" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`shrink-0 p-3 pt-2 ${collapsed ? "flex justify-center" : ""}`}>
        <Dropdown>
          <Dropdown.Trigger
            className="flex rounded-full ring-offset-2 ring-offset-[#f2f2f2] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-neutral-400"
            aria-label="Account menu"
          >
            <Avatar size="sm" className="size-9 shrink-0 bg-neutral-300 text-neutral-800">
              <Avatar.Fallback>A</Avatar.Fallback>
            </Avatar>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu>
              <Dropdown.Item id="settings" onAction={handleSettings}>
                Settings
              </Dropdown.Item>
              <Dropdown.Item id="signout" onAction={handleSignOut}>
                Sign out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </aside>
  );
}
