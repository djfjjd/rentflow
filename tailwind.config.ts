import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        field: "#F7F8FA",
        line: "#E5E7EB",
        primary: "#176B5B",
        "primary-strong": "#0F4F43",
        amber: "#C47A1A",
      },
      boxShadow: {
        soft: "0 14px 40px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
