"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ActivationStage = "idle" | "server" | "layer1" | "layer2" | "active";

interface Layer2Progress {
  done: number;
  total: number;
}

interface ActivationContextValue {
  stage: ActivationStage;
  layer2Progress: Layer2Progress | null;
  queueCount: number;
  activate: () => void;
}

const ActivationContext = createContext<ActivationContextValue | null>(null);

// ── Browser-global singleton state ──────────────────────────────────
// Survives React re-mounts (page navigations within the SPA).

interface GlobalActivation {
  stage: ActivationStage;
  layer2Progress: Layer2Progress | null;
  queueCount: number;
  running: boolean;
  listeners: Set<() => void>;
}

const SSR_DUMMY: GlobalActivation = {
  stage: "idle",
  layer2Progress: null,
  queueCount: 0,
  running: false,
  listeners: new Set(),
};

function getGlobal(): GlobalActivation {
  if (typeof window === "undefined") return SSR_DUMMY;
  const w = window as unknown as { __activation?: GlobalActivation };
  if (!w.__activation) {
    w.__activation = {
      stage: "idle",
      layer2Progress: null,
      queueCount: 0,
      running: false,
      listeners: new Set(),
    };
  }
  return w.__activation;
}

function notify() {
  const g = getGlobal();
  for (const fn of g.listeners) fn();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runActivation() {
  const g = getGlobal();
  if (g.running || g.stage !== "idle") return;
  g.running = true;

  try {
    g.stage = "server";
    notify();
    await sleep(1200);

    g.stage = "layer1";
    notify();
    const l1Res = await fetch("/api/screening/run", { method: "POST" });
    const l1Data = await l1Res.json();
    const flags: { flag_id: string }[] = l1Data.flags ?? [];

    g.stage = "layer2";
    g.layer2Progress = { done: 0, total: flags.length };
    notify();

    let qCount = 0;
    for (let i = 0; i < flags.length; i++) {
      const res = await fetch("/api/screening/layer2-process-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_id: flags[i].flag_id }),
      });
      const data = await res.json();
      g.layer2Progress = { done: i + 1, total: flags.length };
      if (data.routing === "HUMAN_REVIEW") {
        qCount = data.queue_count ?? qCount + 1;
        g.queueCount = qCount;
      }
      notify();
    }

    g.stage = "active";
    g.layer2Progress = null;
    notify();
  } catch (err) {
    console.error("Activation failed:", err);
    g.stage = "idle";
    g.layer2Progress = null;
    notify();
  } finally {
    g.running = false;
  }
}

// ── React provider — thin wrapper over global state ─────────────────

export function ActivationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    stage: "idle" as ActivationStage,
    layer2Progress: null as Layer2Progress | null,
    queueCount: 0,
  });

  useEffect(() => {
    const g = getGlobal();
    const listener = () =>
      setState({ stage: g.stage, layer2Progress: g.layer2Progress, queueCount: g.queueCount });
    g.listeners.add(listener);
    // Sync immediately in case state already advanced while unmounted
    listener();
    return () => {
      g.listeners.delete(listener);
    };
  }, []);

  const activate = useCallback(() => {
    runActivation();
  }, []);

  return <ActivationContext value={{ ...state, activate }}>{children}</ActivationContext>;
}

export function useActivation() {
  const ctx = useContext(ActivationContext);
  if (!ctx) throw new Error("useActivation must be used within ActivationProvider");
  return ctx;
}
