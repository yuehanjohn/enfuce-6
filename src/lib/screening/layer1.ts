// Layer 1 — Deterministic Screening Engine
// Runs Jaro-Winkler similarity + DOB + nationality composite scoring
// Deterministic screening engine using Jaro-Winkler string similarity

import type { Customer, SanctionsEntry, Layer1Flag } from "@/types/screening";

// ── Jaro-Winkler Similarity ─────────────────────────────────────────

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
}

export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ── Composite Scoring ───────────────────────────────────────────────

function parseAliases(aliases: string): string[] {
  if (!aliases) return [];
  return aliases
    .split(/[;|,]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

function scoreName(
  customerName: string,
  entityName: string,
  aliases: string
): { nameScore: number; namePoints: number; aliasPoints: number } {
  const cn = customerName.toLowerCase();
  const en = entityName.toLowerCase();
  const nameScore = jaroWinkler(cn, en);

  let namePoints = 0;
  if (nameScore >= 0.92) namePoints = 70;
  else if (nameScore >= 0.82) namePoints = 50;

  let aliasPoints = 0;
  for (const alias of parseAliases(aliases)) {
    const aliasScore = jaroWinkler(cn, alias.toLowerCase());
    if (aliasScore >= 0.82) {
      aliasPoints = 25;
      break;
    }
  }

  return { nameScore, namePoints, aliasPoints };
}

function scoreDob(customerDob: string, entityDob: string): number {
  if (!customerDob || !entityDob) return 0;
  const cd = new Date(customerDob);
  const ed = new Date(entityDob);
  const diffYears = Math.abs(cd.getFullYear() - ed.getFullYear());
  const diffMonths = Math.abs(cd.getMonth() - ed.getMonth());
  const diffDays = Math.abs(cd.getDate() - ed.getDate());

  if (diffYears === 0 && diffMonths === 0 && diffDays === 0) return 30;
  if (diffYears <= 1) return 15;
  return 0;
}

function scoreNationality(customerNat: string, entityNat: string): number {
  if (!customerNat || !entityNat) return 0;
  const cn = customerNat.toUpperCase();
  const en = entityNat.toUpperCase();
  if (cn === en) return 20;
  return -10;
}

export function screenCustomerAgainstEntry(
  customer: Customer,
  entry: SanctionsEntry
): Layer1Flag | null {
  const { nameScore, namePoints, aliasPoints } = scoreName(
    customer.full_name,
    entry.entity_name,
    entry.entity_aliases
  );
  const dobScore = scoreDob(customer.dob, entry.dob);
  const nationalityScore = scoreNationality(
    customer.nationality,
    entry.nationality_country || entry.citizenship_country || entry.country
  );

  const compositeScore = Math.max(namePoints, 0) + aliasPoints + dobScore + nationalityScore;

  if (compositeScore < 50) return null;

  return {
    flag_id: `FLAG-${customer.customer_id}-${entry.entity_id}`,
    customer_id: customer.customer_id,
    entity_id: entry.entity_id,
    composite_score: compositeScore,
    name_score: nameScore,
    dob_score: dobScore,
    nationality_score: nationalityScore,
    created_at: new Date().toISOString(),
  };
}

export function runLayer1Screening(
  customers: Customer[],
  sanctions: SanctionsEntry[]
): Layer1Flag[] {
  const flags: Layer1Flag[] = [];
  for (const customer of customers) {
    for (const entry of sanctions) {
      const flag = screenCustomerAgainstEntry(customer, entry);
      if (flag) flags.push(flag);
    }
  }
  return flags;
}
