/**
 * Profanity filter — English + Spanish.
 *
 * Words are stored in their accent-stripped, lowercase form.
 * The same normalisation is applied to user input before checking,
 * so "Cabrón", "CABRON", and "cabron" all match the same entry.
 */

// ── Word list ─────────────────────────────────────────────────────────────────

const PROFANITY = new Set([
  // English
  "fuck", "fucking", "fucker", "fucked", "fucks", "motherfucker", "motherfucking",
  "shit", "shitty", "shithead", "bullshit", "dipshit",
  "ass", "asshole", "asses", "jackass", "dumbass", "smartass",
  "bitch", "bitches", "bitchy",
  "bastard", "bastards",
  "cunt", "cunts",
  "dick", "dicks", "dickhead",
  "cock", "cocks", "cocksucker",
  "pussy", "pussies",
  "whore", "whores",
  "slut", "slutty",
  "piss", "pissed", "pissoff",
  "faggot", "fag",
  "nigger", "nigga",
  "retard", "retarded",

  // Spanish
  "puta", "puto", "putas", "putos", "putada",
  "mierda", "mierdas",
  "cono", "coño",
  "joder", "jodes", "jodido", "jodida", "jodidos", "jodidas",
  "cabron", "cabrona", "cabrones", "cabronas",
  "pendejo", "pendeja", "pendejos", "pendejas",
  "chingada", "chingado", "chingados", "chinga", "chinguen", "chingon",
  "verga", "vergas",
  "culero", "culera", "culeros", "culeras", "culo",
  "maricon", "marica", "maricones",
  "perra", "perras",
  "pinche", "pinches",
  "hdp",
  "hijoputa", "hijosdeputa",
  "gilipollas",
  "hostia", "hostias",
  "cojones", "cojon",
  "mamada", "mamadas", "mamar",
  "putear", "puteado",
  "zorra", "zorras",
  "idiota",
]);

// ── Normaliser ────────────────────────────────────────────────────────────────

/** Strip accents, lowercase, replace non-letter chars with spaces. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove combining diacritics
    .replace(/[^a-z]/g, " ");         // non-letter → space
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if `text` contains at least one word from the profanity list. */
export function hasProfanity(text: string): boolean {
  const words = normalise(text).split(/\s+/).filter(Boolean);
  return words.some((w) => PROFANITY.has(w));
}
