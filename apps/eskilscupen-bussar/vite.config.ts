import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` is relative so the built site works from a subfolder on GitHub Pages
// as well as from the domain root on Netlify/Vercel.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
})
