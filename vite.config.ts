import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Uses the environment variable if present, otherwise falls back to your hardcoded key
  const apiKey = env.API_KEY || "AIzaSyDWuq3GOvLhKJVRJFxaBOJchSaLpGo4o3I";
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})