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

        {/* Footer */}
        <p
          className="font-pixel mt-10"
          style={{ fontSize: 6, color: "var(--dim)", letterSpacing: "0.15em" }}
        >
          POWERED BY MISTRAL AI · mistral-small-latest
        </p>
      </div>

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
