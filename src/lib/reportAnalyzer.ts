import { Message, Suspect } from "@/types/game";
import { Language } from "@/lib/i18n";
import {
  GlobalInconsistencyReport,
  InconsistencyFinding,
  SuspectInconsistencyReport,
} from "@/types/report";

type ClaimCategory = "time" | "location" | "company";

interface Claim {
  suspectId: string;
  suspectName: string;
  category: ClaimCategory;
  sentence: string;
  normalized: string;
  keywords: Set<string>;
  timeToken: string | null;
  hasNegation: boolean;
}

const STOPWORDS_ES = new Set([
  "el", "la", "los", "las", "de", "del", "y", "o", "a", "en", "con", "sin", "que", "me", "mi",
  "por", "para", "era", "fue", "estaba", "estuve", "estoy", "muy", "pero", "porque", "como", "un", "una",
]);

const STOPWORDS_EN = new Set([
  "the", "a", "an", "of", "to", "in", "on", "at", "for", "and", "or", "with", "without", "that",
  "was", "were", "is", "am", "are", "be", "been", "it", "i", "you", "he", "she", "they", "we",
]);

const CATEGORIES_ES: Record<ClaimCategory, string[]> = {
  time: ["hora", "minuto", "tarde", "noche", "manana", "mañana", "medianoche", "antes", "despues", "después"],
  location: ["sala", "lobby", "pasillo", "oficina", "laboratorio", "archivo", "puerta", "escritorio", "comedor"],
  company: ["solo", "sola", "nadie", "con", "acompanado", "acompañado", "vi", "hablando", "junto"],
};

const CATEGORIES_EN: Record<ClaimCategory, string[]> = {
  time: ["time", "minute", "afternoon", "evening", "night", "morning", "midnight", "before", "after"],
  location: ["room", "lobby", "hall", "hallway", "office", "lab", "laboratory", "archive", "desk", "cafeteria"],
  company: ["alone", "nobody", "with", "accompanied", "saw", "talking", "next"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceSplit(content: string): string[] {
  return content
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function extractTimeToken(normalized: string): string | null {
  const hhmm = normalized.match(/\b\d{1,2}(:\d{2})?\b/);
  if (hhmm) return hhmm[0];

  for (const token of ["manana", "tarde", "noche", "medianoche"]) {
    if (normalized.includes(token)) return token;
  }
  return null;
}

function tokenize(normalized: string, language: Language): Set<string> {
  const stopwords = language === "es" ? STOPWORDS_ES : STOPWORDS_EN;
  const tokens = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !stopwords.has(t));
  return new Set(tokens);
}

function classify(normalized: string, language: Language): ClaimCategory[] {
  const categories: ClaimCategory[] = [];
  const byLanguage = language === "es" ? CATEGORIES_ES : CATEGORIES_EN;

  for (const [category, words] of Object.entries(byLanguage) as [ClaimCategory, string[]][]) {
    if (words.some((w) => normalized.includes(w))) {
      categories.push(category);
    }
  }

  return categories;
}

function hasAnyOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
}

function contradictionScore(a: Claim, b: Claim): number {
  let score = 0;

  if (a.category !== b.category) return 0;
  if (!hasAnyOverlap(a.keywords, b.keywords)) return 0;

  if (a.hasNegation !== b.hasNegation) score += 2;

  if (a.category === "time" && a.timeToken && b.timeToken && a.timeToken !== b.timeToken) {
    score += 2;
  }

  if (a.category === "company") {
    const aSolo = /\bsolo\b|\bsola\b|\bnadie\b|\balone\b|\bnobody\b/.test(a.normalized);
    const bSolo = /\bsolo\b|\bsola\b|\bnadie\b|\balone\b|\bnobody\b/.test(b.normalized);
    const aWith = /\bcon\b|\bacompanad|\bwith\b|\baccompanied\b/.test(a.normalized);
    const bWith = /\bcon\b|\bacompanad|\bwith\b|\baccompanied\b/.test(b.normalized);
    if ((aSolo && bWith) || (bSolo && aWith)) score += 2;
  }

  return score;
}

function toConfidence(score: number, language: Language): string {
  if (language === "es") {
    if (score >= 4) return "alta";
    if (score >= 2) return "media";
    return "baja";
  }
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function extractClaims(suspect: Suspect, messages: Message[], language: Language): Claim[] {
  const suspectReplies = messages.filter((m) => m.role === "suspect").slice(-6);
  const claims: Claim[] = [];

  for (const msg of suspectReplies) {
    for (const rawSentence of sentenceSplit(msg.content)) {
      const normalized = normalize(rawSentence);
      if (!normalized) continue;

      const categories = classify(normalized, language);
      if (categories.length === 0) continue;

      for (const category of categories) {
        claims.push({
          suspectId: suspect.id,
          suspectName: suspect.name,
          category,
          sentence: rawSentence,
          normalized,
          keywords: tokenize(normalized, language),
          timeToken: extractTimeToken(normalized),
          hasNegation: /\bno\b|\bnunca\b|\bjamas\b|\bjamas\b/.test(normalized),
        });
      }
    }
  }

  return claims;
}

export function buildInconsistencyReport(
  suspectId: string,
  suspects: Suspect[],
  histories: Record<string, Message[]>,
  language: Language = "es"
): SuspectInconsistencyReport {
  const target = suspects.find((s) => s.id === suspectId);
  const allClaims = suspects.flatMap((s) => extractClaims(s, histories[s.id] ?? [], language));
  const targetClaims = allClaims.filter((c) => c.suspectId === suspectId);

  const findings: InconsistencyFinding[] = [];

  for (const claim of targetClaims) {
    const others = allClaims.filter((c) => c.suspectId !== suspectId && c.category === claim.category);

    for (const other of others) {
      const score = contradictionScore(claim, other);
      if (score < 2) continue;

      findings.push({
        title:
          claim.category === "time"
            ? (language === "es" ? "Desfase temporal detectado" : "Temporal mismatch detected")
            : claim.category === "location"
              ? (language === "es" ? "Versiones distintas de ubicación" : "Conflicting location statements")
              : (language === "es" ? "Relato incompatible sobre compañía" : "Incompatible company account"),
        detail: `${target?.name ?? (language === "es" ? "Sospechoso" : "Suspect")}: "${claim.sentence}" / ${other.suspectName}: "${other.sentence}"`,
        relatedSuspects: [claim.suspectName, other.suspectName],
        confidence: toConfidence(score, language),
      });
    }
  }

  const unique = new Map<string, InconsistencyFinding>();
  for (const f of findings) {
    const key = `${f.title}-${f.detail}`;
    if (!unique.has(key)) unique.set(key, f);
  }

  const trimmed = Array.from(unique.values()).slice(0, 5);
  const sourceCount = suspects.reduce(
    (acc, s) => acc + (histories[s.id]?.filter((m) => m.role === "suspect").length ?? 0),
    0
  );

  const summary =
    trimmed.length > 0
      ? (language === "es"
        ? `Se detectaron ${trimmed.length} posible(s) inconsistencia(s) para ${target?.name ?? "este sospechoso"}.`
        : `${trimmed.length} possible inconsistency(ies) detected for ${target?.name ?? "this suspect"}.`)
      : (language === "es"
        ? `Sin contradicciones fuertes por ahora; se recomienda más preguntas de precisión para ${target?.name ?? "este sospechoso"}.`
        : `No strong contradictions yet; ask more precise follow-up questions to ${target?.name ?? "this suspect"}.`);

  return {
    suspectId,
    generatedAt: Date.now(),
    summary,
    findings: trimmed,
    sourceCount,
  };
}

export function buildGlobalInconsistencyReport(
  suspects: Suspect[],
  histories: Record<string, Message[]>,
  language: Language = "es"
): GlobalInconsistencyReport {
  const allClaims = suspects.flatMap((s) => extractClaims(s, histories[s.id] ?? [], language));
  const findings: InconsistencyFinding[] = [];

  for (let i = 0; i < allClaims.length; i += 1) {
    for (let j = i + 1; j < allClaims.length; j += 1) {
      const a = allClaims[i];
      const b = allClaims[j];
      if (a.suspectId === b.suspectId) continue;
      const score = contradictionScore(a, b);
      if (score < 2) continue;

      findings.push({
        title:
          a.category === "time"
            ? (language === "es" ? "Desfase temporal entre testimonios" : "Temporal mismatch across testimonies")
            : a.category === "location"
              ? (language === "es" ? "Ubicaciones incompatibles reportadas" : "Incompatible locations reported")
              : (language === "es" ? "Compañía declarada incompatible" : "Incompatible companion claims"),
        detail: `${a.suspectName}: "${a.sentence}" / ${b.suspectName}: "${b.sentence}"`,
        relatedSuspects: [a.suspectName, b.suspectName],
        confidence: toConfidence(score, language),
      });
    }
  }

  const unique = new Map<string, InconsistencyFinding>();
  for (const finding of findings) {
    const sortedNames = [...finding.relatedSuspects].sort().join("|");
    const key = `${finding.title}-${sortedNames}-${finding.detail}`;
    if (!unique.has(key)) unique.set(key, finding);
  }

  const trimmed = Array.from(unique.values()).slice(0, 8);
  const sourceCount = suspects.reduce(
    (acc, s) => acc + (histories[s.id]?.filter((m) => m.role === "suspect").length ?? 0),
    0
  );

  const summary =
    trimmed.length > 0
      ? (language === "es"
        ? `Se detectaron ${trimmed.length} contradicciones potenciales entre testimonios.`
        : `${trimmed.length} potential contradictions detected across testimonies.`)
      : (language === "es"
        ? "No se detectaron contradicciones fuertes todavía; conviene preguntar horas y ubicaciones exactas."
        : "No strong contradictions detected yet; ask for exact times and locations.");

  return {
    generatedAt: Date.now(),
    summary,
    findings: trimmed,
    sourceCount,
  };
}
