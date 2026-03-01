"use client";

import { useState } from "react";
import { Suspect } from "@/types/game";
import { Language, getText } from "@/lib/i18n";

interface AccusationModalProps {
  suspects: Suspect[];
  onAccuse: (suspectId: string) => void;
  onClose: () => void;
  language: Language;
}

const SUSPECT_COLORS = [
  "#16899e", "#c42040", "#9b59b6", "#1aaf74", "#e67e22",
];

export default function AccusationModal({
  suspects,
  onAccuse,
  onClose,
  language,
}: AccusationModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const t = getText(language);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(4,3,10,0.92)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="dialogue-wine max-w-md w-full"
        style={{ padding: "32px 28px" }}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="text-center mb-7">
          <div
            className="font-pixel glow-wine mb-4"
            style={{ fontSize: 28, color: "var(--wine-lt)", lineHeight: 1 }}
          >
            !
          </div>
          <div className="pixel-divider-wine mb-5" />
          <span className="badge badge-wine mb-3" style={{ display: "inline-block" }}>
            {t.accusation.final}
          </span>
          <h2
            className="font-pixel mt-3"
            style={{ fontSize: 10, color: "var(--cream)", lineHeight: 2 }}
          >
            {t.accusation.who}
          </h2>
          <p className="font-vt mt-2" style={{ fontSize: 18, color: "var(--dim)" }}>
            {t.accusation.warning}
          </p>
        </div>

        {/* ── Suspect list ─────────────────────────────────────── */}
        <div className="space-y-2 mb-7">
          {suspects.map((s, idx) => {
            const color = SUSPECT_COLORS[idx % SUSPECT_COLORS.length];
            const isChosen = selectedId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full text-left transition-all duration-100"
                style={{
                  padding: "10px 14px",
                  background: isChosen ? `${color}22` : "var(--void)",
                  border: `2px solid ${isChosen ? color : "var(--border)"}`,
                  boxShadow: isChosen ? `3px 3px 0 ${color}50` : "2px 2px 0 rgba(0,0,0,0.6)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Mini portrait */}
                  <div
                    style={{
                      width: 24,
                      height: 28,
                      flexShrink: 0,
                      background: isChosen ? `${color}30` : "transparent",
                      border: `2px solid ${isChosen ? color : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    ?
                  </div>
                  <div>
                    <div
                      className="font-pixel"
                      style={{ fontSize: 7, color: isChosen ? color : "var(--cream)", lineHeight: 2 }}
                    >
                      {s.name}
                    </div>
                    <div className="font-vt" style={{ fontSize: 16, color: "var(--dim)" }}>
                      {s.occupation} · {s.relationship_to_victim}
                    </div>
                  </div>
                  {isChosen && (
                    <span
                      className="ml-auto font-pixel"
                      style={{ fontSize: 8, color, flexShrink: 0 }}
                    >
                      ▶
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pixel-divider-dim mb-6" />

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="flex gap-4">
          <button onClick={onClose} className="btn-rpg btn-rpg-ghost flex-1 font-pixel" style={{ fontSize: 7 }}>
            {t.accusation.cancel}
          </button>
          <button
            onClick={() => selectedId && onAccuse(selectedId)}
            disabled={!selectedId}
            className="btn-rpg btn-rpg-wine flex-1 font-pixel"
            style={{ fontSize: 7 }}
          >
            {t.accusation.accuse}
          </button>
        </div>
      </div>
    </div>
  );
}
