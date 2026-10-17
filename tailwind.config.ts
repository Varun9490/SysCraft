import type { Config } from "tailwindcss";

/**
 * System palette is a warm charcoal canvas with a single desaturated brass
 * accent. The default `zinc` / `sky` / `violet` / `cyan` scales are remapped so
 * existing utility classes adopt the new language without churn.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        zinc: {
          50: "#F7F4EE",
          100: "#EEEAE3",
          200: "#DAD5CA",
          300: "#C4BEB2",
          400: "#A8A296",
          500: "#7A7468",
          600: "#46423A",
          700: "#2C2A23",
          800: "#201E19",
          900: "#141310",
          950: "#0C0B09",
        },
        sky: {
          50: "#FBF6EC",
          100: "#F7EDD8",
          200: "#F0DEBB",
          300: "#E6CC9F",
          400: "#DBBB86",
          500: "#CDA86A",
          600: "#B08A52",
          700: "#9A7642",
          800: "#7A5A28",
          900: "#57401C",
          950: "#3A2C14",
        },
        cyan: {
          300: "#E6CC9F",
          400: "#DBBB86",
          500: "#CDA86A",
        },
        violet: {
          200: "#E6CC9F",
          300: "#DBBB86",
          400: "#B08A52",
          500: "#9A7642",
          600: "#7A5A28",
        },
        emerald: {
          50: "#EDF2E7",
          100: "#DCE7D2",
          200: "#C6D8B6",
          300: "#AFC79B",
          400: "#93B27C",
          500: "#7E9A6A",
        },
        amber: {
          50: "#F7EEDD",
          100: "#F1E0C4",
          200: "#E9CEA1",
          300: "#E7C08A",
          400: "#D6A863",
          500: "#C58F4A",
        },
        rose: {
          50: "#F6E4E2",
          300: "#E3A19C",
          400: "#CE7E78",
          500: "#BE5F58",
        },
        ink: "rgb(var(--ink) / <alpha-value>)",
        app: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          overlay: "rgb(var(--surface-overlay) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        content: {
          DEFAULT: "rgb(var(--content) / <alpha-value>)",
          secondary: "rgb(var(--content-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--content-tertiary) / <alpha-value>)",
        },
        brass: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          bright: "rgb(var(--accent-bright) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
        },
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
      boxShadow: {
        card: "inset 0 1px 0 0 rgb(var(--content) / 0.04), 0 24px 48px -30px rgb(0 0 0 / 0.9)",
        lift: "0 36px 70px -42px rgb(0 0 0 / 0.95)",
        "top-hair": "inset 0 1px 0 0 rgb(var(--content) / 0.06)",
      },
      backgroundImage: {
        "brass-sheen":
          "linear-gradient(110deg, transparent 30%, rgb(var(--accent-bright) / 0.35) 50%, transparent 70%)",
      },
    },
  },
  plugins: [],
};

export default config;
