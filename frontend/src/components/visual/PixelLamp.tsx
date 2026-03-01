interface PixelLampProps {
  /** Width of rendered lamp in px. Height scales proportionally. */
  size?: number;
}

/**
 * SVG pixel-art ceiling lamp with cord, shade, and glowing bulb.
 * Grid: 12×10 px — each cell renders at `size/12` px.
 */
export default function PixelLamp({ size = 48 }: PixelLampProps) {
  const h = Math.round((size / 12) * 10);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 12 10"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
      aria-hidden
    >
      {/* Hanging cord */}
      <rect x={5}  y={0} width={2} height={2} fill="#2a1a08" />

      {/* Lamp shade outer rim */}
      <rect x={2}  y={2} width={8} height={1} fill="#3d2612" />

      {/* Shade body */}
      <rect x={1}  y={3} width={10} height={3} fill="#2a1a08" />
      <rect x={2}  y={3} width={8}  height={3} fill="#4a3218" />

      {/* Warm bulb glow */}
      <rect x={4}  y={4} width={4}  height={2} fill="#f8dc60" opacity={0.92} />
      <rect x={5}  y={4} width={2}  height={1} fill="#ffffff" opacity={0.55} />

      {/* Shade bottom lip (left / right) */}
      <rect x={0}  y={6} width={2}  height={1} fill="#2a1a08" />
      <rect x={10} y={6} width={2}  height={1} fill="#2a1a08" />
    </svg>
  );
}
