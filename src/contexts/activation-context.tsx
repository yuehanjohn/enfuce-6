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

        // Stop polling once active or idle
        if (data.stage === "active" || data.stage === "idle") {
          pollingRef.current = false;
          clearInterval(timer);
        }
      } catch {
        // ignore fetch errors
      }
    }

    // On mount, do one immediate poll to sync state
    poll().then(() => {
      // If running, keep polling
      if (!pollingRef.current) {
        // Check if we need to start polling based on fetched stage
        // (the state may not be updated yet, so re-fetch)
        fetch("/api/screening/activate")
          .then((r) => r.json())
          .then((data) => {
            if (data.stage !== "idle" && data.stage !== "active") {
              pollingRef.current = true;
              timer = setInterval(poll, 1500);
            }
          })
          .catch(() => {});
      }
    });

    return () => clearInterval(timer);
  }, []);

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

          if (data.stage === "active" || data.stage === "idle") {
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

  return (
    <ActivationContext value={{ stage, layer2Progress, queueCount, activate }}>
      {children}
    </ActivationContext>
  );
}

export function useActivation() {
  const ctx = useContext(ActivationContext);
  if (!ctx) throw new Error("useActivation must be used within ActivationProvider");
  return ctx;
}
