import type { Layer1Flag } from "@/types/screening";

export interface ScreeningWorkerSession {
  sessionId: string;
  createdAt: string;
  total: number;
  nextIndex: number;
  resetRequested: boolean;
  resetDone: boolean;
  claimed: Set<number>;
  processed: Set<number>;
  failed: number;
  maxCases: number;
  flags: Layer1Flag[];
}

const sessions = new Map<string, ScreeningWorkerSession>();

function makeSessionId(): string {
  return `l2w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkerSession(flags: Layer1Flag[], maxCases: number, reset: boolean) {
  const selected = flags.slice(0, Math.max(1, Math.min(maxCases, flags.length)));
  const session: ScreeningWorkerSession = {
    sessionId: makeSessionId(),
    createdAt: new Date().toISOString(),
    total: selected.length,
    nextIndex: 0,
    resetRequested: reset,
    resetDone: false,
    claimed: new Set<number>(),
    processed: new Set<number>(),
    failed: 0,
    maxCases,
    flags: selected,
  };
  sessions.set(session.sessionId, session);
  return session;
}

export function getWorkerSession(sessionId: string) {
  return sessions.get(sessionId) ?? null;
}

export function claimNextIndex(session: ScreeningWorkerSession): number | null {
  while (session.nextIndex < session.total) {
    const idx = session.nextIndex;
    session.nextIndex += 1;
    if (!session.claimed.has(idx) && !session.processed.has(idx)) {
      session.claimed.add(idx);
      return idx;
    }
  }
  return null;
}

export function markProcessed(session: ScreeningWorkerSession, index: number) {
  session.processed.add(index);
}

export function markFailed(session: ScreeningWorkerSession) {
  session.failed += 1;
}

export function getSessionProgress(session: ScreeningWorkerSession) {
  const processed = session.processed.size;
  const remaining = Math.max(0, session.total - processed);
  return {
    sessionId: session.sessionId,
    total: session.total,
    processed,
    remaining,
    failed: session.failed,
    hasMore: remaining > 0,
    resetDone: session.resetDone,
    createdAt: session.createdAt,
  };
}
