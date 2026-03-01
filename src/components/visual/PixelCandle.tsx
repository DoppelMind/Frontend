interface PixelCandleProps {
  /** Animation delay in milliseconds */
  delay?: number;
  /** Override animation duration in ms */
  duration?: number;
}

/**
 * CSS pixel-art candle with animated flame.
 * Uses the `animate-candle` class from tailwind.config.ts (candleFlicker keyframe).
 */
export default function PixelCandle({ delay = 0, duration = 2200 }: PixelCandleProps) {
  return (
    <div className="flex flex-col items-center select-none" aria-hidden>
      {/* ── Flame ─────────────────────────────────────── */}
      <div
        className="animate-candle"
        style={{ animationDelay: `${delay}ms`, animationDuration: `${duration}ms` }}
      >
        {/* Flame shape */}
        <div
          style={{
            width: 6,
            height: 10,
            background: "linear-gradient(to top, #c03000, #f09010, #f8d030)",
            clipPath: "polygon(50% 0%, 88% 46%, 78% 100%, 22% 100%, 12% 46%)",
            margin: "0 auto",
            imageRendering: "pixelated",
          }}
        />
        {/* Halo glow */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(240,150,8,0.38) 0%, transparent 70%)",
            marginTop: -15,
            marginLeft: -7,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Candle body ──────────────────────────────── */}
      <div
        style={{
          width: 10,
          height: 42,
          background: "linear-gradient(to right, #f0e0c0 0%, #d4c090 45%, #b09060 100%)",
          border: "1px solid #7a6040",
          marginTop: -5,
          imageRendering: "pixelated",
        }}
      />

      {/* ── Base ─────────────────────────────────────── */}
      <div
        style={{
          width: 16,
          height: 5,
          background: "#3a2410",
          border: "1px solid #1a0e08",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
