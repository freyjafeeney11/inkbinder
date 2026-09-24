/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FAF7F1",
          dim: "#F1ECE1",
          dark: "#17140F",
          darkdim: "#1E1A13",
        },
        ink: {
          DEFAULT: "#221E17",
          soft: "#524B3E",
          faint: "#8A8171",
          inverse: "#EDE7D9",
        },
        brass: {
          50: "#F7F1E6",
          100: "#EBDCB8",
          200: "#D9BE84",
          300: "#C29F5C",
          400: "#A9803F",
          500: "#8B6A32",
          600: "#6E5327",
          700: "#513C1C",
        },
        signal: {
          amber: "#C1793B",
          rust: "#9C4A2C",
          moss: "#5C6E4E",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        serif: ["\"Source Serif 4\"", "Georgia", "ui-serif", "serif"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(34, 30, 23, 0.06), 0 1px 1px rgba(34, 30, 23, 0.04)",
        panel: "inset -1px 0 0 rgba(34, 30, 23, 0.06)",
      },
      transitionTimingFunction: {
        quill: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
