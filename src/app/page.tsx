"use client";

import { useState } from "react";
import {
  GamePhase,
  GameData,
  AccusationResult,
  Message,
  SuspectEmotion,
} from "@/types/game";
import { startGame, interrogateSuspect, accuseSuspect, unlockExtra } from "@/lib/api";
import HomePage from "@/components/HomePage";
import LoadingScreen from "@/components/LoadingScreen";
import GameBoard from "@/components/GameBoard";
import ResultScreen from "@/components/ResultScreen";
import { Language, getText } from "@/lib/i18n";

export default function DoppelMindApp() {
  const [phase, setPhase] = useState<GamePhase>("home");
  const [language, setLanguage] = useState<Language>("es");
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [interrogationHistories, setInterrogationHistories] = useState<
    Record<string, Message[]>
  >({});
  const [accusationResult, setAccusationResult] = useState<AccusationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interrogating, setInterrogating] = useState(false);
  const [reqChecked, setReqChecked] = useState<Record<string, boolean[]>>({});

  const handleToggleReq = (suspectId: string, i: number) => {
    setReqChecked((prev) => {
      const current = prev[suspectId] ?? [];
      const next = [...current];
      next[i] = !next[i];
      return { ...prev, [suspectId]: next };
    });
  };
  const t = getText(language);

  const [showExtraModal, setShowExtraModal] = useState(false);


  // ── Game lifecycle ──────────────────────────────────────────────────────

  const handleStartGame = async () => {
    setPhase("loading");
    setError(null);
    try {
      const data = await startGame(language);
      setGameData(data as unknown as GameData);
      setSelectedSuspectId(null);
      setInterrogationHistories({});
      setAccusationResult(null);
      setReqChecked({});
      setPhase("investigation");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.startGame);
      setPhase("home");
    }
  };

  const handleSelectSuspect = (suspectId: string) => {
    setSelectedSuspectId(suspectId);
  };

  const handleInjectMessage = (suspectId: string, message: Message) => {
    setInterrogationHistories((prev) => ({
      ...prev,
      [suspectId]: [...(prev[suspectId] ?? []), message],
    }));
  };

  const handleAskQuestion = async (question: string) => {
    if (!gameData || !selectedSuspectId || interrogating) return;

    setInterrogating(true);

    // Optimistically add the detective message
    const userMsg: Message = {
      role: "detective",
      content: question,
      timestamp: Date.now(),
    };
    setInterrogationHistories((prev) => ({
      ...prev,
      [selectedSuspectId]: [...(prev[selectedSuspectId] ?? []), userMsg],
    }));

    try {
      const { answer, emotion, sus_scan, sus_level } = await interrogateSuspect(
        gameData.game_id,
        selectedSuspectId,
        question,
        language
      );

      const suspectMsg: Message = {
        role: "suspect",
        content: answer,
        timestamp: Date.now(),
        emotion: emotion as SuspectEmotion,
        sus_scan,
        sus_level,
      };
      setInterrogationHistories((prev) => ({
        ...prev,
        [selectedSuspectId]: [...(prev[selectedSuspectId] ?? []), suspectMsg],
      }));
    } catch (err: any) {
      // Roll back the optimistic user message on error
      setInterrogationHistories((prev) => ({
        ...prev,
        [selectedSuspectId]: (prev[selectedSuspectId] ?? []).slice(0, -1),
      }));

      const detail = err?.response?.data?.detail || err?.message || "";

      if (detail === "BASE_LIMIT_REACHED") {
        setShowExtraModal(true);
        return;
      }

      if (detail === "MAX_LIMIT_REACHED") {
        setError("Ya no puedes hacer más preguntas a este sospechoso.");
        return;
      }

      setError(err instanceof Error ? err.message : t.errors.interrogation);
    } finally {
      setInterrogating(false);
    }
  };
  
  const handleUnlockExtra = async () => {
  if (!gameData || !selectedSuspectId) return;

  try {
    await unlockExtra(gameData.game_id, selectedSuspectId);
    setShowExtraModal(false);
  } catch {
    setError(t.game.extraUnlockError);
  }
};

  const handleAccuse = async (suspectId: string) => {
    if (!gameData) return;
    setPhase("accusing");
    try {
      const result = await accuseSuspect(gameData.game_id, suspectId);
      console.log("[accuse payload]", result);
      const fallbackName = language === "es" ? "Desconocido" : "Unknown";
      const safeResult: AccusationResult = {
        ...result,
        real_name: result.real_name?.trim() || fallbackName,
      };
      setAccusationResult(safeResult);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.accusation);
      setPhase("investigation");
    }
  };

  const handlePlayAgain = () => {
    setPhase("home");
    setGameData(null);
    setSelectedSuspectId(null);
    setInterrogationHistories({});
    setAccusationResult(null);
    setReqChecked({});
    setError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 text-gray-100">
      {phase === "home" && (
        <HomePage
          onStartGame={handleStartGame}
          error={error}
          language={language}
          onChangeLanguage={setLanguage}
        />
      )}

      {phase === "loading" && <LoadingScreen language={language} />}

      {(phase === "investigation" || phase === "accusing") && gameData && (
        <GameBoard
          gameData={gameData}
          selectedSuspectId={selectedSuspectId}
          interrogationHistories={interrogationHistories}
          onSelectSuspect={handleSelectSuspect}
          onAskQuestion={handleAskQuestion}
          onAccuse={handleAccuse}
          interrogating={interrogating}
          isAccusing={phase === "accusing"}
          globalError={error}
          onClearError={() => setError(null)}
          onInjectMessage={handleInjectMessage}
          reqChecked={reqChecked}
          onToggleReq={handleToggleReq}
          language={language}
        />
      )}

            {phase === "result" && accusationResult && gameData && (
        <ResultScreen
          result={accusationResult}
          suspects={gameData.suspects}
          onPlayAgain={handlePlayAgain}
          language={language}
        />
      )}

      {showExtraModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
    <div
      className="px-10 py-8 border-2"
      style={{
        background: "linear-gradient(145deg, #0c0a14, #141022)",
        borderColor: "var(--gold-dk)",
        boxShadow: "0 0 25px rgba(212,160,23,0.25)",
        width: 520,
      }}
    >
      {/* Línea superior decorativa */}
      <div
        style={{
          height: 2,
          background: "rgba(212,160,23,0.3)",
          marginBottom: 24,
        }}
      />

      <p
        className="mb-8 font-pixel text-center"
        style={{
          color: "var(--cream)",
          fontSize: "14px",
          letterSpacing: "0.08em",
          lineHeight: "1.6",
        }}
      >
        {t.game.extraUsedBase}
        <br />
        {t.game.extraUnlockAsk}
      </p>

      <div className="flex gap-6 justify-center">
        <button
          onClick={handleUnlockExtra}
          style={{
            border: "2px solid var(--gold-dk)",
            background: "var(--gold-dk)",
            color: "#000",
            padding: "10px 26px",
            fontFamily: "var(--font-pixel)",
            fontSize: "12px",
            letterSpacing: "0.1em",
            boxShadow: "3px 3px 0 #000",
          }}
        >
          {t.common.yes}
        </button>

        <button
          onClick={() => setShowExtraModal(false)}
          style={{
            border: "2px solid var(--gold-dk)",
            background: "transparent",
            color: "var(--gold-lt)",
            padding: "10px 26px",
            fontFamily: "var(--font-pixel)",
            fontSize: "12px",
            letterSpacing: "0.1em",
            boxShadow: "3px 3px 0 #000",
          }}
        >
          {t.common.no}
        </button>
      </div>

      {/* Línea inferior decorativa */}
      <div
        style={{
          height: 2,
          background: "rgba(212,160,23,0.3)",
          marginTop: 24,
        }}
      />
    </div>
  </div>
)}

    </main>
  );
}
