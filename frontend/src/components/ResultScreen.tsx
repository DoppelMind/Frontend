"use client";

import { useEffect, useState } from "react";
import { AccusationResult, Suspect } from "@/types/game";
import AmbientParticles from "./visual/AmbientParticles";
import ScanlineOverlay from "./visual/ScanlineOverlay";
import { Language, getText } from "@/lib/i18n";

interface ResultScreenProps {
  result: AccusationResult;
  suspects: Suspect[];
  onPlayAgain: () => void;
  language: Language;
}

export default function ResultScreen({
  result,
  suspects,
  onPlayAgain,
  language,
}: ResultScreenProps) {
  const culprit = suspects.find((s) => s.id === result.real_id);
  const t = getText(language);
  const unknownLabel = language === "es" ? "Desconocido" : "Unknown";
  const roomLabel = language === "es" ? "Sala de interrogatorio" : "Interrogation room";
  const safeRealName = result.real_name?.trim() || unknownLabel;
  const safeCulpritName = culprit?.name?.trim() || unknownLabel;
  const safeRealId = result.real_id?.trim() || culprit?.id?.trim() || "";
  const safeRoomName =
    safeRealId === "1"
      ? t.map.roomA
      : safeRealId === "2"
      ? t.map.roomB
      : safeRealId === "3"
      ? t.map.roomC
      : unknownLabel;
  const [visible, setVisible] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setShowCard(true), 800);
    const t3 = setTimeout(() => setShowSolution(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isWin = result.correct;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 room-bg wall-texture relative overflow-hidden"
    >
      {/* Background atmospheric tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isWin
            ? "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,175,116,0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(196,32,64,0.08) 0%, transparent 70%)",
        }}
      />
      {/* Scanlines */}
      <ScanlineOverlay opacity={0.08} />
      {/* Ambient particles — gold for win, wine-toned for loss */}
      <AmbientParticles
        color={isWin ? "#1aaf74" : "#c42040"}
        intensity={isWin ? 0.7 : 0.5}
      />

      <div
        className="relative z-10 max-w-xl w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s, transform 0.5s",
        }}
      >
        {/* ── Result Banner ──────────────────────────────────────── */}
        <div className="text-center mb-10">
          {isWin ? (
            <>
              <div
                className="font-pixel mb-5"
                style={{ fontSize: 40, color: "var(--jade-lt)", lineHeight: 1, filter: "drop-shadow(0 0 16px rgba(26,175,116,0.6))" }}
              >
                ★
              </div>
              <h1
                className="font-pixel glow-jade mb-4"
                style={{ fontSize: "clamp(14px, 3vw, 22px)", color: "var(--jade-lt)", lineHeight: 2 }}
              >
                {t.result.caseClosed}
              </h1>
              <div className="pixel-divider-dim mb-5" />
              <p className="font-vt mb-2" style={{ fontSize: 22, color: "var(--cream)" }}>
                {t.result.deductionsCorrect}
              </p>
              <p className="font-vt font-bold glow-gold" style={{ fontSize: 26, color: "var(--gold-lt)" }}>
                {t.result.realIs(safeRealName)}
              </p>
              <p className="font-vt" style={{ fontSize: 18, color: "var(--warm)" }}>
                {roomLabel}: {safeRoomName}
              </p>
            </>
          ) : (
            <>
              <div
                className="font-pixel mb-5"
                style={{ fontSize: 40, color: "var(--wine-lt)", lineHeight: 1, filter: "drop-shadow(0 0 16px rgba(196,32,64,0.6))" }}
              >
                ✕
              </div>
              <h1
                className="font-pixel glow-wine mb-4"
                style={{ fontSize: "clamp(12px, 2.5vw, 18px)", color: "var(--wine-lt)", lineHeight: 2 }}
              >
                {t.result.accusationWrong}
              </h1>
              <div className="pixel-divider-wine mb-5" />
              <p className="font-vt mb-2" style={{ fontSize: 22, color: "var(--cream)" }}>
                {t.result.killerEscapes}
              </p>
              <p className="font-vt font-bold" style={{ fontSize: 26, color: "var(--wine-lt)" }}>
                {t.result.realWas(safeRealName)}
              </p>
              <p className="font-vt" style={{ fontSize: 18, color: "var(--warm)" }}>
                {roomLabel}: {safeRoomName}
              </p>
            </>
          )}
        </div>

        {/* ── Culprit Card ──────────────────────────────────────── */}
        {culprit && (
          <div
            className={`mb-5 transition-all duration-500 ${showCard ? isWin ? "panel-jade" : "panel-wine" : "panel"}`}
            style={{
              padding: "20px 24px",
              opacity: showCard ? 1 : 0,
              transform: showCard ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s, transform 0.5s",
            }}
          >
            <div className="flex items-start gap-4">
              {/* Portrait placeholder */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  background: isWin ? "var(--jade)" : "var(--wine)",
                  border: `2px solid ${isWin ? "var(--jade-lt)" : "var(--wine-lt)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                {isWin ? "⚖" : "🗡"}
              </div>
              <div className="flex-1">
                <p
                  className="badge mb-2"
                  style={{ color: isWin ? "var(--jade-lt)" : "var(--wine-lt)", display: "inline-block" }}
                >
                  {t.result.culprit}
                </p>
                <p className="font-pixel" style={{ fontSize: 10, color: "var(--cream)", lineHeight: 2 }}>
                  {safeCulpritName}
                </p>
                <p className="font-vt" style={{ fontSize: 18, color: "var(--warm)" }}>
                  {culprit.occupation} · {culprit.relationship_to_victim}
                </p>
                {culprit.appearance && (
                  <p className="font-vt italic" style={{ fontSize: 16, color: "var(--dim)", marginTop: 4 }}>
                    {culprit.appearance}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Solution Scroll ───────────────────────────────────── */}
        <div
          className="mb-10 panel transition-all duration-500"
          style={{
            padding: "20px 24px",
            opacity: showSolution ? 1 : 0,
            transform: showSolution ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s, transform 0.5s",
          }}
        >
          <p className="badge badge-gold mb-4" style={{ display: "inline-block" }}>
            {t.result.solution}
          </p>
          <div className="pixel-divider-dim mb-4" />
          <p className="font-vt leading-relaxed" style={{ fontSize: 14, color: "var(--cream)" }}>
            {result.solution}
          </p>
        </div>

        {/* ── Play Again ────────────────────────────────────────── */}
        <div className="text-center">
          <button onClick={onPlayAgain} className="btn-rpg">
            {t.result.newInvestigation}
          </button>
          <p className="font-pixel mt-8" style={{ fontSize: 6, color: "var(--dim)", letterSpacing: "0.15em" }}>
            POWERED BY MISTRAL · mistral-small-latest
          </p>
        </div>
      </div>
    </div>
  );
}
