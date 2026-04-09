import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New TokenScope palette
        bg: "#F7F4F0",
        surface: "#FFFFFF",
        "surface-2": "#F0EDE8",
        black: {
          DEFAULT: "#0F0F0F",
          muted: "#6B6B6B",
          border: "#E2DDD7",
          soft: "#9B9590",
        },
        jaffa: {
          DEFAULT: "#F07F3C",
          light: "#F5A96A",
          dark: "#C4602A",
          muted: "#F0A878",
          bg: "rgba(240,127,60,0.08)",
        },
        green: {
          DEFAULT: "#16563B",
          light: "#22885A",
          muted: "#3DA870",
          bg: "rgba(22,86,59,0.08)",
        },
        navy: {
          DEFAULT: "#002F4B",
          light: "#004E75",
          muted: "#337D9E",
          bg: "rgba(0,47,75,0.06)",
        },
        danger: "#C43030",
        warning: "#C97A10",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        "jaffa-glow": "0 0 20px rgba(240,127,60,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-jaffa": "pulseJaffa 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseJaffa: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(240,127,60,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(240,127,60,0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
