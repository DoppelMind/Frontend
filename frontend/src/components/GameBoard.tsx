"use client";

import { useEffect, useRef, useState } from "react";
import { GameData, Message } from "@/types/game";
import { analyzeSuspect } from "@/lib/api";
import { GlobalInconsistencyReport, GlobalReportState, InconsistencyFinding, LobbyDeliveryEvent } from "@/types/report";
import MapHub from "./MapHub";
import InterrogationRoom from "./InterrogationRoom";
import AccusationModal from "./AccusationModal";
import CasePanel from "./CasePanel";
import { Language, getText } from "@/lib/i18n";

type View = "map" | "interrogate";

interface GameBoardProps {
  gameData: GameData;
  selectedSuspectId: string | null;
  interrogationHistories: Record<string, Message[]>;
  onSelectSuspect: (id: string) => void;
  onAskQuestion: (question: string) => void;
  onAccuse: (suspectId: string) => void;
  interrogating: boolean;
  isAccusing: boolean;
  globalError: string | null;
  onClearError: () => void;
  onInjectMessage: (suspectId: string, message: Message) => void;
  reqChecked?: Record<string, boolean[]>;
  onToggleReq?: (suspectId: string, i: number) => void;
  language: Language;
}

export default function GameBoard({
  gameData,
  selectedSuspectId,
  interrogationHistories,
  onSelectSuspect,
  onAskQuestion,
  onAccuse,
  interrogating,
  isAccusing,
  globalError,
  onClearError,
  onInjectMessage,
  reqChecked = {},
  onToggleReq,
  language,
}: GameBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [view, setView] = useState<View>("map");
  const [fading, setFading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [globalReportState, setGlobalReportState] = useState<GlobalReportState>({
    status: "idle",
    seq: 0,
    report: null,
  });
  const [reportRequestedOnce, setReportRequestedOnce] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [deliveryEvent, setDeliveryEvent] = useState<LobbyDeliveryEvent | null>(null);
  const timersRef = useRef<{ delivering?: ReturnType<typeof setTimeout> }>({});
  const t = getText(language);

  useEffect(() => {
    timersRef.current = {};
    setGlobalReportState({ status: "idle", seq: 0, report: null });
    setReportRequestedOnce(false);
    setDeliveryEvent(null);
  }, [gameData.game_id]);

  /** Smooth fade transition between views */
  const navigate = (nextView: View, suspectId?: string) => {
    setFading(true);
    setTimeout(() => {
      if (suspectId) {
        onSelectSuspect(suspectId);
        // Inyectar el testimonio inicial solo si el historial está vacío
        const history = interrogationHistories[suspectId] ?? [];
        if (history.length === 0) {
          const suspect = gameData.suspects.find((s) => s.id === suspectId);
          if (suspect?.initial_statement) {
            onInjectMessage(suspectId, {
              role: "suspect",
              content: suspect.initial_statement,
              timestamp: Date.now(),
            });
          }
        }
      }
      setView(nextView);
      setFading(false);
    }, 220);
  };

  const requestContradictionReport = () => {
    if (reportRequestedOnce) return;
    setShowReportConfirm(true);
  };

  const runContradictionReport = async () => {
    setShowReportConfirm(false);
    setReportRequestedOnce(true);

    if (timersRef.current.delivering) clearTimeout(timersRef.current.delivering);
    const seq = Date.now();
    setGlobalReportState({ status: "processing", seq, report: null });

    try {
      // Analyze all suspects in parallel with Mistral
      const results = await Promise.allSettled(
        gameData.suspects.map((s) => analyzeSuspect(gameData.game_id, s.id))
      );

      // Map Mistral results → InconsistencyFinding[]
      const findings: InconsistencyFinding[] = [];
      let sourceCount = 0;
      let totalContradictions = 0;
      const perSuspectSummary: string[] = [];

      results.forEach((result, i) => {
        const suspect = gameData.suspects[i];
        const history = interrogationHistories[suspect.id] ?? [];
        sourceCount += history.filter((m) => m.role === "suspect").length;

        if (result.status === "rejected") return;
        const ar = result.value;
        totalContradictions += ar.contradictions.length;

        const scoreLabel =
          ar.suspicion_score >= 70
            ? (language === "es" ? "alta sospecha" : "high suspicion")
            : ar.suspicion_score >= 40
            ? (language === "es" ? "sospecha moderada" : "moderate suspicion")
            : (language === "es" ? "baja sospecha" : "low suspicion");

        perSuspectSummary.push(`${suspect.name} ${ar.suspicion_score}/100`);

        const confidence =
          ar.suspicion_score >= 70
            ? (language === "es" ? "alta" : "high")
            : ar.suspicion_score >= 40
            ? (language === "es" ? "media" : "medium")
            : (language === "es" ? "baja" : "low");

        ar.contradictions.forEach((c) => {
          findings.push({
            title: `${suspect.name} · ${scoreLabel}`,
            detail: c,
            confidence,
            relatedSuspects: [suspect.name],
          });
        });
      });

      const summaryScores = perSuspectSummary.join(", ");
      const summary =
        totalContradictions > 0
          ? language === "es"
            ? `Análisis Mistral — ${summaryScores}. ${totalContradictions} contradicción(es) detectada(s).`
            : `Mistral Analysis — ${summaryScores}. ${totalContradictions} contradiction(s) detected.`
          : language === "es"
          ? `Análisis Mistral — ${summaryScores}. Sin contradicciones; se recomienda continuar el interrogatorio.`
          : `Mistral Analysis — ${summaryScores}. No contradictions found; keep interrogating.`;

      const report: GlobalInconsistencyReport = {
        generatedAt: Date.now(),
        summary,
        findings,
        sourceCount,
      };

      setGlobalReportState({ status: "delivering", seq, report });
      setDeliveryEvent({ seq });

      timersRef.current.delivering = setTimeout(() => {
        setGlobalReportState((prev) => {
          if (prev.seq !== seq) return prev;
          return { ...prev, status: "ready" };
        });
      }, 1900);
    } catch {
      // On total failure, reset so the user can retry
      setGlobalReportState({ status: "idle", seq: 0, report: null });
      setReportRequestedOnce(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timersRef.current.delivering) clearTimeout(timersRef.current.delivering);
    };
  }, []);

  const selectedSuspect =
    gameData.suspects.find((s) => s.id === selectedSuspectId) ?? null;

  const currentMessages = selectedSuspectId
    ? interrogationHistories[selectedSuspectId] ?? []
    : [];

  const totalQuestions = gameData.suspects.reduce(
    (sum, s) => sum + Math.floor((interrogationHistories[s.id]?.length ?? 0) / 2),
    0
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--void)" }}>

      {/* ── Header / HUD bar ───────────────────────────────────── */}
      <header
        className="flex-shrink-0 px-5 py-2 flex items-center justify-between gap-4"
        style={{
          background: "var(--abyss)",
          borderBottom: "2px solid var(--gold-dk)",
          boxShadow: "0 2px 0 var(--void), 0 4px 0 var(--gold-dk)",
        }}
      >
        {/* Left: logo + case title */}
        <div className="flex items-center gap-3 min-w-0">
          
          <span
            className="font-pixel glow-gold animate-glow-gold flex-shrink-0"
            style={{ fontSize: 9, color: "var(--gold-lt)" }}
          >
            DoppelMind
          </span>
          <span style={{ color: "var(--border2)", fontSize: 14 }}>｜</span>
          <span
            className="font-vt truncate"
            style={{ fontSize: 18, color: "var(--warm)" }}
          >
            {gameData.case.title}
          </span>

        </div>

        {/* Right: stats + audio controls + report button + accusation button */}
        <div className="flex items-center gap-4 flex-shrink-0">
          

          {/* Audio controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled((e) => !e)}
              className="btn-rpg btn-rpg-ghost btn-rpg-sm"
              style={{ fontSize: 6, padding: "8px 12px" }}
              title={audioEnabled ? t.game.disableVoice : t.game.enableVoice}
            >
              {audioEnabled ? t.game.voiceOn : t.game.voiceOff}
            </button>
            {audioEnabled && (
              <div className="flex items-center gap-1 hidden sm:flex">
                <span className="font-pixel" style={{ fontSize: 5, color: "var(--dim)" }}>
                  VOL
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="vol-slider"
                  title={`${t.game.volumeTitle}: ${Math.round(volume * 100)}%`}
                />
              </div>
            )}
          </div>

          <button
            onClick={requestContradictionReport}
            title={t.game.reportButton}
            aria-label={t.game.reportButton}
            disabled={
              reportRequestedOnce ||
              globalReportState.status === "processing" ||
              globalReportState.status === "delivering"
            }
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--gold-dk)",
              background: "linear-gradient(to bottom, #f2e7c3, #cfbb88)",
              color: "#3b2d13",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 10px rgba(212,160,23,0.22)",
              cursor: "pointer",
              opacity:
                reportRequestedOnce ||
                globalReportState.status === "processing" ||
                globalReportState.status === "delivering"
                  ? 0.65
                  : 1,
            }}
          >
            <svg
              width={16} height={19}
              viewBox="0 0 8 10"
              shapeRendering="crispEdges"
              style={{ imageRendering: "pixelated" }}
              aria-hidden
            >
              {/* Paper body */}
              <rect x={0} y={1} width={6} height={9} fill="#2b1f0a" />
              {/* Folded corner (top-right) */}
              <rect x={6} y={2} width={2} height={8} fill="#2b1f0a" />
              <rect x={6} y={1} width={2} height={1} fill="#1a1208" />
              <rect x={6} y={0} width={2} height={1} fill="#110c05" />
              {/* Fold crease */}
              <rect x={6} y={2} width={1} height={1} fill="#1a1208" />
              {/* Gold accent bar at top */}
              <rect x={0} y={1} width={6} height={1} fill="#d4a017" />
              {/* Text lines */}
              <rect x={1} y={3} width={3} height={1} fill="#7a6030" />
              <rect x={1} y={5} width={5} height={1} fill="#7a6030" />
              <rect x={1} y={7} width={2} height={1} fill="#7a6030" />
            </svg>
          </button>

          <button
            onClick={() => setShowAccuseModal(true)}
            disabled={isAccusing}
            className="btn-rpg btn-rpg-wine btn-rpg-sm"
          >
            {isAccusing ? t.game.processing : t.game.choose}
          </button>
        </div>
      </header>

      {/* ── Global error bar ───────────────────────────────────── */}
      {globalError && (
        <div
          className="flex-shrink-0 px-5 py-2 flex items-center justify-between gap-4"
          style={{
            background: "var(--wine-dk)",
            borderBottom: "2px solid var(--wine)",
          }}
        >
          <p className="font-vt" style={{ fontSize: 18, color: "var(--wine-lt)" }}>
            ⚠ {globalError}
          </p>
          <button
            onClick={onClearError}
            className="font-pixel"
            style={{ fontSize: 7, color: "var(--wine-lt)" }}
          >
            {t.game.closeError}
          </button>
        </div>
      )}

      {/* ── Main area: sidebar + view ──────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Case info sidebar ──────────────────────────────────── */}
        <aside
          className="flex-shrink-0 overflow-y-auto"
          style={{
            width: 260,
            background: "var(--abyss)",
            borderRight: "2px solid var(--border)",
          }}
        >
          <CasePanel caseData={gameData.case} language={language} />
        </aside>

        {/* ── MapHub or InterrogationRoom ────────────────────────── */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            opacity: fading ? 0 : 1,
            transition: "opacity 0.22s ease",
          }}
        >
          {view === "map" ? (
            <MapHub
              gameData={gameData}
              interrogationHistories={interrogationHistories}
              globalReportState={globalReportState}
              deliveryEvent={deliveryEvent}
              onConsumeDeliveryEvent={() => setDeliveryEvent(null)}
              onSelectSuspect={(id) => navigate("interrogate", id)}
              language={language}
            />
          ) : (
            <InterrogationRoom
              gameId={gameData.game_id}
              suspect={selectedSuspect}
              messages={currentMessages}
              onAskQuestion={onAskQuestion}
              interrogating={interrogating}
              suspectIndex={gameData.suspects.findIndex(s => s.id === selectedSuspectId)}
              onBackToMap={() => navigate("map")}
              audioEnabled={audioEnabled}
              volume={volume}
              requirements={gameData.requirements ?? []}
              reqChecked={selectedSuspectId ? (reqChecked[selectedSuspectId] ?? []) : []}
              onToggleReq={selectedSuspectId ? (i) => onToggleReq?.(selectedSuspectId, i) : undefined}
              language={language}
            />
          )}
        </div>
      </div>

      {/* ── Report Confirm Modal ───────────────────────────────── */}
      {showReportConfirm && (
        <div
          className="animate-fadein"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(4,2,10,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowReportConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #0f0b1a 0%, #080510 100%)",
              border: "2px solid var(--gold-dk)",
              boxShadow: "0 0 32px rgba(212,160,23,0.28), 4px 4px 0 #000",
              padding: "0",
              width: 320,
              userSelect: "none",
            }}
          >
            {/* Title bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px",
              borderBottom: "2px solid var(--gold-dk)",
              background: "rgba(212,160,23,0.08)",
            }}>
              {/* Pixel document icon */}
              <svg width={14} height={16} viewBox="0 0 7 8" shapeRendering="crispEdges" style={{ imageRendering: "pixelated", flexShrink: 0 }}>
                <rect x={0} y={0} width={5} height={8} fill="#ede0b0" />
                <rect x={5} y={1} width={2} height={7} fill="#ede0b0" />
                <rect x={5} y={0} width={2} height={1} fill="#c8b880" />
                <rect x={5} y={1} width={1} height={1} fill="#c8b880" />
                <rect x={0} y={1} width={5} height={1} fill="#d4a017" />
                <rect x={1} y={3} width={3} height={1} fill="#8a7040" />
                <rect x={1} y={5} width={4} height={1} fill="#8a7040" />
                <rect x={1} y={7} width={2} height={1} fill="#8a7040" />
              </svg>
              <span className="font-pixel" style={{ fontSize: 6, color: "var(--gold-lt)", letterSpacing: "0.15em" }}>
                {t.game.reportButton.toUpperCase()}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 18px 16px" }}>
              {/* Scanline decoration */}
              <div style={{
                background: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(212,160,23,0.03) 3px, rgba(212,160,23,0.03) 4px)",
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
              }} />
              <p
                className="font-vt"
                style={{
                  fontSize: 18,
                  color: "var(--cream)",
                  lineHeight: 1.4,
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t.game.reportConfirm}
              </p>

              {/* YES / NO buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", position: "relative", zIndex: 1 }}>
                <button
                  onClick={() => setShowReportConfirm(false)}
                  className="btn-rpg btn-rpg-ghost btn-rpg-sm font-pixel"
                  style={{ fontSize: 7, minWidth: 72 }}
                >
                  ✕ {t.common.no}
                </button>
                <button
                  onClick={runContradictionReport}
                  className="btn-rpg btn-rpg-sm font-pixel"
                  style={{ fontSize: 7, minWidth: 72 }}
                >
                  ✓ {t.common.yes}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {view === "map" && (
  <button
    onClick={() => setShowRules(true)}
    style={{
      position: "fixed",
      bottom: 14,
      left: 265,
      padding: "12px 18px",
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
      zIndex: 150,
    }}
  >
    RULES
  </button>
)}

      {/* ── Accusation Modal ──────────────────────────────────── */}
      {showAccuseModal && (
        <AccusationModal
          suspects={gameData.suspects}
          onAccuse={(suspectId) => {
            setShowAccuseModal(false);
            onAccuse(suspectId);
          }}
          onClose={() => setShowAccuseModal(false)}
          language={language}
        />
      )}
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
    </div>
  );
}