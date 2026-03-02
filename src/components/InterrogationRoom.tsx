"use client";

import { useState, useRef, useEffect } from "react";
import { Suspect, Message } from "@/types/game";
import PixelCharacter from "./PixelCharacter";
import DynamicLight from "./visual/DynamicLight";
import ScanlineOverlay from "./visual/ScanlineOverlay";
import PixelLamp from "./visual/PixelLamp";
import { narrateText, scanSuspect, ScanHintResult, transcribeInterrogationVoice } from "@/lib/api";
import { Language, getText } from "@/lib/i18n";
import { hasProfanity } from "@/lib/profanity";
import { suggestQuestion } from "@/lib/api";
import SusOScanMeter from "./SusOScanMeter";
import { SusOScanResult } from "@/types/game";

// Per-emotion badge accent colors (matches sprite animation palette)
const EMOTION_BADGE_COLORS: Record<string, string> = {
  calm:      "#5a9a8a",
  nervous:   "#c8a040",
  angry:     "#c42040",
  sad:       "#6080b0",
  defensive: "#b07030",
  confident: "#f5c842",
  fearful:   "#9060c0",
};


interface InterrogationRoomProps {
  gameId: string;
  suspect: Suspect | null;
  messages: Message[];
  onAskQuestion: (question: string) => void;
  interrogating: boolean;
  suspectIndex: number;
  onBackToMap: () => void;
  audioEnabled: boolean;
  volume: number;
  requirements?: string[];
  reqChecked?: boolean[];
  onToggleReq?: (i: number) => void;
  language: Language;
}

/**
 * Renders a message's text content.
 * While the typewriter is active for this message, the last revealed character
 * gets the `char-appear` CSS animation (blur→sharp fade-in), and a blinking
 * cursor is appended. All prior characters render as plain text.
 */
function MessageText({
  content,
  fullContent,
  isActive,
}: {
  content: string;
  fullContent: string;
  isActive: boolean;
}) {
  const isDone = !isActive || content.length >= fullContent.length;

  if (isDone) {
    return <>{fullContent}</>;
  }

  const head = content.slice(0, -1);
  const tail = content.slice(-1);

  return (
    <>
      {head}
      {tail && <span className="char-appear">{tail}</span>}
      <span className="typing-cursor">|</span>
    </>
  );
}

/** Empty state — detective waiting for a suspect to be selected */
function EmptyState({ language }: { language: Language }) {
  const t = getText(language);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 room-bg wall-texture relative overflow-hidden">
      <div className="spotlight absolute inset-0 pointer-events-none" />
      <ScanlineOverlay opacity={0.1} zIndex={2} />
      <DynamicLight intensity={0.05} lerp={0.04} zIndex={3} />

      <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>
        <div className="animate-candle mb-1" style={{ animationDuration: "2.8s" }}>
          <PixelLamp size={52} />
        </div>
        <div className="mb-8 mt-3">
          <PixelCharacter variant="detective" scale={6} animated />
        </div>
        <div className="dialogue max-w-xs w-full px-6 py-5">
          <p className="nameplate inline-block mb-3">{t.common.detective}</p>
          <p className="font-vt leading-relaxed" style={{ fontSize: 19, color: "var(--cream)" }}>
            {t.interrogation.emptyState}
          </p>
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="font-vt" style={{ fontSize: 16, color: "var(--dim)", fontStyle: "italic" }}>
              {t.interrogation.onlyChance}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Interrogation Room
═══════════════════════════════════════════════════════════════════ */
export default function InterrogationRoom({
  gameId,
  suspect,
  messages,
  onAskQuestion,
  interrogating,
  suspectIndex,
  onBackToMap,
  audioEnabled,
  volume,
  requirements = [],
  reqChecked = [],
  onToggleReq,
  language,
}: InterrogationRoomProps) {
  const t = getText(language);
  const [showCard, setShowCard] = useState(false);

const generateId = () => {
  return "ZX-" + Math.floor(100000 + Math.random() * 900000);
};

const [cardId] = useState(generateId());
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const [typewriterMsgIdx, setTypewriterMsgIdx] = useState<number | null>(null);
  const [typewriterPos, setTypewriterPos] = useState(0);
  const [showScrollModal, setShowScrollModal] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [profanityError, setProfanityError] = useState(false);
  const [deviceScan, setDeviceScan] = useState<SusOScanResult | null>(null);
  const [deviceLevel, setDeviceLevel] = useState(5);
  const [scanHint, setScanHint] = useState<ScanHintResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showSusoScan, setShowSusoScan] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [pendingSendAfterStop, setPendingSendAfterStop] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Derive current dominant emotion from the latest suspect message
  const currentEmotion = [...messages]
    .reverse()
    .find((m) => m.role === "suspect" && m.emotion)?.emotion;

  // ── Audio narration ──────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Guarda audio pendiente si el autoplay fue bloqueado
  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Actualizar volumen en tiempo real cuando cambia el slider
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Detener audio si el usuario desactiva la voz
  useEffect(() => {
    if (!audioEnabled && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      pendingAudioRef.current = null;
      setAutoplayBlocked(false);
    }
  }, [audioEnabled]);

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interrogating]);

  // Reset typewriter + stop audio + device when switching suspect
  useEffect(() => {
    setTypewriterMsgIdx(null);
    setTypewriterPos(0);
    prevCountRef.current = messages.length;
    setDeviceScan(null);
    setDeviceLevel(5);
    setScanHint(null);
    setVoiceMode(false);
    setVoiceRecording(false);
    setVoicePaused(false);
    setVoiceBlob(null);
    setVoiceError(null);
    setVoiceProcessing(false);
    setPendingSendAfterStop(false);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspect?.id]);

  // Sync deviceScan from latest suspect message that has sus_scan
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "suspect" && m.sus_scan);
    if (last?.sus_scan) {
      setDeviceScan(last.sus_scan);
      setDeviceLevel(last.sus_level ?? 5);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleScan = async () => {
    if (scanning || interrogating || !suspect) return;
    setScanning(true);
    try {
      const result = await scanSuspect(gameId, suspect.id);
      setScanHint(result);
    } catch { /* silently ignore */ }
    finally { setScanning(false); }
  };

  // Activate typewriter + narrate when a new suspect message arrives
  useEffect(() => {
    const newCount = messages.length;
    if (newCount > prevCountRef.current) {
      const lastIdx = newCount - 1;
      const lastMessage = messages[lastIdx];

      if (lastMessage?.role === "suspect") {
        // Start typewriter
        setTypewriterMsgIdx(lastIdx);
        setTypewriterPos(0);

        // Stop previous audio immediately
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        // Narrate with ElevenLabs — silent fallback on TTS error (text still shown)
        if (suspect && audioEnabled) {
          const level = lastMessage.sus_level ?? deviceLevel ?? 5;
          const tone = lastMessage.sus_scan?.tone ?? deviceScan?.tone ?? "static";
          narrateText(lastMessage.content, suspect.id, lastMessage.emotion ?? "calm", level, tone)
            .then((audio) => {
              audio.volume = volume;
              audioRef.current = audio;
              audio.play().catch(() => {
                // Autoplay bloqueado por el browser — guardamos para reproducir al click
                pendingAudioRef.current = audio;
                setAutoplayBlocked(true);
              });
            })
            .catch(() => {
              // TTS failed — text is already visible, no error UI needed
            });
        }
      }
    }
    prevCountRef.current = newCount;
  }, [messages, suspect]);

  // Advance the typewriter one character per tick
  useEffect(() => {
    if (typewriterMsgIdx === null) return;
    const fullText = messages[typewriterMsgIdx]?.content ?? "";
    if (typewriterPos >= fullText.length) return;
    const id = setTimeout(() => setTypewriterPos((p) => p + 1), 22);
    return () => clearTimeout(id);
  }, [typewriterMsgIdx, typewriterPos, messages]);

  const getContent = (msg: Message, idx: number) =>
    typewriterMsgIdx === idx && typewriterPos < msg.content.length
      ? msg.content.slice(0, typewriterPos)
      : msg.content;

  // Reproducir audio pendiente cuando el usuario hace click
  const handlePlayPending = () => {
    if (pendingAudioRef.current) {
      pendingAudioRef.current.volume = volume;
      pendingAudioRef.current.play().catch(console.error);
      pendingAudioRef.current = null;
    }
    setAutoplayBlocked(false);
  };

  const handleDiscardVoice = () => {
    setPendingSendAfterStop(false);
    setVoiceBlob(null);
    setVoiceError(null);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setVoiceRecording(false);
    setVoicePaused(false);
  };

  const submitVoiceBlob = async (blob: Blob) => {
    if (!suspect || !blob || voiceProcessing) return;
    setVoiceProcessing(true);
    setVoiceError(null);
    try {
      const filename = blob.type.includes("wav") ? "question.wav" : "question.webm";
      const { transcript } = await transcribeInterrogationVoice(blob, filename, language);
      if (!transcript.trim()) {
        setVoiceError(t.interrogation.voiceFallback);
        return;
      }
      setQuestion(transcript);
      const sendDirect = window.confirm(t.interrogation.voiceConfirmSend);
      if (sendDirect) {
        onAskQuestion(transcript);
        setQuestion("");
      }
      setVoiceBlob(null);
      audioChunksRef.current = [];
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : t.interrogation.voiceFallback);
    } finally {
      setVoiceProcessing(false);
    }
  };

  const handleStartVoice = async () => {
    if (voiceRecording || interrogating || voiceProcessing) return;
    setVoiceError(null);
    setVoiceBlob(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        setVoiceBlob(blob.size > 0 ? blob : null);
        setVoiceRecording(false);
        setVoicePaused(false);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        if (pendingSendAfterStop && blob.size > 0) {
          setPendingSendAfterStop(false);
          await submitVoiceBlob(blob);
        }
      };
      recorder.start(250);
      setVoiceRecording(true);
      setVoicePaused(false);
    } catch {
      setVoiceError(t.interrogation.voiceFallback);
      handleDiscardVoice();
    }
  };

  const handlePauseResumeVoice = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setVoicePaused(true);
      return;
    }
    if (recorder.state === "paused") {
      recorder.resume();
      setVoicePaused(false);
    }
  };

  const handleSendVoice = async () => {
    if (voiceProcessing) return;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setPendingSendAfterStop(true);
      recorder.stop();
      return;
    }
    if (voiceBlob) {
      await submitVoiceBlob(voiceBlob);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || interrogating || !suspect) return;
    if (hasProfanity(question)) {
      setProfanityError(true);
      return;
    }
    // Cancel any in-progress audio so the new answer is heard immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    pendingAudioRef.current = null;
    setAutoplayBlocked(false);
    onAskQuestion(question.trim());
    setQuestion("");
  };

  const handleSuggest = async () => {
    if (!suspect || suggesting || interrogating) return;
    setSuggesting(true);
    try {
      const res = await suggestQuestion(gameId, suspect.id);
      setQuestion(res.suggested_question);
    } catch {
      // silently ignore — user can type manually
    } finally {
      setSuggesting(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────────
  if (!suspect) return <EmptyState language={language} />;

  // ── Interrogation view ───────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ background: "var(--void)", position: "relative" }}>

      {/* ── Botón pergamino pixel art SVG ─────────────────────── */}
      {requirements.length > 0 && (
        <button
          onClick={() => setShowScrollModal((v) => !v)}
          title={t.interrogation.seeEvidence}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 50,
            background: "none", border: "none", cursor: "pointer", padding: 0,
            filter: showScrollModal
              ? "drop-shadow(0 0 8px rgba(212,160,23,0.95))"
              : "drop-shadow(0 0 3px rgba(212,160,23,0.4))",
            transition: "filter 0.2s",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 11 11" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
            {/* Marco exterior madera */}
            <rect x="0" y="0" width="11" height="11" fill="#6a3a10" />
            <rect x="0" y="0" width="11" height="1" fill="#b86820" />
            <rect x="0" y="0" width="1" height="11" fill="#b86820" />
            <rect x="10" y="0" width="1" height="11" fill="#3a1a04" />
            <rect x="0" y="10" width="11" height="1" fill="#3a1a04" />
            {/* Relleno dorado */}
            <rect x="1" y="1" width="9" height="9" fill="#d4a017" />
            <rect x="2" y="2" width="7" height="7" fill="#e8c040" />
            <rect x="2" y="2" width="7" height="1" fill="#f5d870" />
            <rect x="2" y="2" width="1" height="7" fill="#f5d870" />
            <rect x="8" y="3" width="1" height="6" fill="#9a7010" />
            <rect x="3" y="8" width="6" height="1" fill="#9a7010" />
            {/* Pergamino mini centrado */}
            <rect x="4" y="3" width="3" height="5" fill="#fdf0c0" />
            <rect x="3" y="3" width="5" height="1" fill="#c8901a" />
            <rect x="3" y="7" width="5" height="1" fill="#c8901a" />
            <rect x="3" y="4" width="1" height="3" fill="#c8901a" />
            <rect x="7" y="4" width="1" height="3" fill="#c8901a" />
            {/* Líneas texto */}
            <rect x="5" y="4" width="1" height="1" fill="#a07830" />
            <rect x="5" y="6" width="1" height="1" fill="#a07830" />
          </svg>
        </button>
      )}

      {/* ── Botón Sus-O-Scan (debajo del scroll) ──────────────── */}
      <button
        onClick={() => setShowSusoScan((v) => !v)}
        title="Sus-O-Scan"
        style={{
          position: "absolute", top: 64, right: 12, zIndex: 50,
          background: "none", border: "none", cursor: "pointer", padding: 0,
          filter: showSusoScan
            ? `drop-shadow(0 0 8px ${deviceScan ? { warm: "rgba(212,160,23,0.95)", cold: "rgba(22,137,158,0.95)", static: "rgba(90,66,128,0.95)" }[deviceScan.tone] : "rgba(90,66,128,0.95)"})`
            : "drop-shadow(0 0 3px rgba(90,66,128,0.45))",
          transition: "filter 0.2s",
        }}
      >
        {/* Pixel-art scanner handheld icon */}
        <svg width="44" height="44" viewBox="0 0 11 11" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
          {/* Device body */}
          <rect x="1" y="0" width="9" height="11" fill="#1a0d2e" />
          <rect x="1" y="0" width="9" height="1"  fill="#3a2060" />
          <rect x="1" y="0" width="1" height="11" fill="#3a2060" />
          <rect x="9" y="0" width="1" height="11" fill="#0e0820" />
          <rect x="1" y="10" width="9" height="1"  fill="#0e0820" />
          {/* Screen */}
          <rect x="2" y="1" width="7" height="6" fill="#060410" />
          <rect x="2" y="1" width="7" height="1" fill="#5a4280" />
          {/* LED bar: 5 segs */}
          {[2,3,4,5,6].map((x,i) => (
            <rect key={x} x={x} y={3} width={1} height={2}
              fill={deviceScan && deviceLevel > i*2
                ? (deviceLevel<=3?"#33e07a":deviceLevel<=6?"#d4a017":deviceLevel<=8?"#e87030":"#c42040")
                : "#1a1030"} />
          ))}
          {/* Tone dot */}
          <rect x="4" y="6" width="1" height="1"
            fill={deviceScan ? { warm:"#d4a017", cold:"#16899e", static:"#7a5a9a" }[deviceScan.tone] : "#333"} />
          {/* SCAN label pixels */}
          <rect x="2" y="8"  width="1" height="1" fill="#5a4280" />
          <rect x="4" y="8"  width="1" height="1" fill="#5a4280" />
          <rect x="6" y="8"  width="1" height="1" fill="#5a4280" />
          <rect x="8" y="8"  width="1" height="1" fill="#5a4280" />
          {/* Button bottom */}
          <rect x="3" y="9"  width="5" height="1" fill="#7a5a9a" />
        </svg>
      </button>

      {/* ── Panel Sus-O-Scan deslizante ────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 64,
          right: 60,   /* a la izquierda de los 44px de botón + 4px margen */
          zIndex: 48,
          transform: showSusoScan ? "translateX(0)" : "translateX(calc(100% + 72px))",
          opacity: showSusoScan ? 1 : 0,
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease",
          pointerEvents: showSusoScan ? "auto" : "none",
        }}
      >
        <SusOScanMeter
          susScan={deviceScan}
          susLevel={deviceLevel}
          scanHint={scanHint}
          suspectId={suspect.id}
          gameId={gameId}
          scanning={scanning}
          onScan={handleScan}
          language={language}
        />
      </div>

      {/* ── Modal pergamino SVG + checklist ───────────────────── */}
      {showScrollModal && requirements.length > 0 && (
        <div
          className="animate-fadein"
          style={{ position: "absolute", top: 62, right: 12, zIndex: 49, width: 270 }}
        >
          <div style={{ position: "relative" }}>
            {/* Pergamino SVG fondo */}
            <svg
              width="270" viewBox="0 0 54 90" shapeRendering="crispEdges"
              style={{ imageRendering: "pixelated", display: "block", width: "100%", height: "auto" }}
            >
              {/* Sombra */}
              <rect x="2" y="2" width="52" height="88" fill="rgba(0,0,0,0.35)" />
              {/* Cuerpo */}
              <rect x="0" y="7" width="52" height="76" fill="#b87818" />
              <rect x="1" y="8" width="50" height="74" fill="#d49828" />
              <rect x="2" y="9" width="48" height="72" fill="#e8b840" />
              {/* Papel */}
              <rect x="5" y="12" width="42" height="66" fill="#fdf0b8" />
              <rect x="6" y="13" width="40" height="64" fill="#fffae0" />
              {/* Borde papel sutil */}
              <rect x="5" y="12" width="1" height="66" fill="rgba(160,100,20,0.3)" />
              <rect x="5" y="12" width="42" height="1" fill="rgba(160,100,20,0.3)" />
              {/* Rodillo superior */}
              <rect x="0" y="3" width="52" height="7" fill="#8a5010" />
              <rect x="1" y="4" width="50" height="5" fill="#b87020" />
              <rect x="2" y="5" width="48" height="3" fill="#d49030" />
              <rect x="2" y="5" width="48" height="1" fill="#e8b050" />
              {/* Tornillos sup */}
              <rect x="1" y="4" width="3" height="5" fill="#6a3a08" />
              <rect x="2" y="5" width="1" height="3" fill="#b87020" />
              <rect x="48" y="4" width="3" height="5" fill="#6a3a08" />
              <rect x="49" y="5" width="1" height="3" fill="#b87020" />
              {/* Rodillo inferior */}
              <rect x="0" y="80" width="52" height="7" fill="#8a5010" />
              <rect x="1" y="81" width="50" height="5" fill="#b87020" />
              <rect x="2" y="82" width="48" height="3" fill="#d49030" />
              <rect x="2" y="84" width="48" height="1" fill="#6a3808" />
              {/* Tornillos inf */}
              <rect x="1" y="81" width="3" height="5" fill="#6a3a08" />
              <rect x="2" y="82" width="1" height="3" fill="#b87020" />
              <rect x="48" y="81" width="3" height="5" fill="#6a3a08" />
              <rect x="49" y="82" width="1" height="3" fill="#b87020" />
              {/* Bordes laterales */}
              <rect x="0" y="7" width="2" height="76" fill="#b87020" />
              <rect x="50" y="7" width="2" height="76" fill="#7a4808" />
            </svg>

            {/* Contenido HTML sobre el SVG */}
            <div
              style={{
                position: "absolute",
                top: "17%", left: "13%", right: "13%", bottom: "10%",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}
            >
              <p className="font-pixel text-center mb-1" style={{ fontSize: 6, color: "#6a3a08", letterSpacing: "0.12em" }}>
                {t.interrogation.keyEvidence}
              </p>
              <p className="font-pixel text-center mb-2" style={{ fontSize: 5, color: "#9a6020" }}>
                {t.interrogation.checked(reqChecked.filter(Boolean).length, requirements.length)}
              </p>
              <div style={{ overflowY: "auto", flex: 1, paddingRight: 2 }} className="space-y-1">
                {requirements.map((req, i) => (
                  <button
                    key={i}
                    onClick={() => onToggleReq?.(i)}
                    className="w-full text-left flex items-start gap-2"
                    style={{
                      background: reqChecked[i] ? "rgba(50,90,20,0.18)" : "rgba(160,110,30,0.12)",
                      border: `1px solid ${reqChecked[i] ? "#4a7a20" : "#a07830"}`,
                      padding: "4px 5px",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 9, height: 9, flexShrink: 0, marginTop: 2,
                        border: `2px solid ${reqChecked[i] ? "#4a7a20" : "#9a6820"}`,
                        background: reqChecked[i] ? "#4a7a20" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        imageRendering: "pixelated",
                      }}
                    >
                      {reqChecked[i] && <span style={{ fontSize: 6, color: "#fff", fontWeight: "bold", lineHeight: 1 }}>✓</span>}
                    </div>
                    <span
                      className="font-vt leading-snug"
                      style={{
                        fontSize: 12,
                        color: reqChecked[i] ? "#3a5a10" : "#4a2a06",
                        textDecoration: reqChecked[i] ? "line-through" : "none",
                        opacity: reqChecked[i] ? 0.65 : 1,
                      }}
                    >
                      {req}
                    </span>
                  </button>
                ))}
              </div>
              {reqChecked.filter(Boolean).length === requirements.length && (
                <p className="font-pixel text-center mt-1" style={{ fontSize: 6, color: "#3a6010" }}>{t.interrogation.allChecked}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scene: suspect character + atmospheric room ─────────── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          height: 208,
          background: "linear-gradient(to bottom, #080612 0%, #100d1e 62%, #1c1830 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0, transparent 63px, rgba(255,255,255,0.014) 63px, rgba(255,255,255,0.014) 64px), " +
              "repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(255,255,255,0.014) 31px, rgba(255,255,255,0.014) 32px)",
          }}
        />

        <ScanlineOverlay opacity={0.09} zIndex={2} />

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 42% 68% at 50% -18%, rgba(255,200,100,0.14) 0%, rgba(255,160,40,0.06) 36%, transparent 66%)",
            zIndex: 3,
          }}
        />

        <DynamicLight intensity={0.04} rgbColor="255, 190, 80" lerp={0.04} zIndex={4} />

        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 animate-candle"
          style={{ animationDuration: "3s", zIndex: 5 }}
        >
          <PixelLamp size={52} />
        </div>

        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 6 }}>
          <PixelCharacter
            variant={suspectIndex >= 0 ? suspectIndex : 0}
            scale={6}
            animated
            emotion={currentEmotion}
          />
        </div>

        <div
  className="absolute inset-0 flex flex-col items-center justify-center"
  style={{ zIndex: 6 }}
>
  <PixelCharacter
    variant={suspectIndex >= 0 ? suspectIndex : 0}
    scale={6}
    animated
  />

  <button
    onClick={() => setShowCard(true)}
    className="nameplate"
    style={{
      marginTop: 14,
      background: "var(--deep)",
      fontSize: 7,
      cursor: "pointer",
      border: "1px solid var(--gold-dk)",
      padding: "6px 14px",
      letterSpacing: "1px",
    }}
  >
    ▶ {suspect.name.toUpperCase()}
  </button>
</div>

        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 24,
            background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.5))",
            zIndex: 7,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, var(--border), var(--border2), var(--border), transparent)",
            zIndex: 8,
          }}
        />

{/* (Sus-O-Scan mounted outside scene – see below) */}
        {/* Banner de autoplay bloqueado */}
        {autoplayBlocked && (
          <div
            className="absolute bottom-3 right-4 cursor-pointer"
            style={{ zIndex: 10 }}
            onClick={handlePlayPending}
          >
            <div
              className="nameplate animate-pixel-blink"
              style={{
                background: "var(--wine-dk)",
                borderColor: "var(--wine-lt)",
                color: "var(--wine-lt)",
                fontSize: 6,
                cursor: "pointer",
              }}
            >
              {t.interrogation.clickToHear}
            </div>
          </div>
        )}
        {showCard && (
  <div
    className="fixed inset-0 flex items-center justify-center"
    style={{
      background: "rgba(0,0,0,0.85)",
      zIndex: 9999,
    }}
  >
    {/* TEXTURE OVERLAY */}
<div
  style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `
      repeating-linear-gradient(
        to bottom,
        rgba(255,215,0,0.04),
        rgba(255,215,0,0.04) 1px,
        transparent 1px,
        transparent 3px
      )
    `,
    opacity: 0.3,
    mixBlendMode: "overlay",
  }}
/>
{/* DARK GRAIN */}
<div
  style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "4px 4px",
    opacity: 0.2,
  }}
/>
    <div
      style={{
        width: 460,
        borderRadius: 0,
        background: "linear-gradient(145deg, #0b0b0f, #16161d)",
        border: "3px solid #b8860b",
        boxShadow: `
  6px 6px 0 #000,
  0 0 20px rgba(255,215,0,0.2),
  inset 0 0 14px rgba(255,215,0,0.05)
`,
        padding: 16,
        imageRendering: "pixelated",
        fontFamily: "var(--font-pixel, monospace)",
        position: "relative",
      }}
    >
      {/* HEADER PIXEL BAR */}
      <div
        style={{
          background: "#b8860b",
          color: "#000",
          padding: "5px 10px",
          fontWeight: 900,
          letterSpacing: "0.12em",
          fontSize: 10,
          display: "inline-block",
          marginBottom: 12,
          boxShadow: "3px 3px 0 #000",
        }}
      >
        {t.interrogation.idCardTitle}
      </div>

      {/* CLOSE BUTTON */}
      <button
        onClick={() => setShowCard(false)}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 22,
          height: 22,
          border: "2px solid #b8860b",
          background: "#111",
          color: "#b8860b",
          fontWeight: 900,
          fontSize: 11,
          cursor: "pointer",
          boxShadow: "2px 2px 0 #000",
        }}
      >
        X
      </button>

      {/* MAIN BODY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "130px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* AVATAR FRAME */}
        <div
          style={{
            width: 130,
            height: 130,
            border: "3px solid #b8860b",
            background: "#0a0a0f",
            boxShadow: "4px 4px 0 #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PixelCharacter
            variant={suspectIndex >= 0 ? suspectIndex : 0}
            scale={4}
          />
        </div>

        {/* INFO SECTION */}
        <div style={{ color: "#f5e6c8", fontSize: 11, lineHeight: 1.7 }}>
          {/* NAME */}
          <div
            style={{
              fontSize: 14,
              color: "#ffd700",
              marginBottom: 6,
              letterSpacing: "0.06em",
              fontWeight: 900,
            }}
          >
            {suspect.name}
          </div>

          <div style={{ borderTop: "1px solid #b8860b", marginBottom: 6 }} />

          <div><b style={{ color: "#ffd700" }}>ID:</b> {cardId}</div>

          <div>
            <b style={{ color: "#ffd700" }}>{t.interrogation.idCardAge}:</b>{" "}
            {suspect.age ?? "??"}{suspect.age != null ? ` ${language === "es" ? "años" : "years"}` : ""}
          </div>

          <div>
            <b style={{ color: "#ffd700" }}>{t.interrogation.idCardCooperation}:</b>{" "}
            <span
              style={{
                fontWeight: 900,
                color: suspect.alibi_cooperative ? "#22c55e" : "#ef4444",
              }}
            >
              {suspect.alibi_cooperative ? t.interrogation.idCardCooperated : t.interrogation.idCardNotCooperated}
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            <b style={{ color: "#ffd700" }}>{t.interrogation.idCardRemarks}:</b>
            <div
              style={{
                marginTop: 4,
                padding: "5px 7px",
                border: "1px solid #b8860b",
                background: "rgba(184,134,11,0.08)",
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              {suspect.personality || "—"}
            </div>
          </div>

          {/* PIXEL TAG */}
          <div
            style={{
              marginTop: 10,
              display: "inline-block",
              padding: "4px 10px",
              background: "#b8860b",
              color: "#000",
              fontWeight: 900,
              fontSize: 9,
              letterSpacing: "0.12em",
              boxShadow: "3px 3px 0 #000",
            }}
          >
            {t.interrogation.idCardVerified}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>

  

      {/* ── Message history ────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5"

        
        style={{ background: "var(--void)" }}
      >
        {messages.length === 0 && (
          <div className="flex justify-center py-6">
            <p className="font-vt" style={{ fontSize: 18, color: "var(--dim)", fontStyle: "italic" }}>
              {t.interrogation.startInterrogation(suspect.name)}
            </p>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((msg, i) => {
            const isDetective = msg.role === "detective";
            const content = getContent(msg, i);
            const isTypingThis = typewriterMsgIdx === i;
            const isInitialStatement = !isDetective && i === 0;
            const scanTone = msg.sus_scan?.tone ?? "static";
            const toneBorder = scanTone === "warm" ? "rgba(212,160,23,0.55)" : scanTone === "cold" ? "rgba(22,137,158,0.55)" : "rgba(122,90,154,0.55)";
            const toneGlow = scanTone === "warm" ? "rgba(212,160,23,0.22)" : scanTone === "cold" ? "rgba(22,137,158,0.18)" : "rgba(122,90,154,0.18)";

            return (
              <div
                key={i}
                className={`flex flex-col animate-fadein ${isDetective ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`nameplate ${isDetective ? "" : "nameplate-wine"}`}
                    style={{
                      fontSize: 6,
                      ...(isDetective
                        ? {}
                        : { borderColor: "var(--wine-lt)", background: "var(--wine-dk)", color: "var(--wine-lt)" }),
                    }}
                  >
                    {isDetective ? t.common.detective : suspect.name}
                  </div>
                  {isInitialStatement && (
                    <span
                      className="font-pixel"
                      style={{
                        fontSize: 5,
                        color: "var(--gold-dk)",
                        background: "rgba(212,160,23,0.12)",
                        border: "1px solid var(--gold-dk)",
                        padding: "2px 5px",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {t.interrogation.testimony}
                    </span>
                  )}
                  {!isDetective && msg.emotion && (
                    <span
                      className="font-pixel"
                      style={{
                        fontSize: 5,
                        color: EMOTION_BADGE_COLORS[msg.emotion] ?? "#5a4280",
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${EMOTION_BADGE_COLORS[msg.emotion] ?? "#5a4280"}`,
                        padding: "2px 5px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        opacity: 0.85,
                      }}
                    >
                      {msg.emotion}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[80%] dialogue ${isTypingThis && !isDetective ? "dialogue-typing" : ""}`}
                  style={{
                    padding: "12px 18px",
                    border: !isDetective ? `1px solid ${toneBorder}` : undefined,
                    boxShadow: !isDetective ? `0 0 10px ${toneGlow}` : undefined,
                    filter: !isDetective && scanTone === "static" ? "contrast(1.05) saturate(0.95)" : undefined,
                    ...(isInitialStatement
  ? {
      background:
        "linear-gradient(160deg, rgba(20,15,35,0.95) 0%, rgba(30,22,55,0.95) 100%)",
      border: "3px solid var(--gold-dk)",
      boxShadow:
        "4px 4px 0 #000, 0 0 16px rgba(212,160,23,0.18), inset 0 0 12px rgba(212,160,23,0.05)",
    }
                      : {}),
                  }}
                >
                  <p
                    className="font-vt leading-relaxed"
                    style={{
                      fontSize: 20,
                      color: isDetective ? "var(--gold-lt)" : "var(--cream)",
                    }}
                  >
                    <MessageText
                      content={content}
                      fullContent={msg.content}
                      isActive={isTypingThis}
                    />
                  </p>
                </div>

              </div>
            );
          })}

          {/* Thinking indicator */}
          {interrogating && (
            <div className="flex flex-col items-start animate-fadein">
              <div className="nameplate nameplate-wine mb-1" style={{ fontSize: 6 }}>
                {suspect.name}
              </div>
              <div className="dialogue" style={{ padding: "14px 20px" }}>
                <div className="flex gap-2 items-center">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="animate-dot-bounce"
                      style={{
                        width: 7,
                        height: 7,
                        background: "var(--border2)",
                        borderRadius: 1,
                        animationDelay: `${d * 160}ms`,
                        imageRendering: "pixelated",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{
          background: "var(--abyss)",
          borderTop: "2px solid var(--border)",
          boxShadow: "0 -2px 0 var(--void), 0 -4px 0 var(--border)",
        }}
      >
        {profanityError && (
          <p
            className="font-pixel mb-2 animate-fadein"
            style={{ fontSize: 6, color: "var(--wine-lt)", letterSpacing: "0.08em" }}
          >
            {t.interrogation.profanityWarning}
          </p>
        )}
        {voiceError && (
          <p
            className="font-pixel mb-2 animate-fadein"
            style={{ fontSize: 6, color: "var(--wine-lt)", letterSpacing: "0.08em" }}
          >
            {voiceError}
          </p>
        )}

        {voiceMode && (
          <div
            className="mb-3 px-3 py-2"
            style={{
              border: "1px solid rgba(212,160,23,0.45)",
              background: "rgba(10,8,18,0.55)",
            }}
          >
            <p className="font-pixel" style={{ fontSize: 6, color: "var(--gold-lt)", marginBottom: 8 }}>
              {voiceRecording ? (voicePaused ? t.interrogation.voicePaused : t.interrogation.voiceRecording) : voiceBlob ? t.interrogation.voiceReady : t.interrogation.voiceStart}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStartVoice}
                disabled={voiceRecording || voiceProcessing || interrogating}
                className="btn-rpg btn-rpg-ghost btn-rpg-sm"
                style={{ fontSize: 6 }}
              >
                {t.interrogation.voiceStart}
              </button>
              <button
                type="button"
                onClick={handlePauseResumeVoice}
                disabled={!voiceRecording || voiceProcessing}
                className="btn-rpg btn-rpg-ghost btn-rpg-sm"
                style={{ fontSize: 6 }}
              >
                {voicePaused ? t.interrogation.voiceResume : t.interrogation.voicePause}
              </button>
              <button
                type="button"
                onClick={handleDiscardVoice}
                disabled={voiceProcessing || (!voiceRecording && !voiceBlob)}
                className="btn-rpg btn-rpg-ghost btn-rpg-sm"
                style={{ fontSize: 6 }}
              >
                {voiceBlob ? t.interrogation.voiceDelete : t.interrogation.voiceDiscard}
              </button>
              <button
                type="button"
                onClick={handleSendVoice}
                disabled={voiceProcessing || (!voiceRecording && !voiceBlob)}
                className="btn-rpg btn-rpg-sm"
                style={{ fontSize: 6 }}
              >
                {voiceProcessing ? t.interrogation.voiceSending : t.interrogation.voiceSend}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 items-center">
          <button
            onClick={onBackToMap}
            disabled={interrogating}
            className="btn-rpg btn-rpg-ghost btn-rpg-sm flex-shrink-0"
            style={{ fontSize: 6 }}
            title={t.interrogation.backToMap}
          >
            ← {t.common.map}
          </button>

          <form onSubmit={handleSubmit} className="flex gap-3 items-center flex-1">
            <span
              className="font-pixel flex-shrink-0 animate-pixel-blink"
              style={{ fontSize: 9, color: "var(--gold)", userSelect: "none" }}
            >
              ▶
            </span>

            <input
              type="text"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setProfanityError(false); }}
              placeholder={t.interrogation.askPlaceholder(suspect.name)}
              disabled={interrogating}
              className="input-rpg flex-1 px-4 py-2"
              style={profanityError ? { borderColor: "var(--wine-lt)" } : undefined}
            />

            <div style={{ position: "relative", flexShrink: 0 }} className="suggest-btn-wrap">
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || interrogating}
                className="btn-rpg btn-rpg-ghost btn-rpg-sm suggest-trigger"
                style={{ fontSize: 14, padding: "6px 10px", opacity: suggesting || interrogating ? 0.5 : 1 }}
              >
                {suggesting ? "…" : "💡"}
              </button>
              <div className="suggest-tooltip font-pixel" style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                background: "var(--abyss)",
                border: "1px solid var(--gold-dk)",
                color: "var(--gold-lt)",
                fontSize: 5,
                padding: "5px 9px",
                pointerEvents: "none",
                opacity: 0,
                transition: "opacity 0.15s ease",
                zIndex: 50,
                letterSpacing: "0.08em",
              }}>
                {t.interrogation.suggestButton}
              </div>
            </div>

            <div style={{ position: "relative", flexShrink: 0 }} className="suggest-btn-wrap">
              <button
                type="button"
                onClick={() => setVoiceMode((v) => !v)}
                disabled={interrogating || voiceProcessing}
                className="btn-rpg btn-rpg-ghost btn-rpg-sm suggest-trigger"
                style={{
                  width: 42,
                  height: 36,
                  padding: 0,
                  borderColor: voiceMode ? "var(--gold)" : undefined,
                  color: voiceMode ? "var(--gold-lt)" : undefined,
                  opacity: interrogating || voiceProcessing ? 0.5 : 1,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: voiceMode ? "0 0 10px rgba(212,160,23,0.35)" : undefined,
                }}
                aria-label={t.interrogation.voiceStart}
                title={t.interrogation.voiceStart}
              >
                <svg width="20" height="20" viewBox="0 0 12 12" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }} aria-hidden>
                  <rect x="0" y="0" width="12" height="12" fill={voiceMode ? "#1d1808" : "#101015"} />
                  <rect x="1" y="1" width="10" height="10" fill={voiceMode ? "#2b220d" : "#1a1a24"} />
                  <rect x="4" y="1" width="4" height="5" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="3" y="2" width="1" height="3" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="8" y="2" width="1" height="3" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="5" y="6" width="2" height="2" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="3" y="8" width="6" height="1" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="5" y="9" width="2" height="2" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                  <rect x="4" y="11" width="4" height="1" fill={voiceMode ? "#f5c842" : "#d7d9e5"} />
                </svg>
              </button>
              <div className="suggest-tooltip font-pixel" style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                background: "var(--abyss)",
                border: "1px solid var(--gold-dk)",
                color: "var(--gold-lt)",
                fontSize: 5,
                padding: "5px 9px",
                pointerEvents: "none",
                opacity: 0,
                transition: "opacity 0.15s ease",
                zIndex: 50,
                letterSpacing: "0.08em",
              }}>
                {t.interrogation.voiceStart}
              </div>
            </div>

            <button
              type="submit"
              disabled={!question.trim() || interrogating}
              className="btn-rpg btn-rpg-sm flex-shrink-0"
              style={{ fontSize: 7 }}
            >
              {t.interrogation.askButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
