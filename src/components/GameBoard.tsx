"use client";

import { useState } from "react";
import { GameData, Message } from "@/types/game";
import { GlobalReportState } from "@/types/report";
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
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [view, setView] = useState<View>("map");
  const [fading, setFading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const globalReportState: GlobalReportState = {
    status: "idle",
    seq: 0,
    report: null,
  };
  const t = getText(language);

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

        {/* Right: stats + audio controls + accusation button */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {totalQuestions > 0 && (
            <span
              className="font-pixel hidden sm:block"
              style={{ fontSize: 6, color: "var(--dim)" }}
            >
              {totalQuestions} {t.game.questions}{totalQuestions !== 1 ? "S" : ""}
            </span>
          )}

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
              deliveryEvent={null}
              onConsumeDeliveryEvent={() => null}
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
    </div>
  );
}
