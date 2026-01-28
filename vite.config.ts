import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // Uses the environment variable if present, otherwise falls back to the hardcoded key
  const apiKey = env.API_KEY || "AIzaSyAb0OPdreVIPjUmEFYxxs55BZnav13vhPc";
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})