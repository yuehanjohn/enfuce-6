"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="border-b border-default-200 bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            SaaS
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            <Link
              href="/pricing"
              className="text-sm text-default-500 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm text-default-500 hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">
              Sign Up
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-default-200 px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/pricing" className="text-sm" onClick={() => setIsMenuOpen(false)}>
              Pricing
            </Link>
            <Link href="/blog" className="text-sm" onClick={() => setIsMenuOpen(false)}>
              Blog
            </Link>
            <Link href="/login" className="text-sm" onClick={() => setIsMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm" fullWidth>
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
