import { Suspect } from "@/types/game";

interface SuspectCardProps {
  suspect: Suspect;
  isSelected: boolean;
  questionCount: number;
  onClick: () => void;
  index: number;
}

/** Deterministic accent color based on suspect index */
const SUSPECT_COLORS = [
  { border: "#16899e", bg: "rgba(13,92,110,0.2)", dot: "#16899e" },   // teal
  { border: "#c42040", bg: "rgba(122,21,40,0.2)",  dot: "#c42040" },  // wine
  { border: "#9b59b6", bg: "rgba(75,20,140,0.2)",  dot: "#9b59b6" },  // purple
  { border: "#1aaf74", bg: "rgba(13,92,64,0.2)",   dot: "#1aaf74" },  // jade
  { border: "#e67e22", bg: "rgba(100,50,0,0.2)",   dot: "#e67e22" },  // amber-orange
];

/** Small pixel-art portrait area */
function PortraitBox({ index, isSelected }: { index: number; isSelected: boolean }) {
  const colors = SUSPECT_COLORS[index % SUSPECT_COLORS.length];
  return (
    <div
      style={{
        width: 34,
        height: 38,
        flexShrink: 0,
        background: isSelected ? colors.bg : "var(--void)",
        border: `2px solid ${isSelected ? colors.border : "var(--border)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        imageRendering: "pixelated",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      ?
    </div>
  );
}

export default function SuspectCard({
  suspect,
  isSelected,
  questionCount,
  onClick,
  index,
}: SuspectCardProps) {
  const interrogated = questionCount > 0;
  const colors = SUSPECT_COLORS[index % SUSPECT_COLORS.length];

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all duration-150"
      style={{
        padding: "8px 10px",
        background: isSelected ? colors.bg : "var(--void)",
        border: `2px solid ${isSelected ? colors.border : "var(--border)"}`,
        boxShadow: isSelected
          ? `3px 3px 0 ${colors.border}40, inset 0 0 0 1px ${colors.border}20`
          : "2px 2px 0 rgba(0,0,0,0.5)",
        cursor: "pointer",
      }}
    >
      <div className="flex items-center gap-2">
        <PortraitBox index={index} isSelected={isSelected} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="font-pixel truncate"
              style={{
                fontSize: 7,
                color: isSelected ? colors.border : "var(--cream)",
                lineHeight: 2,
              }}
            >
              {suspect.name}
            </span>
            {interrogated && (
              <span
                title="Interrogado"
                style={{
                  width: 6,
                  height: 6,
                  flexShrink: 0,
                  background: colors.dot,
                  boxShadow: `0 0 4px ${colors.dot}`,
                  imageRendering: "pixelated",
                }}
              />
            )}
          </div>
          <p
            className="font-vt truncate"
            style={{ fontSize: 15, color: "var(--dim)" }}
          >
            {suspect.occupation}
          </p>
        </div>

        {questionCount > 0 && (
          <span
            className="font-pixel flex-shrink-0"
            style={{
              fontSize: 6,
              color: colors.border,
              background: `${colors.border}18`,
              border: `1px solid ${colors.border}`,
              padding: "2px 5px",
            }}
          >
            {questionCount}P
          </span>
        )}
      </div>
    </button>
  );
}
