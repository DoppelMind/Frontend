"use client";

import { useRef, useEffect } from "react";

interface DynamicLightProps {
  /**
   * Glow intensity (alpha at center).
   * 0.05 = very subtle torch, 0.12 = noticeable lantern.
   */
  intensity?: number;
  /** CSS rgb triplet, e.g. "212, 160, 23" for gold. */
  rgbColor?: string;
  /**
   * Lerp factor for smooth mouse-follow (0–1).
   * Lower = more lag (dreamier), higher = snappier.
   */
  lerp?: number;
  /** CSS z-index */
  zIndex?: number;
}

/**
 * Performant mouse-follow atmospheric light.
 * Uses requestAnimationFrame + direct DOM writes — zero React re-renders.
 */
export default function DynamicLight({
  intensity = 0.07,
  rgbColor = "212, 160, 23",
  lerp = 0.055,
  zIndex = 2,
}: DynamicLightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 50, y: 42 });
  const target = useRef({ x: 50, y: 42 });
  const raf = useRef<number>();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 100;
      target.current.y = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * lerp;
      pos.current.y += (target.current.y - pos.current.y) * lerp;

      const el = divRef.current;
      if (el) {
        const { x, y } = pos.current;
        el.style.background = `radial-gradient(
          ellipse 40% 42% at ${x}% ${y}%,
          rgba(${rgbColor}, ${intensity})     0%,
          rgba(${rgbColor}, ${intensity * 0.45}) 30%,
          transparent 68%
        )`;
      }

      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [intensity, rgbColor, lerp]);

  return (
    <div
      ref={divRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex }}
    />
  );
}
