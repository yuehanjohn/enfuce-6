"use client";

import { useEffect, useState } from "react";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const L = "#C8F04C"; // lime — decorative, button bg, icons, meter fill
const LT = "#87B800"; // lime-derived dark — for text on light backgrounds (7:1+ on white)
const S = "#FFFFFF"; // surface / card background
const SE = "#E5E7EB"; // border / divider
const BG = "#F9FAFB"; // page background
const TS = "#6B7280"; // secondary text (~4.6:1 on white — passes WCAG AA)
const TM = "#9CA3AF"; // muted text (decorative / non-essential)
const RED = "#DC2626"; // error / conflict
const GREEN = "#16A34A"; // success / match

// ─── Data ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: 100000, suffix: "+", label: "Customers screened per run" },
  { value: 3, suffix: "", label: "Screening layers" },
  { value: 10, suffix: "%", label: "Auto-clear confidence threshold (≤)" },
  { value: 90, suffix: "%", label: "High-risk escalation threshold (≥)" },
];

const STEPS = [
  {
    n: "01",
    title: "Deterministic Screening",
    body: "Customers are matched against sanctions and PEP lists using SQL-based name similarity (Jaro-Winkler), date of birth comparison, and nationality alignment. This narrows 100k+ customers to a small set of high-signal flagged candidates.",
  },
  {
    n: "02",
    title: "AI Reasoning & Routing",
    body: "Snowflake Cortex analyzes each flagged case with contextual reasoning and external data enrichment, generating a confidence score and structured rationale. Cases are auto-cleared (≤10%), sent for human review (10–90%), or escalated as high-risk (≥90%).",
  },
  {
    n: "03",
    title: "Human Review",
    body: "Analysts review only uncertain cases in a dedicated dashboard with full case context, AI-generated reasoning, source links, and an embedded AI chat assistant. Every action is captured in a complete, auditable decision trail.",
  },
];

const FEATURES = [
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>`,
    title: "Confidence-Based Triage",
    body: "Each flagged case is assigned a confidence score that drives automatic routing — cases auto-clear, escalate, or queue for human review, so analysts focus only on genuine uncertainty.",
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>`,
    title: "Explainable AI Reasoning",
    body: "Snowflake Cortex generates structured case analysis with supporting signals for every decision — not just a score, but a traceable chain of reasoning analysts can interrogate.",
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    title: "Source-Backed Decisions",
    body: "Every AI determination links back to the underlying sanctions or PEP dataset entry, giving analysts direct access to the evidence behind each flag.",
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    title: "Human-in-the-Loop",
    body: "Uncertain cases always surface in the analyst queue. Reviewers have full case context, AI reasoning, source links, and an AI chat assistant — maintaining the human accountability regulators require.",
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: "Full Audit Trail",
    body: "End-to-end audit logging captures every screening step, AI reasoning chain, and human decision — providing complete compliance transparency and legally defensible records.",
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A6500" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>`,
    title: "Snowflake-Powered Scale",
    body: "Snowflake serves as the core screening engine — handling 100k+ customer records, rule execution, Cortex AI reasoning, and case persistence with role-based access controls.",
  },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,700;0,9..40,800&family=Inter:wght@400;500&display=swap');

  .es-root *, .es-root *::before, .es-root *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .es-root {
    cursor: none;
    overflow-x: hidden;
  }

  @media (hover: none) {
    .es-root, .es-root * { cursor: auto !important; }
    .cs-dot, .cs-ring { display: none !important; }
  }

  /* Scrollbar */
  .es-root ::-webkit-scrollbar { width: 5px; }
  .es-root ::-webkit-scrollbar-track { background: #F9FAFB; }
  .es-root ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }

  /* Custom cursor */
  .cs-dot {
    position: fixed;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4A6500;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: opacity 0.2s;
  }
  .cs-ring {
    position: fixed;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid #4A6500;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    transition: opacity 0.2s;
  }

  /* Navbar */
  .es-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 200;
    transition: background 0.3s ease-out, border-color 0.3s ease-out;
  }
  .es-nav.scrolled {
    background: rgba(249,250,251,0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(74,101,0,0.15);
  }
  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-links {
    display: flex;
    gap: 32px;
    align-items: center;
  }
  .nav-link {
    color: #6B7280;
    font-size: 14px;
    text-decoration: none;
    transition: color 0.2s ease-out;
    font-family: Inter, sans-serif;
  }
  .nav-link:hover { color: #111827; }
  .nav-cta-wrap { display: flex; }
  .nav-hamburger {
    display: none;
    background: none;
    border: none;
    color: #111827;
    padding: 6px;
    align-items: center;
    justify-content: center;
  }
  .nav-mobile {
    display: none;
    flex-direction: column;
    gap: 16px;
    padding: 20px 24px 24px;
    background: #FFFFFF;
    border-top: 1px solid #E5E7EB;
  }
  .nav-mobile.open { display: flex; }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .nav-cta-wrap { display: none; }
    .nav-hamburger { display: flex; }
  }

  /* Hero word animation */
  @keyframes heroWord {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hw {
    display: inline-block;
    opacity: 0;
  }
  .hw.go {
    animation: heroWord 0.5s ease-out forwards;
  }

  /* Fade-up on scroll */
  .fade-up {
    opacity: 0;
    transform: translateY(44px);
    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fade-up.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Step connector line */
  #step-line {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  #step-line.draw {
    transition: stroke-dashoffset 1.5s ease-out;
    stroke-dashoffset: 0;
  }

  /* Step connector visible only on desktop */
  .step-connector-svg { display: block; }

  /* Feature card */
  .feat-card {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 32px;
    transition: border-color 0.3s ease-out, box-shadow 0.3s ease-out;
  }
  .feat-card:hover {
    border-color: rgba(74,101,0,0.35);
    box-shadow: 0 2px 12px rgba(74,101,0,0.06);
  }

  /* Responsive grids */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    text-align: center;
  }
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    position: relative;
  }
  .product-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .feat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .hero-btns {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 900px) {
    .feat-grid { grid-template-columns: repeat(2, 1fr); }
    .product-grid { grid-template-columns: 1fr; gap: 48px; }
  }
  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .steps-grid { grid-template-columns: 1fr; }
    .step-connector-svg { display: none; }
    .step-item { padding: 24px 0 !important; border-bottom: 1px solid #E5E7EB; }
    .step-item:last-child { border-bottom: none; }
  }
  @media (max-width: 600px) {
    .feat-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 420px) {
    .stats-grid { grid-template-columns: 1fr; }
  }

  /* CTA button base */
  .btn-lime {
    background: #C8F04C;
    color: #1a2e00;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    text-decoration: none;
    border-radius: 4px;
    transition: background 0.2s ease-out;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
  }
  .btn-lime:hover { background: #B8E03C; }
  .btn-ghost {
    border: 1px solid rgba(17,24,39,0.25);
    color: #111827;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    text-decoration: none;
    border-radius: 4px;
    transition: border-color 0.2s ease-out, background 0.2s ease-out;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-ghost:hover { border-color: rgba(17,24,39,0.5); background: rgba(17,24,39,0.04); }

  /* Override HeroUI / global body for this page */
  .es-root { background: #F9FAFB !important; }
`;

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // 1 · Navbar scroll
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });

    // 2 · Custom cursor (pointer devices only)
    const isTouchOnly = window.matchMedia("(hover: none)").matches;
    const dot = document.getElementById("cs-dot") as HTMLElement | null;
    const ring = document.getElementById("cs-ring") as HTMLElement | null;
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0,
      rafId = 0;

    function moveDot(e: MouseEvent) {
      mx = e.clientX;
      my = e.clientY;
      if (dot) {
        dot.style.left = mx + "px";
        dot.style.top = my + "px";
      }
    }
    function lerpRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (ring) {
        ring.style.left = rx + "px";
        ring.style.top = ry + "px";
      }
      rafId = requestAnimationFrame(lerpRing);
    }
    if (!isTouchOnly) {
      window.addEventListener("mousemove", moveDot);
      rafId = requestAnimationFrame(lerpRing);
    }

    // 3 · Hero word stagger
    const heroWords = document.querySelectorAll<HTMLElement>(".hw");
    heroWords.forEach((w, i) => {
      setTimeout(() => w.classList.add("go"), 80 + i * 80);
    });

    // 4 · Stats count-up
    const statsSection = document.getElementById("stats-section");
    let statsDone = false;
    const statsObs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || statsDone) return;
        statsDone = true;
        document.querySelectorAll<HTMLElement>(".stat-num").forEach((el) => {
          const target = parseFloat(el.dataset.target ?? "0");
          const suffix = el.dataset.suffix ?? "";
          const isFloat = String(target).includes(".");
          const dur = 1800;
          const t0 = performance.now();
          function tick(now: number) {
            const p = Math.min((now - t0) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const cur = target * ease;
            el.textContent = (isFloat ? cur.toFixed(1) : Math.floor(cur).toLocaleString()) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    if (statsSection) statsObs.observe(statsSection);

    // 5 · Step connector line draw
    const stepLine = document.getElementById("step-line") as SVGPathElement | null;
    const stepsSection = document.getElementById("steps-section");
    let lineObs: IntersectionObserver | null = null;
    if (stepLine && stepsSection) {
      lineObs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            stepLine.classList.add("draw");
            lineObs?.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      lineObs.observe(stepsSection);
    }

    // 6 · Fade-up elements
    const fadeEls = document.querySelectorAll<HTMLElement>(".fade-up");
    const fadeObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = parseFloat(el.dataset.delay ?? "0") * 1000;
          setTimeout(() => el.classList.add("visible"), delay);
          fadeObs.unobserve(el);
        });
      },
      { threshold: 0.1 }
    );
    fadeEls.forEach((el) => fadeObs.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", moveDot);
      cancelAnimationFrame(rafId);
      statsObs.disconnect();
      fadeObs.disconnect();
      lineObs?.disconnect();
    };
  }, []);

  return (
    <div
      className="es-root"
      style={{
        background: BG,
        color: "#111827",
        fontFamily: "Inter, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ── Inject CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* ── Custom cursor ── */}
      <div id="cs-dot" className="cs-dot" />
      <div id="cs-ring" className="cs-ring" />

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <nav className={`es-nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          {/* Logo */}
          <a
            href="#"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <div
              style={{ width: 8, height: 8, borderRadius: "50%", background: L, flexShrink: 0 }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "0.08em",
                color: "#111827",
              }}
            >
              ENFUCE SCREEN
            </span>
          </a>

          {/* Desktop links */}
          <div className="nav-links">
            {[
              ["How it Works", "#how-it-works"],
              ["Product", "#product"],
              ["Security", "#security"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="nav-link">
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="nav-cta-wrap">
            <a href="/login" className="btn-lime" style={{ fontSize: 14, padding: "10px 20px" }}>
              Try Out Now →
            </a>
          </div>

          {/* Hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`nav-mobile${mobileOpen ? " open" : ""}`}>
          {[
            ["How it Works", "#how-it-works"],
            ["Product", "#product"],
            ["Security", "#security"],
            ["Compliance", "#compliance"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="nav-link"
              style={{ fontSize: 15 }}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            href="/login"
            className="btn-lime"
            style={{ fontSize: 14, padding: "12px 20px", marginTop: 8, justifyContent: "center" }}
            onClick={() => setMobileOpen(false)}
          >
            Try Out Now →
          </a>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          background: `radial-gradient(ellipse 900px 700px at 50% 42%, rgba(200,240,76,0.14) 0%, transparent 68%)`,
        }}
      >
        <div style={{ maxWidth: 880 }}>
          {/* Pre-label */}
          <div
            className="hw"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(74,101,0,0.22)",
              borderRadius: 20,
              padding: "6px 14px",
              marginBottom: 32,
              background: "rgba(200,240,76,0.07)",
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: L }} />
            <span style={{ fontSize: 12, color: TS, letterSpacing: "0.06em" }}>
              Powered by <strong style={{ color: "#111827", fontWeight: 600 }}>Enfuce</strong>{" "}
              infrastructure
            </span>
          </div>
          {/* Headline — split into words for stagger */}
          <h1
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(40px, 7vw, 72px)",
              lineHeight: 1.04,
              color: "#111827",
              marginBottom: 24,
              letterSpacing: "-0.01em",
            }}
          >
            {"Know exactly".split(" ").map((word, i) => (
              <span key={`a${i}`} className="hw" style={{ marginRight: "0.22em" }}>
                {word}
              </span>
            ))}
            <br />
            {"who you're".split(" ").map((word, i) => (
              <span key={`b${i}`} className="hw" style={{ marginRight: "0.22em" }}>
                {word}
              </span>
            ))}{" "}
            <span className="hw" style={{ color: LT }}>
              screening.
            </span>
          </h1>
          {/* Subheadline */}
          <p
            className="hw"
            style={{
              fontSize: 18,
              color: TS,
              maxWidth: 540,
              margin: "0 auto 40px",
              lineHeight: 1.72,
            }}
          >
            AI-powered sanctions & PEP screening that reduces false positives, accelerates
            onboarding, and enables explainable, human-in-the-loop decision-making. Three-layer
            architecture — deterministic filtering, AI reasoning, and targeted human review.
          </p>{" "}
          {/* Buttons */}
          <div className="hero-btns hw" style={{ marginBottom: 60 }}>
            <a href="/login" className="btn-lime" style={{ fontSize: 15, padding: "14px 28px" }}>
              Try Out Now →
            </a>
            <a
              href="#how-it-works"
              className="btn-ghost"
              style={{ fontSize: 15, padding: "14px 28px" }}
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════════════════════ */}
      <div
        id="stats-section"
        style={{
          borderTop: `1px solid ${SE}`,
          borderBottom: `1px solid ${SE}`,
          padding: "44px 24px",
          background: S,
        }}
      >
        <div className="stats-grid" style={{ maxWidth: 960, margin: "0 auto" }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="stat-num"
                data-target={String(s.value)}
                data-suffix={s.suffix}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 42,
                  color: LT,
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                0{s.suffix}
              </div>
              <div style={{ fontSize: 13, color: TS, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "120px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: LT,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: 600,
            }}
          >
            PROCESS
          </p>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              marginBottom: 80,
              lineHeight: 1.06,
              color: "#111827",
            }}
          >
            Three layers. Zero gaps.
          </h2>

          <div id="steps-section" className="steps-grid">
            {/* Connector line — positioned at center of the step circles (28px from top of grid) */}
            <svg
              className="step-connector-svg"
              style={{
                position: "absolute",
                top: 28,
                left: "16.67%",
                width: "66.67%",
                height: 2,
                overflow: "visible",
                zIndex: 0,
                pointerEvents: "none",
              }}
              viewBox="0 0 1000 2"
              preserveAspectRatio="none"
            >
              <path id="step-line" d="M 0 1 L 1000 1" stroke={L} strokeWidth="1.5" fill="none" />
            </svg>

            {STEPS.map((step) => (
              <div
                key={step.n}
                className="step-item"
                style={{ padding: "0 36px 0", position: "relative", zIndex: 1 }}
              >
                {/* Circle with number */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: S,
                    border: `1px solid ${SE}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 28,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      color: LT,
                    }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    marginBottom: 12,
                    color: "#111827",
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: TS, lineHeight: 1.72 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          PRODUCT SHOWCASE
      ════════════════════════════════════════════════════════ */}
      <section id="product" style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="product-grid">
            {/* Left copy */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: LT,
                  textTransform: "uppercase",
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                CASE REVIEW
              </p>
              <h2
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(26px, 4vw, 42px)",
                  marginBottom: 20,
                  lineHeight: 1.08,
                  color: "#111827",
                }}
              >
                Every decision, fully explained.
              </h2>
              <p style={{ fontSize: 16, color: TS, lineHeight: 1.72, marginBottom: 36 }}>
                Analysts review only uncertain cases, with full case context, AI-generated
                reasoning, source links, and an embedded AI chat assistant to support
                decision-making — all in a single, frictionless panel.
              </p>
              <a
                href="#contact"
                className="btn-lime"
                style={{ fontSize: 14, padding: "12px 24px" }}
              >
                See the dashboard →
              </a>
            </div>

            {/* Right: Case review panel */}
            <div className="fade-up" data-delay="0.1">
              <CaseReviewMock />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FEATURE GRID
      ════════════════════════════════════════════════════════ */}
      <section id="security" style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: LT,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: 600,
            }}
          >
            CAPABILITIES
          </p>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(26px, 4vw, 42px)",
              marginBottom: 56,
              lineHeight: 1.06,
              color: "#111827",
            }}
          >
            Built for compliance teams.
          </h2>
          <div className="feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feat-card fade-up" data-delay={String(i * 0.13)}>
                <div
                  dangerouslySetInnerHTML={{ __html: f.icon }}
                  style={{ marginBottom: 20, lineHeight: 0 }}
                />
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 17,
                    marginBottom: 10,
                    color: "#111827",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: TS, lineHeight: 1.7 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════ */}
      <section id="contact" style={{ padding: "120px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(30px, 5vw, 52px)",
              marginBottom: 40,
              lineHeight: 1.05,
              color: "#111827",
            }}
          >
            Ready to screen smarter?
          </h2>
          <a href="/login" className="btn-lime" style={{ fontSize: 16, padding: "16px 36px" }}>
            Try Out Now →
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: `1px solid ${SE}`,
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          maxWidth: "100%",
          background: S,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: L, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.08em",
              color: "#111827",
            }}
          >
            ENFUCE SCREEN
          </span>
        </div>
        <span style={{ fontSize: 13, color: TM }}>© 2026 Built on Enfuce infrastructure</span>
      </footer>
    </div>
  );
}

// ─── Case Review Mock ─────────────────────────────────────────────────────────
function CaseReviewMock() {
  const fields = [
    { label: "Full Name", customer: "Muhammad Al-Rashidi", match: true },
    { label: "Date of Birth", customer: "1974-03-15", match: true },
    { label: "Nationality", customer: "Jordanian", match: true },
    { label: "Passport No.", customer: "J08821445", match: false },
    { label: "Country", customer: "Amman, Jordan", match: false },
  ];

  const matching = ["Name similarity 94.2%", "DOB exact match", "Nationality match"];
  const conflicting = ["Passport digits differ", "Country mismatch"];

  return (
    <div
      style={{
        background: S,
        border: `1px solid ${SE}`,
        borderRadius: 8,
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${SE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: BG,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: TS,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Case #SAN-2847
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Muhammad Al-Rashidi</div>
        </div>
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 10,
            color: "#92400e",
            fontWeight: 700,
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          PENDING REVIEW
        </div>
      </div>

      {/* Body — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Left: field comparison */}
        <div style={{ padding: 20, borderRight: `1px solid ${SE}` }}>
          <div
            style={{
              fontSize: 10,
              color: TS,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            FIELD COMPARISON
          </div>
          {fields.map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  color: f.match ? GREEN : RED,
                  fontSize: 12,
                  marginTop: 2,
                  flexShrink: 0,
                  fontWeight: 700,
                }}
              >
                {f.match ? "✓" : "✗"}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: TS,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {f.label}
                </div>
                <div style={{ fontSize: 12, color: "#111827" }}>{f.customer}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: confidence + signals */}
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontSize: 10,
              color: TS,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            AI CONFIDENCE
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: 34,
              color: LT,
              marginBottom: 8,
              lineHeight: 1,
            }}
          >
            78%
          </div>
          {/* Meter */}
          <div
            style={{
              background: SE,
              height: 4,
              borderRadius: 2,
              marginBottom: 22,
              overflow: "hidden",
            }}
          >
            <div style={{ width: "78%", height: "100%", background: L, borderRadius: 2 }} />
          </div>

          {/* Matching signals */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 9,
                color: TS,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              MATCHING
            </div>
            {matching.map((sig) => (
              <div
                key={sig}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: GREEN,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: TS }}>{sig}</span>
              </div>
            ))}
          </div>

          {/* Conflicting signals */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: TS,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              CONFLICTING
            </div>
            {conflicting.map((sig) => (
              <div
                key={sig}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: RED,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: TS }}>{sig}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source row */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: `1px solid ${SE}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: BG,
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke={TM}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        <span style={{ fontSize: 11, color: TM }}>
          OFAC SDN List · UN Consolidated · EU Sanctions Map
        </span>
      </div>
    </div>
  );
}
