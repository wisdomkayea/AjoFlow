import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    fontFamily: {
      sans: ["Geist"],
      serif: ["Geist"],
      mono: ["Geist"]
    },
    extend: {
      colors: {
        ink: "#0F1B14",
        canvas: "#F5F7F1",
        forest: {
          50: "#EAF3EC",
          100: "#CFE6D5",
          300: "#7FB894",
          500: "#2F7A4F",
          600: "#25623F",
          700: "#1B4A2F",
          900: "#0F2E1D"
        },
        primary: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534"
        },
        gold: {
          200: "#F2E1B0",
          400: "#E0B84E",
          500: "#CC9E2E",
          600: "#A67F20"
        },
        clay: "#B45A3C",
        line: "#DCD7C9"
      },
      fontFamily: {
        display: ["Geist"],
        body: ["Geist"],
        mono: ["Geist"]
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,20,0.06), 0 8px 24px -12px rgba(15,27,20,0.15)"
      }
    }
  },
  plugins: []
};

export default config;
