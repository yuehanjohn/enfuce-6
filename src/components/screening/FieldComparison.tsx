"use client";

import { Card } from "@heroui/react";
import type { Customer, SanctionsEntry, Layer1Flag } from "@/types/screening";

interface FieldComparisonProps {
  customer: Customer;
  watchlist: SanctionsEntry;
  layer1: Layer1Flag;
}

interface FieldRowProps {
  label: string;
  customerValue: string;
  watchlistValue: string;
  match: "exact" | "partial" | "mismatch" | "neutral";
}

function FieldRow({ label, customerValue, watchlistValue, match }: FieldRowProps) {
  const icon = {
    exact: (
      <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    partial: (
      <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    mismatch: (
      <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    neutral: (
      <svg className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-default-100 py-3 last:border-b-0">
      <div>
        <p className="text-xs text-default-400 uppercase tracking-wider">{label}</p>
        <p className="font-medium">{customerValue || "—"}</p>
      </div>
      <div className="flex items-center justify-center">{icon[match]}</div>
      <div className="text-right">
        <p className="text-xs text-default-400 uppercase tracking-wider">{label}</p>
        <p className="font-medium">{watchlistValue || "—"}</p>
      </div>
    </div>
  );
}

function getNameMatch(score: number): "exact" | "partial" | "mismatch" {
  if (score >= 0.92) return "exact";
  if (score >= 0.82) return "partial";
  return "mismatch";
}

function getDobMatch(customerDob: string, watchlistDob: string): "exact" | "partial" | "mismatch" | "neutral" {
  if (!customerDob || !watchlistDob) return "neutral";
  if (customerDob === watchlistDob) return "exact";
  const diff = Math.abs(new Date(customerDob).getFullYear() - new Date(watchlistDob).getFullYear());
  if (diff <= 2) return "partial";
  return "mismatch";
}

function getNatMatch(customerNat: string, watchlistNat: string): "exact" | "mismatch" | "neutral" {
  if (!customerNat || !watchlistNat) return "neutral";
  if (customerNat.toUpperCase() === watchlistNat.toUpperCase()) return "exact";
  return "mismatch";
}

export function FieldComparison({ customer, watchlist, layer1 }: FieldComparisonProps) {
  const aliases = watchlist.entity_aliases || "None";

  return (
    <Card className="h-full">
      <Card.Header>
        <div className="w-full">
          <Card.Title>Field Comparison</Card.Title>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-primary font-medium">Customer</span>
            <span className="text-sm text-danger font-medium">Watchlist</span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="gap-0">
        <FieldRow
          label="Full Name"
          customerValue={customer.full_name}
          watchlistValue={watchlist.entity_name}
          match={getNameMatch(layer1.name_score)}
        />
        <FieldRow
          label="Date of Birth"
          customerValue={customer.dob}
          watchlistValue={watchlist.dob}
          match={getDobMatch(customer.dob, watchlist.dob)}
        />
        <FieldRow
          label="Nationality"
          customerValue={customer.nationality}
          watchlistValue={watchlist.nationality_country || watchlist.citizenship_country}
          match={getNatMatch(customer.nationality, watchlist.nationality_country || watchlist.citizenship_country)}
        />
        <FieldRow
          label="Entity Type"
          customerValue={customer.entity_type}
          watchlistValue={watchlist.entity_type}
          match={customer.entity_type.toLowerCase() === watchlist.entity_type.toLowerCase() ? "exact" : "mismatch"}
        />
        <FieldRow
          label="Email / ID"
          customerValue={customer.email}
          watchlistValue={watchlist.entity_id}
          match="neutral"
        />

        <div className="mt-3 border-t border-default-200 pt-3">
          <p className="text-xs text-default-400 uppercase tracking-wider mb-1">Aliases</p>
          <p className="text-sm">{aliases}</p>
        </div>

        <div className="mt-3 border-t border-default-200 pt-3">
          <p className="text-xs text-default-400 uppercase tracking-wider mb-1">List Source</p>
          <p className="text-sm">{watchlist.list_name} ({watchlist.authority})</p>
        </div>

        <div className="mt-3 border-t border-default-200 pt-3 rounded-lg bg-default-50 p-3">
          <p className="text-xs text-default-400 uppercase tracking-wider mb-2">Layer 1 Composite Score</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{layer1.composite_score}</span>
            <span className="text-sm text-default-500">/ 120 max</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-default-500">
            <span>Name: {(layer1.name_score * 100).toFixed(0)}%</span>
            <span>DOB: +{layer1.dob_score}</span>
            <span>Nat: {layer1.nationality_score > 0 ? "+" : ""}{layer1.nationality_score}</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
