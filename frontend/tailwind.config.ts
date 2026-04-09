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
        // Core palette
        bg: "#F7F4F0",
        surface: "#FFFFFF",
        "surface-2": "#F0EDE8",
        // Black scale
        black: {
          DEFAULT: "#0F0F0F",
          soft: "#9B9590",
          muted: "#6B6B6B",
          border: "#E2DDD7",
        },
        // Accent colors
        jaffa: {
          DEFAULT: "#F07F3C",
          light: "#F5A96A",
          dark: "#C4602A",
          muted: "#F0A878",
          "/4": "rgba(240,127,60,0.04)",
          "/8": "rgba(240,127,60,0.08)",
          "/10": "rgba(240,127,60,0.10)",
          "/12": "rgba(240,127,60,0.12)",
          "/15": "rgba(240,127,60,0.15)",
          "/20": "rgba(240,127,60,0.20)",
          "/25": "rgba(240,127,60,0.25)",
          "/30": "rgba(240,127,60,0.30)",
          "/50": "rgba(240,127,60,0.50)",
          "/75": "rgba(240,127,60,0.75)",
        },
        green: {
          DEFAULT: "#16563B",
          light: "#22885A",
          muted: "#3DA870",
          "/4": "rgba(22,86,59,0.04)",
          "/8": "rgba(22,86,59,0.08)",
          "/10": "rgba(22,86,59,0.10)",
          "/15": "rgba(22,86,59,0.15)",
          "/20": "rgba(22,86,59,0.20)",
          "/30": "rgba(22,86,59,0.30)",
        },
        navy: {
          DEFAULT: "#002F4B",
          light: "#004E75",
          muted: "#337D9E",
          "/4": "rgba(0,47,75,0.04)",
          "/6": "rgba(0,47,75,0.06)",
          "/8": "rgba(0,47,75,0.08)",
          "/10": "rgba(0,47,75,0.10)",
          "/20": "rgba(0,47,75,0.20)",
          "/30": "rgba(0,47,75,0.30)",
        },
        danger: {
          DEFAULT: "#C43030",
          "/8": "rgba(196,48,48,0.08)",
          "/10": "rgba(196,48,48,0.10)",
          "/20": "rgba(196,48,48,0.20)",
          "/30": "rgba(196,48,48,0.30)",
          "/90": "rgba(196,48,48,0.90)",
        },
        warning: {
          DEFAULT: "#C97A10",
          "/8": "rgba(201,122,16,0.08)",
          "/10": "rgba(201,122,16,0.10)",
        },
        // Aliases for convenience
        "jaffa-bg": "rgba(240,127,60,0.08)",
        "green-bg": "rgba(22,86,59,0.08)",
        "navy-bg": "rgba(0,47,75,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
        "jaffa-glow": "0 0 20px rgba(240,127,60,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-jaffa": "pulseJaffa 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
