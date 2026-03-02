"use client";

import { useEffect, useState } from "react";
import AmbientParticles from "./visual/AmbientParticles";
import ScanlineOverlay from "./visual/ScanlineOverlay";
import { Language, getText } from "@/lib/i18n";

interface LoadingScreenProps {
  language: Language;
}

export default function LoadingScreen({ language }: LoadingScreenProps) {
  const t = getText(language);
  const loadingMsgs = t.loading.messages;
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % loadingMsgs.length);
    }, 2200);
    return () => clearInterval(msgTimer);
  }, [loadingMsgs.length]);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  useEffect(() => {
    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 4, 92));
    }, 180);
    return () => clearInterval(progTimer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center room-bg wall-texture relative overflow-hidden">
      <ScanlineOverlay opacity={0.10} />
      <AmbientParticles color="#d4a017" intensity={0.6} />
      <div className="spotlight absolute inset-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-sm w-full">

        {/* Magnifying glass pixel art */}
        <div className="animate-idle-float" style={{ fontSize: 56, lineHeight: 1, filter: "drop-shadow(0 0 12px rgba(212,160,23,0.5))" }}>
          🔍
        </div>

        {/* Title */}
        <div className="text-center">
          <h2
            className="font-pixel glow-gold"
            style={{ fontSize: 11, color: "var(--gold-lt)", lineHeight: 2 }}
          >
            {t.loading.title}
          </h2>
          <div className="pixel-divider mt-3 mb-4" />
        </div>

        {/* Progress bar (pixel style) */}
        <div className="w-full" style={{ border: "2px solid var(--border)", background: "var(--void)", padding: 3 }}>
          <div
            className="h-4 transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--gold-dk), var(--gold), var(--gold-lt))",
              boxShadow: "0 0 8px rgba(212,160,23,0.6)",
              imageRendering: "pixelated",
            }}
          />
        </div>
        <p className="font-pixel" style={{ fontSize: 6, color: "var(--gold)", marginTop: -20 }}>
          {Math.floor(progress)}%
        </p>

        {/* Rotating loading message */}
        <div
          className="dialogue w-full px-5 py-4 text-center"
          style={{ minHeight: 64 }}
        >
          <p
            className="font-vt leading-snug"
            style={{ fontSize: 20, color: "var(--cream)" }}
          >
            {loadingMsgs[msgIdx]}
            <span style={{ color: "var(--gold)" }}>{"...".slice(0, dots)}</span>
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-dot-bounce"
              style={{
                width: 8,
                height: 8,
                background: "var(--gold)",
                animationDelay: `${i * 180}ms`,
                boxShadow: "0 0 6px rgba(212,160,23,0.7)",
                imageRendering: "pixelated",
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="font-pixel" style={{ fontSize: 6, color: "var(--dim)", letterSpacing: "0.15em" }}>
          mistral-large-latest
        </p>
      </div>
    </div>
  );
}
