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
          // A single vendor chunk keeps all node_modules code together,
          // which avoids load-order/initialization bugs that can happen
          // when interdependent packages get split across chunks.
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});