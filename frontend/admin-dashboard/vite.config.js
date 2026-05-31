import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_PAYSTACK_PUBLIC_KEY': JSON.stringify(process.env.VITE_PAYSTACK_PUBLIC_KEY),
  },
})
