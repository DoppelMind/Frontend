"use client";

import { useEffect, useRef, useState } from "react";
import { GameData, Message } from "@/types/game";
import { GlobalReportState, LobbyDeliveryEvent } from "@/types/report";
import PixelCharacter from "./PixelCharacter";
import PixelLamp from "./visual/PixelLamp";
import { Language, formatConfidence, getText } from "@/lib/i18n";

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT  (% of map canvas)

   [ SALA-A ]══[ LOBBY ]══[ SALA-B ]
                   ║
               [ SALA-C ]
═══════════════════════════════════════════════════════════════════ */

interface Rect { left: string; top: string; width: string; height: string }

const LOBBY: Rect = { left: "38%", top: "14%", width: "24%", height: "40%" };

const ROOMS: Rect[] = [
  { left: "8%",  top: "14%", width: "24%", height: "40%" }, // 0 · Sala A
  { left: "68%", top: "14%", width: "24%", height: "40%" }, // 1 · Sala B
  { left: "38%", top: "58%", width: "24%", height: "40%" }, // 2 · Sala C
];

const CORRIDORS: (Rect & { dir: "h" | "v" })[] = [
  { left: "32%", top: "27%", width: "6%", height: "16%", dir: "h" },
  { left: "62%", top: "27%", width: "6%", height: "16%", dir: "h" },
  { left: "47%", top: "54%", width: "6%", height: "4%",  dir: "v" },
];

/* ═══════════════════════════════════════════════════════════════════
   COLOUR PALETTES — one per interrogation room
═══════════════════════════════════════════════════════════════════ */

const PALETTES = [
  {
    accent: "#16899e", rgb: "22,137,158",
    floor: "#060e14",  tile: "rgba(22,137,158,0.06)",
    label: "SALA-A",
    chairBody: "#0d2a35", chairLeg: "#071820",
  },
  {
    accent: "#d4a017", rgb: "212,160,23",
    floor: "#100e07",  tile: "rgba(212,160,23,0.05)",
    label: "SALA-B",
    chairBody: "#3a2c08", chairLeg: "#201806",
  },
  {
    accent: "#c42040", rgb: "196,32,64",
    floor: "#100608",  tile: "rgba(196,32,64,0.06)",
    label: "SALA-C",
    chairBody: "#350610", chairLeg: "#200408",
  },
] as const;

const LOBBY_PAL = { accent: "#5a4280", rgb: "90,66,128", floor: "#09071a", tile: "rgba(90,66,128,0.06)" };

/* ═══════════════════════════════════════════════════════════════════
   FLOOR TILE HELPER
═══════════════════════════════════════════════════════════════════ */

function tileFloor(floor: string, tile: string): React.CSSProperties {
  return {
    background: [
      `repeating-linear-gradient(90deg,${tile} 0,${tile} 1px,transparent 1px,transparent 28px)`,
      `repeating-linear-gradient(0deg,${tile} 0,${tile} 1px,transparent 1px,transparent 28px)`,
      floor,
    ].join(","),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PIXEL CHAIR — SVG pixel art, 12×9 viewBox
═══════════════════════════════════════════════════════════════════ */

function PixelChair({ bodyColor, legColor }: { bodyColor: string; legColor: string }) {
  return (
    <svg
      width={48} height={36}
      viewBox="0 0 12 9"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      aria-hidden
    >
      {/* Back rail top */}
      <rect x={1} y={0} width={10} height={1} fill={bodyColor} />
      {/* Back posts */}
      <rect x={1} y={0} width={1}  height={4} fill={bodyColor} />
      <rect x={10} y={0} width={1} height={4} fill={bodyColor} />
      {/* Back mid rail */}
      <rect x={1} y={2} width={10} height={1} fill={legColor} />
      {/* Seat */}
      <rect x={0} y={4} width={12} height={2} fill={bodyColor} />
      {/* Front legs */}
      <rect x={1} y={6} width={2}  height={3} fill={legColor} />
      <rect x={9} y={6} width={2}  height={3} fill={legColor} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INTERROGATION SCENE — character + chair + lamp + table
   Rendered inside each suspect room (inner clipped div)
═══════════════════════════════════════════════════════════════════ */

function InterrogationScene({
  pal,
  suspectIdx,
}: {
  pal: typeof PALETTES[number];
  suspectIdx: number;
}) {
  return (
    <>
      {/* ── Ceiling lamp ───────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 2, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 3,
      }}>
        <PixelLamp size={34} />
      </div>

      {/* Lamp light cone */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "80%", height: "58%",
        background: `radial-gradient(ellipse 70% 100% at 50% 0%,
          rgba(255,210,100,0.10) 0%,
          rgba(255,190,60,0.04)  40%,
          transparent            70%)`,
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* ── Wall / floor separator ─────────────────────────────── */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg,
          transparent,
          rgba(${pal.rgb},0.25),
          rgba(${pal.rgb},0.25),
          transparent)`,
        zIndex: 1,
      }} />

      {/* ── Seated suspect: character overlapping chair ─────────── */}
      <div style={{
        position: "absolute",
        top: "17%", left: "50%",
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        zIndex: 4,
      }}>
        {/* Character (standing sprite; lower body hidden by chair) */}
        <div style={{ zIndex: 2, lineHeight: 0 }}>
          <PixelCharacter variant={suspectIdx} scale={3} animated />
        </div>
        {/* Chair seat overlaps lower body → seated illusion */}
        <div style={{ marginTop: -22, zIndex: 1 }}>
          <PixelChair bodyColor={pal.chairBody} legColor={pal.chairLeg} />
        </div>
      </div>

      {/* ── Interrogation table ─────────────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 34, left: "10%", right: "10%", height: 14,
        background: "#080612",
        border: `1px solid rgba(${pal.rgb},0.40)`,
        boxShadow: [
          `0 3px 10px rgba(0,0,0,0.75)`,
          `inset 0 1px 0 rgba(${pal.rgb},0.22)`,
          `0 0 8px rgba(${pal.rgb},0.08)`,
        ].join(","),
        zIndex: 3,
      }}>
        {/* Surface glint */}
        <div style={{
          position: "absolute", top: 2, left: 6, right: 6, height: 1,
          background: `rgba(${pal.rgb},0.30)`,
        }} />
      </div>

      {/* Shadow cast by table on the floor */}
      <div style={{
        position: "absolute",
        bottom: 22, left: "16%", right: "16%", height: 6,
        background: "rgba(0,0,0,0.55)",
        filter: "blur(3px)",
        zIndex: 2,
      }} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOOLTIP
═══════════════════════════════════════════════════════════════════ */

function Tooltip({ visible, name, occupation, count, accent, language }: {
  visible: boolean; name: string; occupation: string; count: number; accent: string; language: Language;
}) {
  const t = getText(language);
  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 12px)",
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 6}px)`,
      zIndex: 60,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.2s ease, transform 0.2s ease",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      <div style={{
        position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `6px solid ${accent}`,
      }} />
      <div className="dialogue" style={{ padding:"10px 16px", borderColor:accent, boxShadow:`3px 3px 0 ${accent}44`, minWidth:170 }}>
        <p className="nameplate" style={{ fontSize:5, marginBottom:5, display:"inline-block" }}>
          {name.toUpperCase()}
        </p>
        <p className="font-vt" style={{ fontSize:16, color:"var(--warm)", lineHeight:1.35 }}>
          {occupation}
        </p>
        <p className="font-pixel" style={{ fontSize:5, marginTop:6, color: count > 0 ? accent : "var(--dim)", opacity: count > 0 ? 1 : 0.7 }}>
          {count > 0 ? `${count} ${language === "es" ? "PREGUNTA" : "QUESTION"}${count !== 1 ? "S" : ""}` : t.map.notInterrogated}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CORRIDOR
═══════════════════════════════════════════════════════════════════ */

function Corridor({ left, top, width, height, dir }: Rect & { dir: "h" | "v" }) {
  return (
    <div style={{
      position: "absolute", left, top, width, height, zIndex: 2,
      ...tileFloor("#080612", "rgba(90,66,128,0.035)"),
      borderTop:    dir === "h" ? `2px solid var(--border)` : "none",
      borderBottom: dir === "h" ? `2px solid var(--border)` : "none",
      borderLeft:   dir === "v" ? `2px solid var(--border)` : "none",
      borderRight:  dir === "v" ? `2px solid var(--border)` : "none",
    }} />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DESK CLERK — pixel NPC sitting at desk with laptop + folder
═══════════════════════════════════════════════════════════════════ */

function DeskClerk({ away = false }: { away?: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "4%", left: "51%",
      transform: "translateX(-50%)",
      width: 112, height: 58,
      zIndex: 10,
    }}>
      {/* Floor contact shadow */}
      <div style={{
        position: "absolute",
        left: 8,
        right: 8,
        bottom: -1,
        height: 7,
        background: "rgba(0,0,0,0.28)",
        filter: "blur(2px)",
        zIndex: 0,
      }} />
      {/* Placeholder hook for future sprite replacement:
          swap this entire desk block for `backgroundImage: url("/sprites/lobby_desk.png")` */}

      {/* ── Back chair (never blocks character) ─────────────────── */}
      <div style={{
        position: "absolute", top: 10, left: "50%",
        transform: "translateX(-50%)",
        width: 30, height: 18, zIndex: 1,
      }}>
        <div style={{ position: "absolute", top: 0, left: 5, width: 20, height: 8, background: "#2a3242", border: "1px solid #46506a" }} />
        <div style={{ position: "absolute", top: 8, left: 3, width: 24, height: 6, background: "#222a38", border: "1px solid #414b62" }} />
        <div style={{ position: "absolute", top: 14, left: 7, width: 3, height: 4, background: "#151922" }} />
        <div style={{ position: "absolute", top: 14, right: 7, width: 3, height: 4, background: "#151922" }} />
      </div>

      {/* ── Character — working at desk ─────────────────────────── */}
      {!away && (
        <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", lineHeight: 0, zIndex: 9 }}>
          <div className="map-typing-bob">
            {/* Back-facing placeholder sprite (ready to swap with real PNG sprite) */}
            <svg
              width={36}
              height={54}
              viewBox="0 0 12 18"
              shapeRendering="crispEdges"
              style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.38))" }}
              aria-hidden
            >
              {/* head/hair */}
              <rect x={3} y={0} width={6} height={2} fill="#1b2432" />
              <rect x={2} y={2} width={8} height={3} fill="#243146" />
              {/* neck */}
              <rect x={5} y={5} width={2} height={1} fill="#c99a72" />
              {/* shoulders / coat */}
              <rect x={1} y={6} width={10} height={5} fill="#22324a" />
              <rect x={2} y={7} width={8} height={4} fill="#2b3e5b" />
              {/* back highlight seam */}
              <rect x={5} y={6} width={2} height={5} fill="#415a7e" />
              {/* lower body */}
              <rect x={2} y={11} width={8} height={4} fill="#1d2a3f" />
              <rect x={2} y={15} width={3} height={3} fill="#0f1724" />
              <rect x={7} y={15} width={3} height={3} fill="#0f1724" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Workstation on desk ─────────────────────────────────── */}
      <div style={{ position: "absolute", top: 2, left: 9, zIndex: 7 }}>
        {/* Monitor frame */}
        <div style={{
          width: 38, height: 22, position: "relative", overflow: "hidden",
          background: "#121a24", border: "1px solid #5b6f8a",
          boxShadow: "0 0 10px rgba(85,210,255,0.24), inset 0 0 0 1px rgba(190,235,255,0.12)",
        }}>
          {/* Bright active screen */}
          <div style={{
            position: "absolute", inset: 2,
            background: "linear-gradient(to bottom, #123f61 0%, #0a2b43 65%, #09253b 100%)",
            boxShadow: "inset 0 0 9px rgba(120,230,255,0.25), 0 0 8px rgba(95,210,255,0.16)",
            overflow: "hidden",
          }}>
            {/* Subtle scanlines for modern monitor look */}
            <div style={{
              position: "absolute",
              inset: 0,
              opacity: 0.14,
              background: "repeating-linear-gradient(to bottom, rgba(220,245,255,0.2) 0px, rgba(220,245,255,0.2) 1px, transparent 1px, transparent 3px)",
            }} />
            {/* Scrolling code strip (2x height for seamless loop) */}
            <div className="map-screen-scroll" style={{ position: "absolute", inset: 0, animationDuration: "4.6s", opacity: 0.95 }}>
              {[0, 9].map((offset) => (
                <div key={offset} style={{ position: "absolute", top: offset, left: 0, right: 0 }}>
                  {[{ top: 1, w: 18 }, { top: 4, w: 26 }, { top: 7, w: 14 }].map(({ top, w }, i) => (
                    <div
                      key={`${offset}-${i}`}
                      style={{
                        position: "absolute",
                        left: 2,
                        top,
                        height: 1,
                        width: w,
                        background: "rgba(145,255,240,0.82)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="map-cursor-blink" style={{ position: "absolute", right: 3, bottom: 2, width: 1, height: 4, background: "#d6fff8" }} />
          </div>
          <div style={{ position: "absolute", top: 2, left: 2, width: 12, height: 1, background: "rgba(230,248,255,0.26)" }} />
        </div>
        {/* Monitor stand */}
        <div style={{ width: 5, height: 5, marginLeft: 16, background: "#2c3746", border: "1px solid #475467", borderTop: "none" }} />

        {/* Keyboard */}
        <div style={{
          width: 42, height: 8, marginTop: -1,
          background: "#202733", border: "1px solid #3d4a5d",
          boxShadow: "inset 0 1px 0 rgba(180,220,255,0.08)",
          position: "relative",
        }}>
          {[4, 8, 12, 16, 20, 24, 28, 32, 36].map((x) => (
            <div key={x} style={{ position: "absolute", left: x, top: 3, width: 2, height: 1, background: "#7e8da6" }} />
          ))}
        </div>
      </div>

      {/* ── Separate typing hands (2-3px motion) ───────────────── */}
      {!away && (
        <>
          <div className="map-hand-left" style={{
            position: "absolute", top: 31, left: 35, width: 6, height: 4,
            background: "#d9b58d", border: "1px solid #8f6a4b", zIndex: 8,
          }} />
          <div className="map-hand-right" style={{
            position: "absolute", top: 31, left: 45, width: 6, height: 4,
            background: "#d9b58d", border: "1px solid #8f6a4b", zIndex: 8,
          }} />
        </>
      )}

      {/* ── Folder + paper on desk ──────────────────────────────── */}
      <div style={{ position: "absolute", top: 13, right: 13, zIndex: 7 }}>
        <div style={{
          position: "absolute", top: -5, left: 4,
          width: 18, height: 14, background: "#eee2b7",
          border: "1px solid #c0ad7c", transform: "rotate(3deg)",
          boxShadow: "0 0 2px rgba(0,0,0,0.25)",
        }} />
        <div style={{ position: "relative", width: 24, height: 13, background: "#6a4b1c", border: "1px solid #8d6529" }}>
          <div style={{ position: "absolute", top: -4, left: 2, width: 10, height: 4, background: "#6a4b1c", border: "1px solid #8d6529", borderBottom: "none" }} />
          <div style={{ position: "absolute", top: 4, left: 3, right: 3, height: 1, background: "rgba(255,220,160,0.22)" }} />
          <div style={{ position: "absolute", top: 8, left: 3, right: 7, height: 1, background: "rgba(255,220,160,0.16)" }} />
        </div>
      </div>

      {/* ── Desk surface ─────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 25, left: 2, right: 2, height: 12,
        background: "#3a2f1f", border: "1px solid #5a4a34",
        boxShadow: "0 3px 0 #171109, 0 5px 7px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,220,170,0.12)",
        zIndex: 6,
      }}>
        <div style={{ position: "absolute", top: 2, left: 9, right: 9, height: 1, background: "rgba(255,225,190,0.20)" }} />
      </div>

      {/* ── Desk legs ────────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 37, left:  11, width: 5, height: 19, background: "#1a140d", zIndex: 5 }} />
      <div style={{ position: "absolute", top: 37, right: 11, width: 5, height: 19, background: "#1a140d", zIndex: 5 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LOBBY (decorative hub) — enhanced pixel-lab vibe
═══════════════════════════════════════════════════════════════════ */

function Lobby({
  clerkAway = false,
  mailboxHasReport = false,
  onOpenMailbox,
  language,
}: {
  clerkAway?: boolean;
  mailboxHasReport?: boolean;
  onOpenMailbox: () => void;
  language: Language;
}) {
  const t = getText(language);
  return (
    <div style={{
      position: "absolute",
      ...LOBBY,
      zIndex: 3,
      border: "2px solid #1f2330",
      overflow: "hidden",
      background: [
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)",
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)",
        "#565b63",
      ].join(","),
      boxShadow: "inset 0 0 24px rgba(0,0,0,0.45)",
    }}>
      {/* Floor zoning: lab tiles + desk carpet zone */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "linear-gradient(to bottom, transparent 0%, transparent 56%, rgba(232,236,242,0.24) 56%, rgba(232,236,242,0.24) 100%)",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute",
        left: "30%",
        right: "30%",
        bottom: "4%",
        height: "28%",
        pointerEvents: "none",
        background: "rgba(228,234,241,0.30)",
        border: "1px solid rgba(120,130,146,0.45)",
        boxShadow: "inset 0 0 8px rgba(255,255,255,0.12), 0 2px 10px rgba(0,0,0,0.22)",
        zIndex: 2,
      }} />

      {/* Dark walls */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: "#2b313e", borderBottom: "1px solid #161b24", zIndex: 2 }} />
      <div style={{ position: "absolute", left: 0, top: 10, bottom: 0, width: 8, background: "#303746", borderRight: "1px solid #1a202a", zIndex: 2 }} />
      <div style={{ position: "absolute", right: 0, top: 10, bottom: 0, width: 8, background: "#303746", borderLeft: "1px solid #1a202a", zIndex: 2 }} />
      {/* Top decorative panel lines */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, height: 1, background: "rgba(170,188,214,0.18)", zIndex: 2 }} />
      <div style={{ position: "absolute", top: 18, left: 12, right: 12, height: 1, background: "rgba(120,138,162,0.20)", zIndex: 2 }} />
      {/* Bottom dark baseboards */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "#1e2430", borderTop: "1px solid #0f131b", zIndex: 2 }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 12, background: "#212836", borderTop: "1px solid #0f131b", zIndex: 2 }} />
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 8, height: 12, background: "#212836", borderTop: "1px solid #0f131b", zIndex: 2 }} />

      {/* Label */}
      <div style={{ position:"absolute", top:2, left:0, right:0, display:"flex", justifyContent:"center", zIndex:4 }}>
        <span className="font-pixel" style={{ fontSize:5, color:"rgba(210,220,235,0.72)", letterSpacing:"0.18em" }}>{t.map.lobby}</span>
      </div>

      {/* Top back counter / cable trunk */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 8, background: "#3b4252", border: "1px solid #1d2430", zIndex: 3 }}>
        <div style={{ position: "absolute", top: 2, left: 6, width: 20, height: 1, background: "rgba(190,210,230,0.18)" }} />
        <div style={{ position: "absolute", top: 5, left: 32, width: 14, height: 1, background: "rgba(190,210,230,0.16)" }} />
        <div style={{ position: "absolute", top: 3, right: 10, width: 10, height: 1, background: "rgba(190,210,230,0.16)" }} />
      </div>

      {/* Left high shelving block (large visual mass) */}
      <div style={{ position: "absolute", left: 10, top: 22, width: 24, height: 44, background: "#384256", border: "1px solid #1f2735", boxShadow: "0 4px 8px rgba(0,0,0,0.26)", zIndex: 3 }}>
        {[6, 14, 22, 30, 38].map((y) => (
          <div key={y} style={{ position: "absolute", left: 2, right: 2, top: y, height: 1, background: "#212a39" }} />
        ))}
        <div style={{ position: "absolute", top: 3, left: 3, width: 7, height: 4, background: "#6d7f9a" }} />
        <div style={{ position: "absolute", top: 10, left: 12, width: 8, height: 4, background: "#8897b2" }} />
        <div style={{ position: "absolute", top: 18, left: 4, width: 9, height: 4, background: "#ad6b6b" }} />
        <div style={{ position: "absolute", top: 26, left: 13, width: 7, height: 4, background: "#4d9aa8" }} />
        <div style={{ position: "absolute", top: 34, left: 5, width: 10, height: 4, background: "#d49f2a" }} />
      </div>

      {/* Left lockers (secondary large object) */}
      <div style={{ position: "absolute", left: 36, top: 29, width: 16, height: 37, background: "#4a566b", border: "1px solid #253044", boxShadow: "0 3px 8px rgba(0,0,0,0.24)", zIndex: 3 }}>
        <div style={{ position: "absolute", top: 2, left: 2, right: 2, height: 15, border: "1px solid #6a7993" }} />
        <div style={{ position: "absolute", top: 19, left: 2, right: 2, height: 15, border: "1px solid #6a7993" }} />
        <div style={{ position: "absolute", top: 8, right: 4, width: 1, height: 2, background: "#9cb0d1" }} />
        <div style={{ position: "absolute", top: 25, right: 4, width: 1, height: 2, background: "#9cb0d1" }} />
      </div>

      {/* Right technical panel (large object) */}
      <div style={{ position: "absolute", right: 10, top: 22, width: 26, height: 36, background: "#2f394a", border: "1px solid #1b2330", boxShadow: "0 4px 8px rgba(0,0,0,0.28)", zIndex: 3 }}>
        <div style={{ position: "absolute", top: 4, left: 4, width: 8, height: 6, background: "#12222d", border: "1px solid #325369" }} />
        <div style={{ position: "absolute", top: 4, right: 4, width: 8, height: 6, background: "#12222d", border: "1px solid #325369" }} />
        <div style={{ position: "absolute", top: 13, left: 4, right: 4, height: 1, background: "#556077" }} />
        <div style={{ position: "absolute", top: 17, left: 4, width: 2, height: 2, background: "#33e07a" }} />
        <div style={{ position: "absolute", top: 17, left: 9, width: 2, height: 2, background: "#e0d83a" }} />
        <div style={{ position: "absolute", top: 17, left: 14, width: 2, height: 2, background: "#dd5757" }} />
        <div style={{ position: "absolute", top: 22, left: 4, right: 4, height: 1, background: "#556077" }} />
        <div style={{ position: "absolute", top: 26, left: 5, width: 14, height: 1, background: "rgba(200,220,245,0.4)" }} />
        <div style={{ position: "absolute", top: 29, left: 5, width: 10, height: 1, background: "rgba(200,220,245,0.35)" }} />
      </div>

      {/* Right side table */}
      <div style={{ position: "absolute", right: 39, top: 48, width: 20, height: 10, background: "#5a4a33", border: "1px solid #302316", boxShadow: "0 3px 7px rgba(0,0,0,0.24)", zIndex: 3 }}>
        <div style={{ position: "absolute", top: 2, left: 3, width: 6, height: 5, background: "#8b8f96" }} />
        <div style={{ position: "absolute", top: 2, left: 11, width: 6, height: 5, background: "#6b768b" }} />
      </div>

      {/* Water dispenser */}
      <div style={{ position: "absolute", right: 40, top: 22, width: 14, height: 30, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.24))", zIndex: 3 }}>
        <div style={{ width: 14, height: 10, background: "#76b8d9", border: "1px solid #24495d" }} />
        <div style={{ width: 14, height: 20, background: "#d9dee5", border: "1px solid #7c8798", borderTop: "none" }} />
        <div style={{ position: "absolute", top: 13, left: 4, width: 2, height: 3, background: "#3d81be" }} />
        <div style={{ position: "absolute", top: 13, left: 8, width: 2, height: 3, background: "#b84343" }} />
      </div>

      {/* Toolbox near clerk desk */}
      <div style={{ position: "absolute", left: 53, top: 55, width: 16, height: 9, background: "#7b3f2a", border: "1px solid #4a2217", boxShadow: "0 3px 6px rgba(0,0,0,0.24)", zIndex: 3 }}>
        <div style={{ position: "absolute", top: -3, left: 4, width: 8, height: 3, border: "1px solid #c59273", borderBottom: "none" }} />
      </div>

      {/* Plant */}
      <div style={{ position: "absolute", right: 12, bottom: 4, width: 14, height: 17, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.24))", zIndex: 3 }}>
        <div style={{ position: "absolute", bottom: 0, left: 2, width: 10, height: 6, background: "#5c4536", border: "1px solid #37271d" }} />
        <div style={{ position: "absolute", bottom: 7, left: 6, width: 2, height: 6, background: "#2f6b39" }} />
        <div style={{ position: "absolute", bottom: 11, left: 1, width: 5, height: 4, background: "#4f9b58" }} />
        <div style={{ position: "absolute", bottom: 12, left: 8, width: 5, height: 4, background: "#4f9b58" }} />
      </div>

      {/* Desk clerk at center-bottom */}
      <DeskClerk away={clerkAway} />

      {/* Mailbox lives inside lobby */}
      <button
        onClick={onOpenMailbox}
        aria-label={t.map.mailboxAria}
        style={{
          position: "absolute",
          right: 10,
          bottom: 8,
          width: 26,
          height: 22,
          zIndex: 25,
          border: "1px solid #5d4a24",
          background: "linear-gradient(to bottom, #745a2a 0%, #4d3a18 100%)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          cursor: mailboxHasReport ? "pointer" : "default",
        }}
      >
        <div style={{ position: "absolute", left: 4, right: 4, top: 8, height: 1, background: "#cda86a" }} />
        {mailboxHasReport && (
          <div className="mailbox-report-ping" style={{
            position: "absolute",
            top: -20,
            left: "50%",
            transform: "translateX(-50%)",
            lineHeight: 0,
          }}>
            <svg
              width={14} height={17}
              viewBox="0 0 7 9"
              shapeRendering="crispEdges"
              style={{ imageRendering: "pixelated", filter: "drop-shadow(0 0 3px rgba(212,160,23,0.9))" }}
              aria-hidden
            >
              {/* Paper body */}
              <rect x={0} y={1} width={5} height={8} fill="#ede0b0" />
              {/* Folded corner (top-right) */}
              <rect x={5} y={2} width={2} height={7} fill="#ede0b0" />
              <rect x={5} y={1} width={2} height={1} fill="#c9b87a" />
              <rect x={5} y={0} width={2} height={1} fill="#b0a060" />
              <rect x={6} y={1} width={1} height={1} fill="#c9b87a" />
              {/* Fold crease */}
              <rect x={5} y={2} width={1} height={1} fill="#c9b87a" />
              {/* Text lines */}
              <rect x={1} y={3} width={3} height={1} fill="#8a7040" />
              <rect x={1} y={5} width={4} height={1} fill="#8a7040" />
              <rect x={1} y={7} width={2} height={1} fill="#8a7040" />
              {/* Gold accent bar at top */}
              <rect x={0} y={1} width={5} height={1} fill="#d4a017" />
            </svg>
          </div>
        )}
      </button>

      {/* Ceiling light cone over desk */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "40%",
        width: "62%",
        height: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 55% at 50% 55%, rgba(235,244,255,0.20) 0%, rgba(215,230,250,0.11) 38%, transparent 70%)",
        zIndex: 9,
      }} />

      {/* Subtle ambient vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 32px rgba(0,0,0,0.38)", zIndex: 20 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUSPECT ROOM
═══════════════════════════════════════════════════════════════════ */

interface SuspectRoomProps {
  rect: Rect;
  pal: typeof PALETTES[number];
  suspect: GameData["suspects"][0];
  questionCount: number;
  idx: number;
  onSelect: () => void;
  language: Language;
}

function SuspectRoom({ rect, pal, suspect, questionCount, idx, onSelect, language }: SuspectRoomProps) {
  const t = getText(language);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position:"absolute", ...rect, zIndex:4, overflow:"visible", cursor:"pointer" }}
    >
      {/* ── Inner room (overflow:hidden clips scene, not box-shadows) ── */}
      <div style={{
        position: "absolute", inset:0, overflow:"hidden",
        ...tileFloor(pal.floor, pal.tile),
        border: `2px solid ${active ? pal.accent : "var(--border)"}`,
        boxShadow: active
          ? `0 0 32px rgba(${pal.rgb},0.38), 0 0 8px rgba(${pal.rgb},0.18), inset 0 0 20px rgba(${pal.rgb},0.07)`
          : "inset 0 0 22px rgba(0,0,0,0.45)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}>
        {/* Interrogation scene (lamp + character + chair + table) */}
        <InterrogationScene pal={pal} suspectIdx={idx} />

        {/* Top-left: room code */}
        <div style={{
          position:"absolute", top:6, left:8, zIndex:10,
          fontFamily:"var(--font-pixel),monospace", fontSize:5,
          color:`${pal.accent}88`, letterSpacing:"0.12em",
        }}>
          {pal.label}
        </div>

        {/* Top-right: question count badge */}
        {questionCount > 0 && (
          <div style={{
            position:"absolute", top:6, right:8, zIndex:10,
            fontFamily:"var(--font-pixel),monospace", fontSize:5,
            color:pal.accent, background:`rgba(${pal.rgb},0.12)`,
            border:`1px solid rgba(${pal.rgb},0.4)`, padding:"1px 5px",
          }}>
            {questionCount}P
          </div>
        )}

        {/* Bottom: room name strip */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, zIndex:10,
          background:`rgba(${pal.rgb},0.09)`,
          borderTop:`1px solid rgba(${pal.rgb},0.20)`, padding:"4px 8px",
        }}>
          <p className="font-vt" style={{ fontSize:12, color:`${pal.accent}cc`, textAlign:"center", letterSpacing:"0.05em" }}>
            {[t.map.roomA, t.map.roomB, t.map.roomC][idx]}
          </p>
        </div>

        {/* Spotlight cone (ambient, intensifies on hover) */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:5,
          background:`radial-gradient(ellipse 60% 50% at 50% -8%,
            rgba(${pal.rgb},${active ? 0.26 : 0.10}) 0%, transparent 70%)`,
          transition:"background 0.25s ease",
        }} />
      </div>

      {/* ── Hotspot button — sits below the scene, tooltip floats above ── */}
      <button
        className="map-hotspot-btn"
        onClick={onSelect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
        }}
        tabIndex={0}
        aria-label={`${language === "es" ? "Interrogar a" : "Interrogate"} ${suspect.name}`}
        style={{
          position: "absolute",
          /* 67% from top — sits in the lower third, below the table */
          top: "67%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
          padding: 14, zIndex: 15,
        }}
      >
        {/* Tooltip — fade + slide anchored above the hotspot */}
        <Tooltip
          visible={active}
          name={suspect.name}
          occupation={suspect.occupation ?? ""}
          count={questionCount}
          accent={pal.accent}
          language={language}
        />

        {/* Ring */}
        <div style={{ position:"relative", width:34, height:34, flexShrink:0 }}>
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            border:`2px solid ${pal.accent}`,
            boxShadow:`0 0 ${active ? 20 : 7}px rgba(${pal.rgb},${active ? 0.85 : 0.35})`,
            transition:"box-shadow 0.2s ease",
          }} />
          <div className="map-hotspot-ping" style={{
            position:"absolute", inset:0, borderRadius:"50%",
            border:`2px solid ${pal.accent}`,
            opacity: active ? 1 : 0.45,
            transition:"opacity 0.2s ease",
          }} />
          {/* Diamond */}
          <div style={{
            position:"absolute", top:"50%", left:"50%",
            transform:`translate(-50%,-50%) rotate(45deg) scale(${active ? 1.2 : 1})`,
            width:10, height:10, background:pal.accent,
            boxShadow:`0 0 ${active ? 14 : 8}px rgba(${pal.rgb},${active ? 1 : 0.85})`,
            transition:"transform 0.2s ease, box-shadow 0.2s ease",
          }} />
        </div>

        {/* Label */}
        <span className="font-pixel" style={{
          fontSize:5, letterSpacing:"0.1em", color:pal.accent,
          opacity: active ? 1 : 0.55, transition:"opacity 0.2s ease",
        }}>
          {active ? t.map.enter : suspect.name.split(" ")[0].toUpperCase()}
        </span>
      </button>
    </div>
  );
}

function DeliveryCourier({
  start,
  target,
  seq,
}: {
  start: { x: number; y: number };
  target: { x: number; y: number } | null;
  seq: number;
}) {
  const [visible, setVisible] = useState(false);
  const [carrying, setCarrying] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>(start);
  const [segDur, setSegDur] = useState("0s");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!target || seq === 0) return;

    // Waypoints: left → up → right → down to mailbox
    const lobbyLeft = parseFloat(LOBBY.left) + parseFloat(LOBBY.width) * 0.10;
    const lobbyTop  = parseFloat(LOBBY.top)  + parseFloat(LOBBY.height) * 0.65;
    const wp1 = { x: lobbyLeft,  y: start.y  }; // move left
    const wp2 = { x: lobbyLeft,  y: lobbyTop }; // move up
    const wp3 = { x: target.x,   y: lobbyTop }; // move right
    const wp4 = target;                           // move down to mailbox

    // Each segment: 0.62 s CSS transition + ~30 ms buffer before next setState
    const SEG = 650;

    setVisible(true);
    setCarrying(true);
    setSegDur("0s");   // snap to start with no animation
    setPos(start);

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const push = (fn: () => void, delay: number) =>
      timersRef.current.push(setTimeout(fn, delay));

    push(() => { setSegDur("0.62s"); setPos(wp1); }, 40);           // → left
    push(() => setPos(wp2),                           40 + SEG);     // → up
    push(() => setPos(wp3),                           40 + SEG * 2); // → right
    push(() => setPos(wp4),                           40 + SEG * 3); // → down (mailbox)
    push(() => setCarrying(false),                                40 + SEG * 4);       // drop paper
    push(() => { setSegDur("0.38s"); setPos({ x: target.x, y: start.y }); },
                                                                  40 + SEG * 4 + 500); // ↓ drop to floor level
    push(() => { setSegDur("0.75s"); setPos(start); },            40 + SEG * 4 + 880); // → walk to seat
    push(() => setVisible(false),                                 40 + SEG * 4 + 1630); // sit down

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [start.x, start.y, target?.x, target?.y, seq]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: "translate(-50%, -92%)",
        transition: `left ${segDur} linear, top ${segDur} linear`,
        zIndex: 24,
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "relative", lineHeight: 0, filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.7))" }}>
        <PixelCharacter variant="detective" scale={2} animated={false} />
        {carrying && (
          <div
            style={{
              position: "absolute",
              right: -6,
              top: 10,
              width: 8,
              height: 10,
              background: "#efe7c7",
              border: "1px solid #b6a774",
              boxShadow: "0 0 4px rgba(255,220,160,0.45)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ReportFileModal({
  visible,
  reportState,
  onClose,
  language,
}: {
  visible: boolean;
  reportState: GlobalReportState;
  onClose: () => void;
  language: Language;
}) {
  if (!visible || !reportState.report) return null;
  const report = reportState.report;
  const t = getText(language);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3,2,8,0.72)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        className="dialogue"
        style={{
          width: "min(760px, 88vw)",
          maxHeight: "76vh",
          overflowY: "auto",
          borderColor: "var(--gold-dk)",
          boxShadow: "6px 6px 0 rgba(212,160,23,0.35)",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <p className="nameplate" style={{ display: "inline-block", fontSize: 6 }}>
              {t.map.reportFile}
            </p>
            <p className="font-vt" style={{ fontSize: 22, color: "var(--warm)", marginTop: 8 }}>
              {t.map.reportCompare}
            </p>
          </div>
          <button onClick={onClose} className="btn-rpg btn-rpg-ghost btn-rpg-sm">{t.common.close}</button>
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <p className="font-vt" style={{ fontSize: 18, color: "var(--cream)", lineHeight: 1.4 }}>
            {report.summary}
          </p>
          <p className="font-pixel" style={{ fontSize: 5, marginTop: 8, color: "var(--dim)" }}>
            {t.map.sources}: {report.sourceCount} · {new Date(report.generatedAt).toLocaleTimeString()}
          </p>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {report.findings.length === 0 && (
            <div style={{ border: "1px solid var(--border)", padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
              <p className="font-vt" style={{ fontSize: 17, color: "var(--dim)" }}>
                {t.map.noConflicts}
              </p>
            </div>
          )}
          {report.findings.map((finding, idx) => (
            <div key={idx} style={{ border: "1px solid var(--border)", padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
              <p className="font-vt" style={{ fontSize: 18, color: "var(--gold-lt)" }}>{finding.title}</p>
              <p className="font-vt" style={{ fontSize: 16, color: "var(--cream)", marginTop: 4, lineHeight: 1.35 }}>
                {finding.detail}
              </p>
              <p className="font-pixel" style={{ fontSize: 5, marginTop: 6, color: "var(--dim)" }}>
                {t.map.confidence}: {formatConfidence(language, finding.confidence)} · {t.map.related}: {finding.relatedSuspects.join(" / ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAP HUB (main export)
═══════════════════════════════════════════════════════════════════ */

interface MapHubProps {
  gameData: GameData;
  interrogationHistories: Record<string, Message[]>;
  globalReportState: GlobalReportState;
  deliveryEvent: LobbyDeliveryEvent | null;
  onConsumeDeliveryEvent: () => void;
  onSelectSuspect: (id: string) => void;
  language: Language;
}

export default function MapHub({
  gameData,
  interrogationHistories,
  globalReportState,
  deliveryEvent,
  onConsumeDeliveryEvent,
  onSelectSuspect,
  language,
}: MapHubProps) {
  const t = getText(language);
  const qCount = (id: string) => Math.floor((interrogationHistories[id]?.length ?? 0) / 2);
  const [openMailboxReport, setOpenMailboxReport] = useState(false);
  const [courierSeq, setCourierSeq] = useState(0);
  const [clerkAway, setClerkAway] = useState(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mailboxHasReport = globalReportState.status === "ready" && !!globalReportState.report;

  useEffect(() => {
    if (!deliveryEvent) return;
    setCourierSeq(deliveryEvent.seq);
    setClerkAway(true);
    onConsumeDeliveryEvent();
    if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    // Must match DeliveryCourier's setVisible(false): 40 + SEG*4 + 1630 = 4270ms
    returnTimerRef.current = setTimeout(() => {
      setClerkAway(false);
    }, 4270);
  }, [deliveryEvent, onConsumeDeliveryEvent]);

  useEffect(() => {
    return () => {
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    };
  }, []);

  const courierStart = {
    x: parseFloat(LOBBY.left) + parseFloat(LOBBY.width) * 0.43,
    y: parseFloat(LOBBY.top) + parseFloat(LOBBY.height) * 0.96,
  };

  const mailboxTarget = {
    x: parseFloat(LOBBY.left) + parseFloat(LOBBY.width) * 0.86,
    y: parseFloat(LOBBY.top) + parseFloat(LOBBY.height) * 0.84,
  };

  return (
    <div className="h-full flex flex-col" style={{ background:"var(--void)" }}>

      {/* ── Map canvas ─────────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ minHeight:0 }}>

        {/* Background (clipped so children/tooltips can still overflow) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex:0 }}>
          <div className="absolute inset-0" style={{
            background:"#05030e",
            backgroundImage:[
              "repeating-linear-gradient(90deg,transparent 0,transparent 63px,rgba(255,255,255,0.011) 63px,rgba(255,255,255,0.011) 64px)",
              "repeating-linear-gradient(0deg,transparent 0,transparent 63px,rgba(255,255,255,0.011) 63px,rgba(255,255,255,0.011) 64px)",
            ].join(","),
          }} />
          <div className="absolute inset-0" style={{
            background:"radial-gradient(ellipse 70% 60% at 50% 38%, rgba(90,66,128,0.07) 0%, transparent 65%)",
          }} />
        </div>

        {/* Corridors */}
        {CORRIDORS.map((c,i) => <Corridor key={i} {...c} />)}

        {/* Lobby */}
        <Lobby
          clerkAway={clerkAway}
          mailboxHasReport={mailboxHasReport}
          onOpenMailbox={() => {
            if (mailboxHasReport && globalReportState.report) setOpenMailboxReport(true);
          }}
          language={language}
        />

        {/* Courier animation (lobby clerk delivering report to mailbox) */}
        <DeliveryCourier start={courierStart} target={mailboxTarget} seq={courierSeq} />

        {/* Suspect rooms */}
        {gameData.suspects.map((suspect, idx) => (
          <SuspectRoom
            key={suspect.id}
            rect={ROOMS[idx % ROOMS.length]}
            pal={PALETTES[idx % PALETTES.length]}
            suspect={suspect}
            questionCount={qCount(suspect.id)}
            idx={idx}
            onSelect={() => onSelectSuspect(suspect.id)}
            language={language}
          />
        ))}

        {/* Map title */}
        <div style={{ position:"absolute", top:10, left:14, zIndex:20 }}>
          <span className="font-pixel" style={{ fontSize:6, color:"var(--border2)", letterSpacing:"0.22em" }}>
            {t.map.mapTitle}
          </span>
        </div>

        {/* Keyboard hint */}
        <div style={{ position:"absolute", bottom:10, right:14, zIndex:20 }}>
          <span className="font-pixel" style={{ fontSize:5, color:"var(--dim)", letterSpacing:"0.12em" }}>
            {t.map.keyboardHint}
          </span>
        </div>

        {(globalReportState.status === "processing" || globalReportState.status === "delivering") && (
          <div style={{ position: "absolute", top: 10, right: 14, zIndex: 22 }}>
            <span className="font-pixel" style={{ fontSize: 5, color: "var(--gold-lt)", letterSpacing: "0.08em" }}>
              {globalReportState.status === "processing" ? t.map.processing : t.map.delivering}
            </span>
          </div>
        )}

        <ReportFileModal
          visible={openMailboxReport}
          reportState={globalReportState}
          onClose={() => setOpenMailboxReport(false)}
          language={language}
        />
      </div>

      {/* ── Bottom info strip ──────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-5 px-6"
        style={{
          height:70,
          background:"var(--abyss)",
          borderTop:"2px solid var(--gold-dk)",
          boxShadow:"0 -2px 0 var(--void), 0 -4px 0 var(--gold-dk)",
        }}
      >
        <div className="flex-1 min-w-0">
          {/* <span className="font-pixel" style={{ fontSize:6, color:"var(--gold-dk)", marginRight:10 }}>{t.map.situation}</span>
          <span className="font-vt" style={{ fontSize:17, color:"var(--dim)" }}>{gameData.case.crime}</span> */}
        </div>
        <div className="flex-shrink-0 text-right">
          {/* <p className="font-vt" style={{ fontSize:14, color:"var(--warm)" }}>{gameData.case.setting}</p> */}
          <p className="font-pixel mt-1" style={{ fontSize:5, color:"var(--border2)" }}>{gameData.case.time}</p>
        </div>
      </div>
    </div>
  );
}
