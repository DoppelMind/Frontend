"use client";

import { useEffect, useRef, useState } from "react";
import { SusOScanResult } from "@/types/game";
import { Language, getText } from "@/lib/i18n";

// ── Color driven by sus_level (accumulated suspicion) ────────────────────────
function levelColor(level: number): string {
  if (level <= 3) return "#33e07a";   // green  – innocent
  if (level <= 6) return "#d4a017";   // amber  – neutral / watch
  if (level <= 8) return "#e87030";   // orange – suspicious
  return "#c42040";                   // red    – highly suspicious
}

function levelGlow(level: number): string {
  if (level <= 3) return "rgba(51,224,122,0.65)";
  if (level <= 6) return "rgba(212,160,23,0.70)";
  if (level <= 8) return "rgba(232,112,48,0.72)";
  return "rgba(196,32,64,0.80)";
}

// LED segment color (each individual bar)
function ledColor(idx: number, level: number): string {
  if (idx >= level) return "rgba(255,255,255,0.07)";
  if (level <= 3)   return "#33e07a";
  if (level <= 6)   return "#d4a017";
  if (level <= 8)   return "#e87030";
  return "#c42040";
}

// Small tone dot color (secondary indicator)
const TONE_DOT: Record<string, string> = {
  warm:   "#d4a017",
  cold:   "#16899e",
  static: "#7a5a9a",
};

interface Props {
  susScan: SusOScanResult | null;
  suspectId: string;
  gameId: string;
  scanning: boolean;
  onScan: () => void;
  language: Language;
}

export default function SusOScanMeter({
  susScan,
  scanning,
  onScan,
  language,
}: Props) {
  const t = getText(language).interrogation.susoscan;
  const tone  = susScan?.tone ?? "static";
  const level = susScan?.sus_level ?? 5;

  // Animate level with ease-out cubic
  const [displayLevel, setDisplayLevel] = useState(level);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const start = displayLevel;
    const end   = level;
    if (start === end) return;
    const startTime  = performance.now();
    const duration   = 700;

    function step(now: number) {
      const t      = Math.min((now - startTime) / duration, 1);
      const eased  = 1 - Math.pow(1 - t, 3);
      const cur    = Math.round(start + (end - start) * eased);
      setDisplayLevel(cur);
      if (t < 1) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Primary color = accumulated sus_level
  const color = levelColor(displayLevel);
  const glow  = levelGlow(displayLevel);

  // Glitch animation only when no data yet (static + neutral starting level)
  const isNoData = !susScan;

  return (
    <div
      className={isNoData ? "susoscan-static" : undefined}
      style={{
        width: 168,
        background: "linear-gradient(180deg, #0f0b1a 0%, #0a0714 100%)",
        border: `1px solid ${color}99`,
        boxShadow: `0 0 20px ${glow}, inset 0 0 10px rgba(0,0,0,0.6)`,
        transition: "border-color 0.6s ease, box-shadow 0.6s ease",
        userSelect: "none",
      }}
    >
      {/* Top screws */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 7px 0" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e1a2e", border: "1px solid #333" }} />
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e1a2e", border: "1px solid #333" }} />
      </div>

      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "2px 8px 5px",
        borderBottom: `1px solid ${color}55`,
        background: `${color}0a`,
      }}>
        <span className="font-pixel" style={{ fontSize: 5.5, color, letterSpacing: "0.25em" }}>
          {t.title}
        </span>
        {/* Blink indicator */}
        <div
          className={susScan ? "susoscan-blink" : undefined}
          style={{
            width: 5, height: 5, borderRadius: "50%",
            background: susScan ? color : "#333",
            boxShadow: susScan ? `0 0 5px ${color}` : "none",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Screen */}
      <div style={{
        margin: "6px 7px",
        background: "#060410",
        border: `1px solid ${color}33`,
        padding: "7px 7px 6px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
          background: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)",
        }} />

        {/* LED bar (10 segments) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 2, marginBottom: 6, position: "relative", zIndex: 2 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              style={{
                height: 10,
                background: ledColor(i, displayLevel),
                border: "1px solid rgba(0,0,0,0.4)",
                transition: "background 0.4s ease-in-out",
                boxShadow: i < displayLevel ? `0 0 4px ${ledColor(i, displayLevel)}` : "none",
              }}
            />
          ))}
        </div>

        {/* Numeric level + tone badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, position: "relative", zIndex: 2 }}>
          <span className="font-pixel" style={{
            fontSize: 11,
            color,
            letterSpacing: "0.05em",
            textShadow: `0 0 8px ${color}`,
            transition: "color 0.6s ease, text-shadow 0.6s ease",
          }}>
            {String(displayLevel).padStart(2, "0")}/10
          </span>

          {/* Tone — secondary small indicator */}
          {susScan && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: TONE_DOT[tone],
                boxShadow: `0 0 4px ${TONE_DOT[tone]}`,
                flexShrink: 0,
              }} />
              <span className="font-pixel" style={{ fontSize: 4.5, color: TONE_DOT[tone], letterSpacing: "0.1em" }}>
                {t[tone as "warm" | "cold" | "static"]}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: `${color}44`, marginBottom: 6, transition: "background 0.6s ease" }} />

        {/* Narration */}
        <p
          className="font-vt"
          style={{
            fontSize: 13,
            color: susScan ? "var(--cream)" : "var(--dim)",
            fontStyle: "italic",
            lineHeight: 1.35,
            minHeight: 38,
            position: "relative",
            zIndex: 2,
          }}
        >
          {susScan ? susScan.narration : t.noSignal}
        </p>

        {/* Reason tags */}
        {susScan && susScan.reason_tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5, position: "relative", zIndex: 2 }}>
            {susScan.reason_tags.map((tag) => (
              <span
                key={tag}
                className="font-pixel"
                style={{
                  fontSize: 5,
                  padding: "2px 5px",
                  background: `${color}18`,
                  border: `1px solid ${color}55`,
                  color,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transition: "color 0.6s ease, border-color 0.6s ease",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SCAN button */}
      <div style={{ padding: "4px 7px 6px" }}>
        <button
          onClick={onScan}
          disabled={scanning}
          className="font-pixel"
          style={{
            width: "100%",
            padding: "7px 0",
            background: scanning
              ? "rgba(0,0,0,0.5)"
              : `linear-gradient(180deg, ${color}28 0%, ${color}14 100%)`,
            border: `1px solid ${color}${scanning ? "33" : "99"}`,
            color: scanning ? "var(--dim)" : color,
            fontSize: 7,
            letterSpacing: "0.2em",
            cursor: scanning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: scanning ? "none" : `0 0 8px ${color}44`,
          }}
        >
          {scanning ? t.scanning : t.scan}
        </button>
      </div>

      {/* Bottom screws */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 7px 4px" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e1a2e", border: "1px solid #333" }} />
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1e1a2e", border: "1px solid #333" }} />
      </div>
    </div>
  );
}
