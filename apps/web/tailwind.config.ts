import type { Config } from "tailwindcss";

/**
 * DevStats design system — "spec sheet" aesthetic.
 * Lifted from the OVR-01 reference: hazard orange, true black, bone white.
 * Mono everywhere. Heavy black bars as section headers.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hazard: {
          DEFAULT: "#FF5A1F",
          50:  "#FFF1EA",
          100: "#FFE0CC",
          200: "#FFBE99",
          300: "#FF9C66",
          400: "#FF7A33",
          500: "#FF5A1F",
          600: "#E04510",
          700: "#B0340C",
        },
        ink: {
          DEFAULT: "#0A0A0A",
          soft: "#1A1A1A",
          mute: "#3A3A3A",
        },
        bone: {
          DEFAULT: "#F5F1EA",
          soft:    "#EDE7DC",
        },
        grid: "rgba(10,10,10,0.07)",
      },
      fontFamily: {
        sans:    ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono:    ["var(--font-geist-mono)", "ui-monospace", "Menlo"],
        display: ["var(--font-geist-sans)", "ui-sans-serif"],
      },
      letterSpacing: {
        spec: "0.08em",
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
      },
      backgroundImage: {
        "grid-blueprint":
          "linear-gradient(to right, var(--tw-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--tw-grid) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-32": "32px 32px",
      },
    },
  },
  plugins: [],
};
export default config;
