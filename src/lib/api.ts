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

export interface AnalysisSummary {
  suspicion_score: number;
  contradictions: string[];
  recommendation: "press" | "switch_suspect" | "ask_for_details";
}

export interface SusOScanResult {
  narration: string;
  anomaly_delta: number;
  tone: "warm" | "cold" | "static";
  reason_tags: string[];
  sus_level: number;
}

export async function interrogateSuspect(
  gameId: string,
  suspectId: string,
  question: string,
  language: Language
): Promise<{ answer: string; suspect_name: string; emotion: string; analysis?: AnalysisSummary | null; sus_scan?: SusOScanResult | null }> {
  const res = await fetch(`${API_BASE}/api/game/interrogate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId, question, language }),
  });
  return handleResponse(res);
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

export async function analyzeSuspect(
  gameId: string,
  suspectId: string
): Promise<{
  suspicion_score: number;
  contradictions: string[];
  supporting_evidence: string[];
  recommendation: "press" | "switch_suspect" | "ask_for_details";
}> {
  const res = await fetch(`${API_BASE}/api/game/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  return handleResponse(res);
}

export async function scanSuspect(
  gameId: string,
  suspectId: string
): Promise<SusOScanResult> {
  const res = await fetch(`${API_BASE}/api/game/susoscan/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, suspect_id: suspectId }),
  });
  return handleResponse(res);
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
  emotion: string = "calm"
): Promise<HTMLAudioElement> {
  const res = await fetch(`${API_BASE}/api/game/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, suspect_id: suspectId, emotion }),
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
