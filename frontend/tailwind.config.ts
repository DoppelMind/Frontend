import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void:    "#080612",
        abyss:   "#100d1e",
        deep:    "#16122a",
        "rpg-dark":  "#1c1830",
        "rpg-mid":   "#241f3a",
        "rpg-raised":"#2d2748",
        "rpg-border":"#3e2f5c",
        "rpg-border2":"#5a4280",
        gold:    "#d4a017",
        "gold-lt":"#f5c842",
        "gold-dk":"#7a5c0a",
        wine:    "#7a1528",
        "wine-lt":"#c42040",
        "wine-dk":"#40091a",
        teal:    "#0d5c6e",
        "teal-lt":"#16899e",
        jade:    "#0d5c40",
        "jade-lt":"#1aaf74",
        cream:   "#e8d5a3",
        warm:    "#b09070",
        dim:     "#6b5545",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        vt:    ["var(--font-vt)",    "monospace"],
      },
      keyframes: {
        pixelBlink: {
          "0%, 82%, 86%, 90%, 94%, 100%": { opacity: "1" },
          "84%, 88%, 92%":                { opacity: "0" },
        },
        idleFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        candleFlicker: {
          "0%, 100%": { opacity: "1",    filter: "brightness(1)    drop-shadow(0 0 6px #f09008aa)" },
          "20%":      { opacity: "0.85", filter: "brightness(0.85) drop-shadow(0 0 3px #f09008aa)" },
          "40%":      { opacity: "0.95", filter: "brightness(1.1)  drop-shadow(0 0 10px #f09008aa)" },
          "60%":      { opacity: "0.75", filter: "brightness(0.7)  drop-shadow(0 0 2px #f09008aa)" },
          "80%":      { opacity: "0.90", filter: "brightness(0.9)  drop-shadow(0 0 6px #f09008aa)" },
        },
        glowGold: {
          "0%, 100%": { textShadow: "0 0 4px #d4a017, 0 0 8px #7a5c0a" },
          "50%":      { textShadow: "0 0 8px #f5c842, 0 0 20px #d4a017, 0 0 40px #7a5c0a" },
        },
        fadein: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { left: "-100%" },
          "100%": { left:  "200%" },
        },
        revealRight: {
          from: { clipPath: "inset(0 100% 0 0)" },
          to:   { clipPath: "inset(0 0% 0 0)" },
        },
        dotBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pixel-blink":  "pixelBlink 6s 2s infinite",
        "idle-float":   "idleFloat 3s ease-in-out infinite",
        "candle":       "candleFlicker 2.5s ease-in-out infinite",
        "glow-gold":    "glowGold 2s ease-in-out infinite",
        "fadein":       "fadein 0.4s ease-out forwards",
        "shimmer":      "shimmer 1.5s linear infinite",
        "reveal-right": "revealRight 0.05s steps(1) forwards",
        "dot-bounce":   "dotBounce 0.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
