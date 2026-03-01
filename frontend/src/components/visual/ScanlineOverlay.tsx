interface ScanlineOverlayProps {
  /** Controls darkness of scanlines (0–1). Default 0.1 */
  opacity?: number;
  className?: string;
  /** CSS z-index */
  zIndex?: number;
  style?: React.CSSProperties;
}

/**
 * Reusable CRT scanline texture overlay.
 * Renders 4-px-tall repeating scanlines over its container.
 * Make the container `relative` for this to sit correctly.
 */
export default function ScanlineOverlay({
  opacity = 0.1,
  className = "",
  zIndex,
  style,
}: ScanlineOverlayProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 3px,
          rgba(0,0,0,${opacity}) 3px,
          rgba(0,0,0,${opacity}) 4px
        )`,
        ...(zIndex !== undefined ? { zIndex } : {}),
        ...style,
      }}
    />
  );
}
