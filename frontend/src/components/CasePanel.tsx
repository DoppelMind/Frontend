import { Case } from "@/types/game";
import { useState } from "react";
import { Language, getText } from "@/lib/i18n";

interface CasePanelProps {
  caseData: Case;
  requirements?: string[];
  language: Language;
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-3" style={{ alignItems: "flex-start" }}>
    <span
      className="font-pixel flex-shrink-0"
      style={{ fontSize: 6, color: "var(--gold-dk)", width: 52, paddingTop: 4, letterSpacing: "0.08em" }}
    >
      {label}
    </span>
    <span className="font-vt leading-snug" style={{ fontSize: 17, color: "var(--cream)" }}>
      {value}
    </span>
  </div>
);

export default function CasePanel({ caseData, requirements = [], language }: CasePanelProps) {
  const [checked, setChecked] = useState<boolean[]>(requirements.map(() => false));
  const [open, setOpen] = useState(true);
  const t = getText(language);

  const toggle = (i: number) => {
    setChecked((prev) => { const next = [...prev]; next[i] = !next[i]; return next; });
  };
  return (
    <div
      className="p-4"
      style={{ background: "var(--deep)", borderBottom: "2px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="badge badge-wine">{t.casePanel.activeCase}</span>
      </div>

      <h2
        className="font-pixel leading-loose mb-4"
        style={{ fontSize: 8, color: "var(--cream)", lineHeight: 2 }}
      >
        {caseData.title}
      </h2>

      <div className="pixel-divider-dim mb-4" />

      {/* Fields */}
      <div className="space-y-2">
        <Field label={t.casePanel.victim} value={caseData.victim} />
        <Field label={t.casePanel.place} value={caseData.setting} />
        <Field label={t.casePanel.time} value={caseData.time} />
        <Field label={t.casePanel.crime} value={caseData.crime} />
      </div>

      {/* Description */}
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="font-vt leading-relaxed" style={{ fontSize: 16, color: "var(--warm)" }}>
          {caseData.description}
        </p>
      </div>

      {/* ── Requirements checklist colapsable ──────────────────── */}
      {requirements.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>

          {/* Botón de colapsar/expandir */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel" style={{ fontSize: 6, color: "var(--gold-dk)", letterSpacing: "0.1em" }}>
                {t.casePanel.keyEvidence}
              </span>
              <span className="font-pixel" style={{ fontSize: 5, color: "var(--dim)" }}>
                ({checked.filter(Boolean).length}/{requirements.length})
              </span>
            </div>
            <span className="font-pixel" style={{ fontSize: 7, color: "var(--gold-dk)" }}>
              {open ? "▲" : "▼"}
            </span>
          </button>

          {/* Lista colapsable */}
          {open && (
            <div className="mt-3 space-y-2">
              <p className="font-vt mb-2" style={{ fontSize: 13, color: "var(--dim)", fontStyle: "italic" }}>
                {t.casePanel.onlyReal}
              </p>
              {requirements.map((req, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="w-full text-left flex items-start gap-2"
                  style={{
                    padding: "6px 8px",
                    background: checked[i] ? "rgba(26,175,116,0.08)" : "var(--void)",
                    border: `1px solid ${checked[i] ? "var(--jade)" : "var(--border)"}`,
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {/* Checkbox pixel */}
                  <div
                    style={{
                      width: 10, height: 10, flexShrink: 0, marginTop: 2,
                      border: `2px solid ${checked[i] ? "var(--jade-lt)" : "var(--dim)"}`,
                      background: checked[i] ? "var(--jade)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {checked[i] && <span style={{ fontSize: 7, color: "var(--void)", fontWeight: "bold", lineHeight: 1 }}>✓</span>}
                  </div>
                  <span
                    className="font-vt leading-snug"
                    style={{
                      fontSize: 13,
                      color: checked[i] ? "var(--jade-lt)" : "var(--cream)",
                      textDecoration: checked[i] ? "line-through" : "none",
                      opacity: checked[i] ? 0.6 : 1,
                    }}
                  >
                    {req}
                  </span>
                </button>
              ))}
              {checked.filter(Boolean).length === requirements.length && (
                <div className="mt-2 py-2 text-center" style={{ border: "1px solid var(--jade)", background: "rgba(26,175,116,0.06)" }}>
                  <span className="font-pixel" style={{ fontSize: 6, color: "var(--jade-lt)", letterSpacing: "0.1em" }}>{t.casePanel.allChecked}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
