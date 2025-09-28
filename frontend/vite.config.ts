import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  // Use absolute '/' in dev for HMR, but relative paths in production so
  // the site works when deployed to GitHub Pages under /<repo>/ or a custom path.
  base: mode === 'development' ? '/' : './',
  plugins: [react()]
}))
