import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // World Cup 2026 host nations palette
        wc: {
          red: "#E4002B",     // Canada / USA red
          green: "#006847",   // Mexico green
          blue: "#0A3161",    // USA navy
          gold: "#F1B434",    // accent gold
          cream: "#FAF7F2",   // soft background
          ink: "#0B0F19",     // text
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial"],
      },
    },
  },
  plugins: [],
} satisfies Config;
