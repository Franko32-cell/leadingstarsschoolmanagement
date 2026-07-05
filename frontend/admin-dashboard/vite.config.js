import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Optional: raise the warning threshold slightly if you'd rather not
    // see the message for anything under, say, 600 kB.
    // chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Split out React itself into its own chunk — it rarely
            // changes and benefits most from long-term caching.
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
              return "vendor-react";
            }

            // Common culprits for bloated bundles — split each into
            // its own chunk if you're using them. Harmless if not:
            // the check just won't match and falls through.
            if (id.includes("chart.js") || id.includes("recharts") || id.includes("d3")) {
              return "vendor-charts";
            }
            if (id.includes("lodash")) {
              return "vendor-lodash";
            }
            if (id.includes("date-fns") || id.includes("dayjs") || id.includes("moment")) {
              return "vendor-dates";
            }

            // Everything else from node_modules goes into a general
            // vendor chunk, separate from your own app code.
            return "vendor";
          }
        },
      },
    },
  },
});