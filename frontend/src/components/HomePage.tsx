"use client";

import { useEffect, useState } from "react";
import AmbientParticles from "./visual/AmbientParticles";
import DynamicLight from "./visual/DynamicLight";
import ScanlineOverlay from "./visual/ScanlineOverlay";
import PixelCandle from "./visual/PixelCandle";
import { Language, getText } from "@/lib/i18n";

interface HomePageProps {
  onStartGame: () => void;
  error: string | null;
  language: Language;
  onChangeLanguage: (language: Language) => void;
}

export default function HomePage({
  onStartGame,
  error,
  language,
  onChangeLanguage,
}: HomePageProps) {
  
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const t = getText(language);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSubtitle(true), 600);
    const t2 = setTimeout(() => setShowBtn(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden room-bg wall-texture">

      {/* ── Layer 0: Scanlines ──────────────────────────────────── */}
      <ScanlineOverlay opacity={0.09} zIndex={10} />

      {/* ── Layer 1: Static spotlight cone ─────────────────────── */}
      <div className="spotlight absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      {/* ── Layer 2: Dynamic mouse-follow light ─────────────────── */}
      <DynamicLight intensity={0.07} rgbColor="212, 160, 23" lerp={0.055} zIndex={3} />

      {/* ── Layer 3: Ambient golden dust particles ──────────────── */}
      <AmbientParticles color="#d4a017" intensity={0.9} zIndex={4} />

      {/* ── Layer 4: Edge vignette ──────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 82% 82% at 50% 50%, transparent 38%, rgba(8,6,18,0.75) 100%)",
          zIndex: 5,
        }}
      />

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center gap-0 px-6 max-w-lg w-full" style={{ zIndex: 20 }}>

        {/* Candles flanking the card */}
        <div className="flex items-end justify-between w-full mb-6 px-4">
          <PixelCandle delay={0}   duration={2100} />
          <PixelCandle delay={380} duration={2500} />
        </div>

        {/* Badge */}
        <p className="badge badge-wine mb-5 tracking-widest">
          {t.home.badge}
        </p>

        {/* ── Title ───────────────────────────────────────────── */}
        <div className="text-center mb-2">
          <h1
            className="font-pixel glow-gold animate-glow-gold leading-relaxed"
            style={{ fontSize: "clamp(18px, 4vw, 30px)", color: "var(--gold-lt)" }}
          >
            Doppel
            <span style={{ color: "var(--cream)" }}>Mind</span>
          </h1>
        </div>

        {/* Gold divider */}
        <div className="pixel-divider w-full mb-6" />

        {/* ── Subtitle (staggered fade-in) ─────────────────────── */}
        <div
          className="text-center mb-10"
          style={{
            opacity: showSubtitle ? 1 : 0,
            transform: showSubtitle ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="font-vt mb-2 leading-relaxed" style={{ fontSize: 22, color: "var(--cream)" }}>
            {t.home.subtitle1}
          </p>
          <p className="font-vt" style={{ fontSize: 19, color: "var(--dim)" }}>
            {t.home.subtitle2}
          </p>
        </div>

        <div className="mb-8 w-full">
          <p className="font-pixel mb-3 text-center" style={{ fontSize: 6, color: "var(--gold-dk)" }}>
            {t.home.languageLabel}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onChangeLanguage("es")}
              className="btn-rpg btn-rpg-ghost btn-rpg-sm"
              style={{
                opacity: language === "es" ? 1 : 0.65,
                borderColor: language === "es" ? "var(--gold)" : undefined,
                color: language === "es" ? "var(--gold-lt)" : undefined,
              }}
            >
              {t.home.spanish}
            </button>
            <button
              onClick={() => onChangeLanguage("en")}
              className="btn-rpg btn-rpg-ghost btn-rpg-sm"
              style={{
                opacity: language === "en" ? 1 : 0.65,
                borderColor: language === "en" ? "var(--gold)" : undefined,
                color: language === "en" ? "var(--gold-lt)" : undefined,
              }}
            >
              {t.home.english}
            </button>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────── */}
        {error && (
          <div className="dialogue-wine w-full mb-8 px-5 py-3">
            <p className="font-vt" style={{ fontSize: 18, color: "var(--wine-lt)" }}>
              ⚠ {error}
            </p>
          </div>
        )}

        {/* ── CTA Button ───────────────────────────────────────── */}
        <div
          style={{
            opacity: showBtn ? 1 : 0,
            transform: showBtn ? "translateY(0) scale(1)" : "translateY(14px) scale(0.96)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
          }}
        >
          <button onClick={onStartGame} className="btn-rpg">
            {t.home.start}
          </button>
        </div>
        <div style={{ marginTop: 20, textAlign: "center" }}>
  <button
    onClick={() => setShowRules(true)}
    style={{
      padding: "10px 18px",
      fontFamily: "var(--font-pixel)",
      fontSize: 10,
      letterSpacing: "0.12em",
      background: "linear-gradient(180deg, #2a0000 0%, #120000 100%)",
      color: "#ff3b3b",
      border: "2px solid #8b0000",
      boxShadow: `
        0 0 8px rgba(255,0,0,0.6),
        0 0 18px rgba(255,0,0,0.4),
        inset 0 0 6px rgba(255,0,0,0.3)
      `,
      textTransform: "uppercase",
      cursor: "pointer",
    }}
  >
    RULES
  </button>
</div>

        {/* Footer */}
        <p
          className="font-pixel mt-10"
          style={{ fontSize: 6, color: "var(--dim)", letterSpacing: "0.15em" }}
        >
          POWERED BY MISTRAL AI · mistral-small-latest
        </p>
      </div>
      
{showRules && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(5,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
    }}
    onClick={() => setShowRules(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 480,
        background: "linear-gradient(180deg, #140000 0%, #0a0000 100%)",
        border: "2px solid #8b0000",
        boxShadow: "0 0 30px rgba(255,0,0,0.4)",
        padding: 24,
        color: "#ffcccc",
        fontFamily: "var(--font-vt)",
      }}
    >
      <h2
        style={{
          color: "#ff3b3b",
          fontFamily: "var(--font-pixel)",
          marginBottom: 16,
          textShadow: "0 0 8px rgba(255,0,0,0.6)",
        }}
      >
        GAME RULES
      </h2>

      <p>🕵️ Your mission is to identify the impostor.</p>
      <p>⚠ Be cautious with your questions — they are skilled deceivers.</p>
      <p>❓ You may ask up to <strong>5 questions</strong> initially.</p>
      <p>➕ After that, you can choose to ask <strong>2 additional questions</strong>.</p>
      <p>🚫 If you choose not to ask extra questions, you must decide.</p>
      <p>🎯 Maximum total questions: <strong>7</strong>.</p>
      <p>🧠 Analyze carefully before making your final decision.</p>

      <div style={{ marginTop: 20, textAlign: "right" }}>
        <button
          onClick={() => setShowRules(false)}
          style={{
            padding: "8px 14px",
            background: "#330000",
            border: "1px solid #aa0000",
            color: "#ff5555",
            cursor: "pointer",
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  </div>
)}

      {/* Floor line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--gold-dk), transparent)",
          zIndex: 20,
        }}
      />
    </div>
  );
}
