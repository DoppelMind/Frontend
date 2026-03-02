export interface Case {
  title: string;
  crime: string;
  setting: string;
  victim: string;
  time: string;
  description: string;
}

export interface Suspect {
  id: string;
  name: string;
  age: number;
  occupation: string;
  relationship_to_victim: string;
  appearance: string;
  alibi_cooperative: boolean;
  personality: string;
  initial_statement?: string;
}

export type SuspectEmotion = "calm" | "nervous" | "angry" | "sad" | "defensive" | "confident" | "fearful";

export interface SusOScanResult {
  narration: string;
  anomaly_delta: number;
  tone: "warm" | "cold" | "static";
  reason: string;
}

export interface Message {
  role: "detective" | "suspect";
  content: string;
  timestamp: number;
  emotion?: SuspectEmotion;
  sus_scan?: SusOScanResult;
  sus_level?: number;
}

export interface GameData {
  game_id: string;
  case: Case;
  suspects: Suspect[];
  requirements: string[];
  model: string;
}

export interface AccusationResult {
  correct: boolean;
  real_id: string;
  real_name: string;
  solution: string;
}

export type GamePhase = "home" | "loading" | "investigation" | "accusing" | "result";
