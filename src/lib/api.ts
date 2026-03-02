const API_BASE = "http://localhost:8000";

type Language = "es" | "en";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function startGame(language: Language): Promise<{
  game_id: string;
  case: Record<string, string>;
  suspects: Record<string, unknown>[];
  requirements: string[];
  model: string;
}> {
  const res = await fetch(`${API_BASE}/api/game/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  return handleResponse(res);
}

export interface SusOScanResult {
  narration: string;
  anomaly_delta: number;
  tone: "warm" | "cold" | "static";
  reason: string;
}

export interface ScanHintResult {
  hint: string;
  tone: "warm" | "cold" | "static";
  global_level: number;
  cooldown_seconds: number;
  uses_remaining: number;
}

const DEFAULT_SCAN: SusOScanResult = {
  narration: "Signal stable.",
  anomaly_delta: 0,
  tone: "static",
  reason: "No relevant inconsistency detected in this exchange.",
};

function sanitizeSusScan(input: unknown): SusOScanResult {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const tone = src.tone === "warm" || src.tone === "cold" || src.tone === "static" ? src.tone : "static";
  const deltaRaw = Number(src.anomaly_delta);
  return {
    narration: String(src.narration ?? DEFAULT_SCAN.narration).trim() || DEFAULT_SCAN.narration,
    anomaly_delta: Number.isFinite(deltaRaw) ? Math.max(-2, Math.min(2, Math.round(deltaRaw))) : 0,
    tone,
    reason: String(src.reason ?? DEFAULT_SCAN.reason).trim() || DEFAULT_SCAN.reason,
  };
}

function sanitizeScanHint(input: unknown): ScanHintResult {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const tone = src.tone === "warm" || src.tone === "cold" || src.tone === "static" ? src.tone : "static";
  const global = Number(src.global_level);
  const cooldown = Number(src.cooldown_seconds);
  const uses = Number(src.uses_remaining);
  return {
    hint: String(src.hint ?? "Signal stable.").trim() || "Signal stable.",
    tone,
    global_level: Number.isFinite(global) ? Math.max(0, Math.min(10, Math.round(global))) : 5,
    cooldown_seconds: Number.isFinite(cooldown) ? Math.max(0, Math.round(cooldown)) : 0,
    uses_remaining: Number.isFinite(uses) ? Math.max(0, Math.round(uses)) : 0,
  };
}

export async function interrogateSuspect(
  gameId: string,
  suspectId: string,
  question: string,
  language: Language
): Promise<{ answer: string; suspect_name: string; emotion: string; sus_scan: SusOScanResult; sus_level: number }> {
  const res = await fetch(`${API_BASE}/api/game/interrogate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId, question, language }),
  });
  const payload = await handleResponse<Record<string, unknown>>(res);
  return {
    answer: String(payload.answer ?? "").trim() || "...",
    suspect_name: String(payload.suspect_name ?? ""),
    emotion: String(payload.emotion ?? "calm"),
    sus_scan: sanitizeSusScan(payload.sus_scan),
    sus_level: Number.isFinite(Number(payload.sus_level)) ? Math.max(0, Math.min(10, Math.round(Number(payload.sus_level)))) : 5,
  };
}

export async function accuseSuspect(
  gameId: string,
  suspectId: string
): Promise<{
  correct: boolean;
  real_id: string;
  real_name: string;
  solution: string;
}> {
  const res = await fetch(`${API_BASE}/api/game/accuse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  const payload = await handleResponse<Record<string, unknown>>(res);

  const realIdRaw =
    payload.real_id ??
    payload.real_suspect_id;
  const realNameRaw =
    payload.real_name ??
    payload.real_suspect_name ??
    payload.culprit_name;

  return {
    correct: Boolean(payload.correct),
    real_id: String(realIdRaw ?? ""),
    real_name: String(realNameRaw ?? ""),
    solution: String(payload.solution ?? ""),
  };
}

export async function scanSuspect(
  gameId: string,
  suspectId: string
): Promise<ScanHintResult> {
  const res = await fetch(`${API_BASE}/api/game/susoscan/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  const payload = await handleResponse<Record<string, unknown>>(res);
  return sanitizeScanHint(payload);
}

export async function suggestQuestion(
  gameId: string,
  suspectId: string
): Promise<{ suggested_question: string }> {
  const res = await fetch(`${API_BASE}/api/game/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  return handleResponse(res);
}

export async function transcribeInterrogationVoice(
  audioBlob: Blob,
  filename: string,
  language: Language
): Promise<{ transcript: string }> {
  const form = new FormData();
  form.append("audio", audioBlob, filename);
  form.append("language", language);

  const res = await fetch(`${API_BASE}/api/game/interrogate/voice`, {
    method: "POST",
    body: form,
  });
  const payload = await handleResponse<Record<string, unknown>>(res);
  return {
    transcript: String(payload.transcript ?? "").trim(),
  };
}

export const unlockExtra = async (
  gameId: string,
  suspectId: string
) => {
  const res = await fetch(`${API_BASE}/api/game/unlock-extra`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  return handleResponse(res);
};

export async function narrateText(
  text: string,
  suspectId: string,
  emotion: string = "calm",
  susLevel: number = 5,
  tone: "warm" | "cold" | "static" = "static"
): Promise<HTMLAudioElement> {
  const res = await fetch(`${API_BASE}/api/game/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, suspect_id: suspectId, emotion, sus_level: susLevel, tone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Narration failed" }));
    throw new Error(err.detail ?? "Narration failed");
  }
  const buffer = await res.arrayBuffer();
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.load();
  return audio;
}
