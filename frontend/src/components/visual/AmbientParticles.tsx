/**
 * Floating dust-mote particles using CSS animations.
 * Particle positions are pre-computed (static) to avoid SSR/hydration mismatches.
 * Each particle references CSS custom properties --p-opacity and --p-drift,
 * which are set as inline styles and consumed by the `particleDrift` keyframe
 * defined in globals.css.
 */

interface Particle {
  x: number;       // left position %
  y: number;       // starting top % (particles drift UPWARD)
  size: number;    // diameter in px
  dur: number;     // animation duration seconds
  del: number;     // animation delay seconds
  drift: number;   // horizontal drift in px (can be negative)
  opacity: number; // peak opacity
}

const PARTICLES: Particle[] = [
  { x:  5, y: 90, size: 1.5, dur:  9.2, del:  0.0, drift:  12, opacity: 0.35 },
  { x: 12, y: 75, size: 2.0, dur: 12.8, del:  1.5, drift:  -8, opacity: 0.25 },
  { x: 19, y: 60, size: 1.0, dur:  8.1, del:  3.0, drift:  15, opacity: 0.40 },
  { x: 26, y: 85, size: 2.0, dur: 11.3, del:  0.5, drift: -12, opacity: 0.20 },
  { x: 33, y: 50, size: 1.0, dur: 10.0, del:  2.0, drift:   8, opacity: 0.30 },
  { x: 40, y: 95, size: 2.5, dur: 14.2, del:  4.0, drift:  -6, opacity: 0.15 },
  { x: 46, y: 70, size: 1.0, dur:  7.4, del:  1.0, drift:  14, opacity: 0.45 },
  { x: 52, y: 80, size: 2.0, dur: 12.1, del:  3.5, drift: -10, opacity: 0.20 },
  { x: 59, y: 55, size: 1.0, dur:  9.5, del:  0.8, drift:  10, opacity: 0.35 },
  { x: 65, y: 90, size: 2.0, dur: 11.7, del:  2.3, drift: -14, opacity: 0.25 },
  { x: 72, y: 65, size: 1.0, dur:  8.3, del:  4.5, drift:   8, opacity: 0.30 },
  { x: 78, y: 78, size: 2.5, dur: 15.0, del:  1.2, drift: -10, opacity: 0.15 },
  { x: 84, y: 88, size: 1.0, dur: 10.4, del:  3.2, drift:  12, opacity: 0.35 },
  { x: 91, y: 60, size: 2.0, dur:  9.0, del:  0.3, drift:  -8, opacity: 0.25 },
  { x:  8, y: 40, size: 1.0, dur:  7.0, del:  5.0, drift:  16, opacity: 0.20 },
  { x: 22, y: 30, size: 2.0, dur: 13.3, del:  2.8, drift:  -6, opacity: 0.15 },
  { x: 43, y: 25, size: 1.0, dur: 11.1, del:  1.8, drift:  10, opacity: 0.25 },
  { x: 57, y: 35, size: 2.0, dur:  8.6, del:  4.2, drift: -12, opacity: 0.20 },
  { x: 69, y: 20, size: 1.0, dur: 12.4, del:  0.6, drift:  14, opacity: 0.30 },
  { x: 87, y: 45, size: 2.5, dur: 14.6, del:  3.8, drift:  -8, opacity: 0.12 },
  { x:  3, y: 55, size: 1.0, dur:  9.3, del:  2.1, drift:  18, opacity: 0.28 },
  { x: 48, y: 15, size: 2.0, dur: 10.7, del:  5.5, drift: -10, opacity: 0.18 },
  { x: 63, y: 50, size: 1.0, dur:  8.8, del:  1.9, drift:  12, opacity: 0.32 },
  { x: 81, y: 30, size: 2.0, dur: 11.5, del:  3.4, drift:  -6, opacity: 0.22 },
  { x: 96, y: 75, size: 1.0, dur: 13.2, del:  0.9, drift:   8, opacity: 0.27 },
];

interface AmbientParticlesProps {
  /** Base color of the particles */
  color?: string;
  /** Multiplies all particle opacities (0–1) */
  intensity?: number;
  /** CSS z-index */
  zIndex?: number;
}

export default function AmbientParticles({
  color = "#d4a017",
  intensity = 1,
  zIndex = 1,
}: AmbientParticlesProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
      style={{ zIndex }}
    >
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
            opacity: 0,
            animation: `particleDrift ${p.dur}s ${p.del}s ease-in-out infinite`,
            // These CSS custom properties are read by the `particleDrift` keyframe:
            "--p-opacity": p.opacity * intensity,
            "--p-drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
