"use client";

/**
 * Pixel-art character sprites rendered as SVG.
 * Each sprite is a 12×N grid; each pixel renders at PX_SIZE × PX_SIZE.
 * Supports idle-float and pixel-blink CSS animations.
 *
 * Suspects accept an optional `emotion` prop.
 * The expression system uses two rows per zone:
 *   - Eyes  → eyeY-1 (brows) + eyeY (pupils)
 *   - Mouth → mouthY-1 (curve anchor) + mouthY (main pixels)
 * This enables angled brows, smile/frown curves and open mouth shapes
 * without altering the sprite body or changing its dimensions.
 */

import { useMemo } from "react";

const PX = 4; // pixels per "pixel"

type Row = string; // exactly 12 chars, '.' = transparent

interface SpriteData {
  palette: Record<string, string>;
  rows: Row[];
}

/* ──────────────────────────────────────────────────────────────────
   Palette chars shared across sprites
────────────────────────────────────────────────────────────────── */
const SKIN  = "#c49a6c";
const EYE   = "#1a1a2e";
const MOUTH = "#7a3a3a";
const SHOE  = "#080808";
const PANT  = "#151522";

/* ══════════════════════════════════════════════════════════════════
   DETECTIVE sprite
══════════════════════════════════════════════════════════════════ */
const DETECTIVE: SpriteData = {
  palette: {
    H: "#2a1a08", h: "#1a0f04",
    F: SKIN, E: EYE, M: MOUTH,
    B: "#2c3e50", b: "#1e2d3d", G: "#d4a017",
    L: PANT, S: SHOE, T: "#a09080",
    ".": "transparent",
  },
  rows: [
    "....HHHH....", // hat brim
    "..HHHHHHHH..", // hat body
    "..hHHHHHHh..", // hat base
    "..FFFFFFFF..", // forehead
    "..FEFFFFEF..", // eyes (E = dark pupil)
    "..FFFFFFFF..", // cheeks
    "...FMMMMF...", // mouth
    "...TTTTTT...", // neck / collar
    ".BBBBBBBBBB.", // coat shoulders
    ".BBGBBBBGBB.", // coat w/ gold buttons
    ".BBBBBBBBBB.", // coat
    "...LLLLLL...", // legs
    "...LLLLLL...", // legs
    "..LL....LL..", // lower legs (gap = coat split)
    "..SS....SS..", // shoes
  ],
};

/* ══════════════════════════════════════════════════════════════════
   SUSPECT sprites  (5 variants)
══════════════════════════════════════════════════════════════════ */

// Variant 0 – Deep teal jacket (formal)
const SUSPECT_0: SpriteData = {
  palette: {
    H: "#1a0f07", F: SKIN, E: EYE, M: MOUTH,
    B: "#0d5c6e", b: "#095060", G: "#d4a017",
    L: PANT, S: SHOE, T: "#a09080",
    ".": "transparent",
  },
  rows: [
    "....HHHH....",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "..FFFFFFFF..",
    "..FEFFFFEF..",
    "..FFFFFFFF..",
    "...FMMMMF...",
    "...TTTTTT...",
    ".BBBBBBBBBB.",
    ".BBGBBBbGBB.",
    ".BBBBBBBBBB.",
    "...LLLLLL...",
    "...LLLLLL...",
    "..LL....LL..",
    "..SS....SS..",
  ],
};

// Variant 1 – Wine red (femme silhouette, wider dress)
const SUSPECT_1: SpriteData = {
  palette: {
    H: "#3d1a2a", h: "#5a2040",
    F: "#d4a880", E: EYE, M: "#a03040",
    B: "#7a1528", b: "#c42040",
    L: "#4a0c18", S: SHOE, T: "#c49090",
    ".": "transparent",
  },
  rows: [
    "...hHHHHhh..",
    "..hHHHHHHHh.",
    "..FFFFFFFF..",
    "..FEFFFFEF..",
    "..FFFFFFFF..",
    "...FMMMMF...",
    "...TTTTTT...",
    ".BBBBBBBBBB.",
    "BBBBBBBBBBBB", // wide dress
    "BBBBBBBBBBBB", // wider
    ".BBBBBBBBBB.",
    "...LLLLLL...",
    "...LLLLLL...",
    "....LLLL....",
    "....SS......",
  ],
};

// Variant 2 – Purple mage/scholar
const SUSPECT_2: SpriteData = {
  palette: {
    H: "#2d1a4a", h: "#4a2a7a",
    F: SKIN, E: "#2a1a4a", M: MOUTH,
    B: "#4a1a7a", b: "#7a30b0", G: "#c090e0",
    L: "#2a1050", S: "#100820", T: "#9070b0",
    ".": "transparent",
  },
  rows: [
    "..h.HHHH.h..",
    "..hHHHHHHh..",
    ".hhHHHHHHhh.",
    "..FFFFFFFF..",
    "..FEFFFFEF..",
    "..FFFFFFFF..",
    "...FMMMMF...",
    "...TTTTTT...",
    ".BBBBBBBBBB.",
    ".BbGBBBBGbB.",
    ".BBBBBBBBBB.",
    ".BBLLLLLLLB.",
    "..BLLLLLLB..",
    "...LLLLLL...",
    "..SS....SS..",
  ],
};

// Variant 3 – Dark olive / merchant
const SUSPECT_3: SpriteData = {
  palette: {
    H: "#2a2010", h: "#3d3018",
    F: "#b88c5a", E: EYE, M: MOUTH,
    B: "#3d3210", b: "#5a4a18", G: "#d4a017",
    L: "#2a200a", S: SHOE, T: "#806040",
    ".": "transparent",
  },
  rows: [
    "...hHHHHh...",
    "..HHHHHHHH..",
    "..hHHHHHHh..",
    "..FFFFFFFF..",
    "..FEFFFFEF..",
    "..FFFFFFFF..",
    "...FMMMMF...",
    "...TTTTTT...",
    ".BBBBBBBBBB.",
    ".BBbGbbGbBB.",
    ".BBBBBBBBBB.",
    "...LLLLLL...",
    "...LLLLLL...",
    "..LL....LL..",
    "..SS....SS..",
  ],
};

// Variant 4 – Grey/silver (elder or scientist)
const SUSPECT_4: SpriteData = {
  palette: {
    H: "#808090", h: "#a0a0b0",
    F: "#c0a080", E: "#303048", M: "#806060",
    B: "#505060", b: "#707080", G: "#c0c0d0",
    L: "#303040", S: "#181820", T: "#9090a0",
    ".": "transparent",
  },
  rows: [
    "..hHHHHHHh..",
    ".hHHHHHHHHh.",
    "..FFFFFFFF..",
    "..FEFFFFEF..",
    "..FFFFFFFF..",
    "...FMMMMF...",
    "...TTTTTT...",
    ".BBBBBBBBBB.",
    ".BbGBBBBGbB.",
    ".BBBBBBBBBB.",
    ".BBBBBBBBBB.",
    "...LLLLLL...",
    "...LLLLLL...",
    "..LL....LL..",
    "..SS....SS..",
  ],
};

const SUSPECT_SPRITES = [SUSPECT_0, SUSPECT_1, SUSPECT_2, SUSPECT_3, SUSPECT_4];

/* ══════════════════════════════════════════════════════════════════
   Emotion expression system
   ─────────────────────────────────────────────────────────────────
   Two pixel zones, each spanning up to 2 rows:
     Eye zone:   eyeY-1 (brow row, always skin bg) + eyeY (pupil row)
     Mouth zone: mouthY-1 (cheek row, always skin bg) + mouthY (lip row)
   dy is relative to the zone's reference row (eyeY or mouthY).

   Grid is 12 px wide.  Eye pupils sit at x=3 (left) and x=8 (right).
   Mouth baseline covers x=4-7.  Forehead spans x=2-9.

   Brow angle semantics
   ─────────────────────
   Angry   → inner-heavy brow [3,4] / [7,8] at eyeY-1
             → inner side feels pushed down toward nose = "inclined down"
   Sad     → single inner dot [4] / [7] at eyeY-1
             → outer side dominates visually = "inclined up at outer corner"
   Defensive → 3-px thick brow [2,3,4] / [7,8,9] = heavy lid = squint

   Mouth curve semantics (mouthY-1 is ABOVE mouthY on screen)
   ────────────────────────────────────────────────────────────
   Smile   → corners at mouthY-1 (high), center at mouthY  (low)  → ∪ curve
   Frown   → center at mouthY-1 (high), corners at mouthY  (low)  → ∩ curve
   Open O  → vertical oval: top at mouthY-1, bottom at mouthY
══════════════════════════════════════════════════════════════════ */

type SuspectEmotion =
  | "calm"
  | "nervous"
  | "angry"
  | "sad"
  | "defensive"
  | "confident"
  | "fearful";

interface PixelSpec {
  x: number;
  /** Row offset from the zone reference row (eyeY or mouthY). -1 = row above. */
  dy: number;
}

interface ExpressionDef {
  /** Pixels painted with eyeColor; dy is relative to eyeY. */
  eyePixels: PixelSpec[];
  /** Pixels painted with mouthColor; dy is relative to mouthY. */
  mouthPixels: PixelSpec[];
}

const EXPRESSIONS: Record<SuspectEmotion, ExpressionDef> = {
  // ── calm ─────────────────────────────────────────────────────────
  // Straight single-pixel eyes, full-width neutral mouth.
  calm: {
    eyePixels: [
      { x: 3, dy: 0 }, { x: 8, dy: 0 },
    ],
    mouthPixels: [
      { x: 4, dy: 0 }, { x: 5, dy: 0 }, { x: 6, dy: 0 }, { x: 7, dy: 0 },
    ],
  },

  // ── nervous ──────────────────────────────────────────────────────
  // Small eyes (same 1-px pupils), worried brow dots directly above,
  // tight 2-px mouth. Paired with sprite-nervous CSS tremor.
  nervous: {
    eyePixels: [
      { x: 3, dy:  0 }, { x: 8, dy:  0 },   // pupils
      { x: 3, dy: -1 }, { x: 8, dy: -1 },   // brow dots right above = worried
    ],
    mouthPixels: [
      { x: 5, dy: 0 }, { x: 6, dy: 0 },     // tight small mouth
    ],
  },

  // ── angry ────────────────────────────────────────────────────────
  // Inner-heavy 2-px brows (angled downward toward center/nose),
  // firm 2-px corner-only mouth (clenched jaw).
  angry: {
    eyePixels: [
      { x: 3, dy:  0 }, { x: 8, dy:  0 },   // pupils
      { x: 3, dy: -1 }, { x: 4, dy: -1 },   // left brow: heavy on inner (nose) side
      { x: 7, dy: -1 }, { x: 8, dy: -1 },   // right brow: heavy on inner side
    ],
    mouthPixels: [
      { x: 4, dy: 0 }, { x: 7, dy: 0 },     // corner pixels only = firm jaw
    ],
  },

  // ── sad ──────────────────────────────────────────────────────────
  // Single inner-raised brow dots (outer corner visually droops),
  // inverted-curve mouth: center high, corners low = frown (∩).
  sad: {
    eyePixels: [
      { x: 3, dy:  0 }, { x: 8, dy:  0 },   // pupils
      { x: 4, dy: -1 }, { x: 7, dy: -1 },   // inner brow dot → outer droops
    ],
    mouthPixels: [
      { x: 5, dy: -1 }, { x: 6, dy: -1 },   // center high (mouthY-1)
      { x: 4, dy:  0 }, { x: 7, dy:  0 },   // corners low  (mouthY) → frown
    ],
  },

  // ── defensive ────────────────────────────────────────────────────
  // Very thick 3-px brows bearing down on the eyes (squinting impression),
  // tense full-width straight mouth.
  defensive: {
    eyePixels: [
      { x: 3, dy:  0 }, { x: 8, dy:  0 },                         // pupils
      { x: 2, dy: -1 }, { x: 3, dy: -1 }, { x: 4, dy: -1 },      // left thick brow
      { x: 7, dy: -1 }, { x: 8, dy: -1 }, { x: 9, dy: -1 },      // right thick brow
    ],
    mouthPixels: [
      { x: 4, dy: 0 }, { x: 5, dy: 0 }, { x: 6, dy: 0 }, { x: 7, dy: 0 },
    ],
  },

  // ── confident ────────────────────────────────────────────────────
  // Open eyes (no brows, relaxed), slight upward-curve smile (∪):
  // wide corners high, center low.
  confident: {
    eyePixels: [
      { x: 3, dy: 0 }, { x: 8, dy: 0 },     // pupils, no brows
    ],
    mouthPixels: [
      { x: 3, dy: -1 }, { x: 4, dy: -1 }, { x: 7, dy: -1 }, { x: 8, dy: -1 }, // corners high
      { x: 5, dy:  0 }, { x: 6, dy:  0 },                                        // center low → smile
    ],
  },

  // ── fearful ──────────────────────────────────────────────────────
  // Wide 2-px eyes (each eye = 2 adjacent pixels), raised brow dots,
  // small open O-mouth spanning mouthY-1 and mouthY.
  fearful: {
    eyePixels: [
      { x: 2, dy: 0 }, { x: 3, dy: 0 }, { x: 8, dy: 0 }, { x: 9, dy: 0 }, // wide pupils
      { x: 3, dy: -1 }, { x: 8, dy: -1 },                                    // raised brows
    ],
    mouthPixels: [
      { x: 5, dy: -1 }, { x: 6, dy: -1 },   // top of O-mouth  (mouthY-1)
      { x: 5, dy:  0 }, { x: 6, dy:  0 },   // bottom of O-mouth (mouthY)
    ],
  },
};

/* ══════════════════════════════════════════════════════════════════
   Sprite renderer
══════════════════════════════════════════════════════════════════ */
function renderSprite(sprite: SpriteData): JSX.Element[] {
  const { palette, rows } = sprite;
  const rects: JSX.Element[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color || color === "transparent") continue;
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      );
    }
  });
  return rects;
}

/**
 * Builds an SVG rect overlay that replaces the default eyes/mouth
 * with the expression for the given emotion.
 * Rendered on top of the base sprite — no sprite data is mutated.
 *
 * Erase strategy (paint skin first, then new pixels on top):
 *   - eyeY-1 cols 2–9 : full brow row
 *   - eyeY   cols 2–9 : full eye row (covers 2-px wide fearful eyes)
 *   - mouthY-1 cols 3–8 : cheek row used for curve anchors
 *   - mouthY   cols 3–8 : main mouth row (covers wider confident smile)
 */
function renderEmotionFace(
  sprite: SpriteData,
  emotion: SuspectEmotion,
): JSX.Element[] {
  const { rows, palette } = sprite;

  let eyeY   = -1;
  let mouthY = -1;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].includes("E") && eyeY   === -1) eyeY   = r;
    if (rows[r].includes("M") && mouthY === -1) mouthY = r;
  }
  if (eyeY < 0 || mouthY < 0) return [];

  const skinColor  = palette["F"] ?? SKIN;
  const eyeColor   = palette["E"] ?? EYE;
  const mouthColor = palette["M"] ?? MOUTH;

  const expr = EXPRESSIONS[emotion];
  const result: JSX.Element[] = [];
  let k = 0;

  const px = (x: number, y: number, color: string) =>
    result.push(<rect key={`em${k++}`} x={x} y={y} width={1} height={1} fill={color} />);

  // ── Erase zones ────────────────────────────────────────────────
  // Brow row: all positions that could carry a brow or wide-eye pixel
  if (eyeY > 0) {
    for (let x = 2; x <= 9; x++) px(x, eyeY - 1, skinColor);
  }
  // Eye row: covers standard (3,8) and fearful wide (2,3,8,9)
  for (let x = 2; x <= 9; x++) px(x, eyeY, skinColor);

  // Cheek row above mouth: used by smile/frown/open-mouth anchors
  if (mouthY > 0) {
    for (let x = 3; x <= 8; x++) px(x, mouthY - 1, skinColor);
  }
  // Main mouth row: covers standard [4-7] and wide confident corners [3,8]
  for (let x = 3; x <= 8; x++) px(x, mouthY, skinColor);

  // ── Draw new face pixels ───────────────────────────────────────
  for (const { x, dy } of expr.eyePixels) {
    px(x, eyeY + dy, eyeColor);
  }
  for (const { x, dy } of expr.mouthPixels) {
    px(x, mouthY + dy, mouthColor);
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════════
   Public component
══════════════════════════════════════════════════════════════════ */
type PixelCharacterProps = {
  /** "detective" or index of suspect variant (0-4) */
  variant: "detective" | number;
  /** Scale factor — default 4 (48 px wide, proportional height) */
  scale?: number;
  animated?: boolean;
  className?: string;
  /** Dominant emotion for suspect facial expression. Ignored for detective. */
  emotion?: SuspectEmotion;
};

export default function PixelCharacter({
  variant,
  scale = PX,
  animated = true,
  className = "",
  emotion,
}: PixelCharacterProps) {
  const sprite =
    variant === "detective"
      ? DETECTIVE
      : SUSPECT_SPRITES[
          typeof variant === "number" ? variant % SUSPECT_SPRITES.length : 0
        ];

  const cols    = 12;
  const numRows = sprite.rows.length;
  const w = cols    * scale;
  const h = numRows * scale;

  const animClass = animated
    ? "animate-idle-float animate-pixel-blink pixel-sprite"
    : "pixel-sprite";

  const isSuspect = variant !== "detective";

  // Recompute only when sprite or emotion changes
  const faceOverlay = useMemo(
    () => (isSuspect && emotion ? renderEmotionFace(sprite, emotion) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprite, emotion, isSuspect],
  );

  // Map each emotion to its CSS micro-animation class.
  // Applied on an inner wrapper so transforms compose safely with the
  // outer animate-idle-float (different elements = no conflict).
  const EMOTION_CLASS: Partial<Record<SuspectEmotion, string>> = {
    nervous:   "sprite-nervous",
    fearful:   "sprite-fearful",
    angry:     "sprite-angry",
    sad:       "sprite-sad",
    confident: "sprite-confident",
    // calm and defensive: base sprite only, no extra animation
  };
  const emotionClass = isSuspect && emotion ? EMOTION_CLASS[emotion] : undefined;

  return (
    <div className={`inline-block ${animClass} ${className}`} style={{ lineHeight: 0 }}>
      <div className={emotionClass}>
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${cols} ${numRows}`}
          shapeRendering="crispEdges"
          style={{ imageRendering: "pixelated" }}
        >
          {renderSprite(sprite)}
          {faceOverlay}
        </svg>
      </div>
    </div>
  );
}
