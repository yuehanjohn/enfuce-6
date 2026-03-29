"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
  reset: () => void;
}

const ActivationContext = createContext<ActivationContextValue | null>(null);

// ── All processing runs server-side. Client only polls for status. ──

export function ActivationProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<ActivationStage>("idle");
  const [layer2Progress, setLayer2Progress] = useState<Layer2Progress | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const pollingRef = useRef(false);

  // Poll server for activation status
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      try {
        const res = await fetch("/api/screening/activate");
        if (!res.ok) return;
        const data = await res.json();

        setStage(data.stage);
        setQueueCount(data.queueCount);

        if (data.stage === "layer2") {
          setLayer2Progress({ done: data.layer2Done, total: data.layer2Total });
        } else {
          setLayer2Progress(null);
        }

        // Stop polling only when idle (not yet activated)
        // Keep polling when active so queueCount stays fresh after decisions
        if (data.stage === "idle") {
          pollingRef.current = false;
          clearInterval(timer);
        }
      } catch {
        // ignore fetch errors
      }
    }

    // On mount, do one immediate poll to sync state
    poll().then(() => {
      // If running or active, keep polling
      if (!pollingRef.current) {
        fetch("/api/screening/activate")
          .then((r) => r.json())
          .then((data) => {
            if (data.stage !== "idle") {
              pollingRef.current = true;
              // Poll faster during pipeline, slower when active
              const interval = data.stage === "active" ? 5000 : 1500;
              timer = setInterval(poll, interval);
            }
          })
          .catch(() => {});
      }
    });

    return () => clearInterval(timer);
  }, []);

  // Auto-reset server every 20 minutes while active
  const resetTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    if (stage === "active") {
      resetTimerRef.current = setInterval(
        async () => {
          try {
            await fetch("/api/screening/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reset: true }),
            });
          } catch {
            // ignore
          }
        },
        20 * 60 * 1000
      );
    } else {
      clearInterval(resetTimerRef.current);
    }
    return () => clearInterval(resetTimerRef.current);
  }, [stage]);

  const activate = useCallback(async () => {
    if (stage !== "idle") return;

    try {
      const res = await fetch("/api/screening/activate", { method: "POST" });
      if (!res.ok) return;

      // Start polling
      pollingRef.current = true;
      const timer = setInterval(async () => {
        try {
          const r = await fetch("/api/screening/activate");
          if (!r.ok) return;
          const data = await r.json();

          setStage(data.stage);
          setQueueCount(data.queueCount);

          if (data.stage === "layer2") {
            setLayer2Progress({ done: data.layer2Done, total: data.layer2Total });
          } else {
            setLayer2Progress(null);
          }

          // Stop only when idle; keep polling when active for fresh queueCount
          if (data.stage === "idle") {
            pollingRef.current = false;
            clearInterval(timer);
          }
        } catch {
          // ignore
        }
      }, 1500);
    } catch (err) {
      console.error("Activation failed:", err);
    }
  }, [stage]);

  const reset = useCallback(async () => {
    if (stage === "idle") return;
    try {
      const res = await fetch("/api/screening/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (!res.ok) return;

      // Go straight back to idle
      pollingRef.current = false;
      setStage("idle");
      setQueueCount(0);
      setLayer2Progress(null);
    } catch (err) {
      console.error("Reset failed:", err);
    }
  }, [stage]);

  return (
    <ActivationContext value={{ stage, layer2Progress, queueCount, activate, reset }}>
      {children}
    </ActivationContext>
  );
}

export function useActivation() {
  const ctx = useContext(ActivationContext);
  if (!ctx) throw new Error("useActivation must be used within ActivationProvider");
  return ctx;
}
