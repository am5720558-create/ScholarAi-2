import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Strictly using the provided API key as requested
    'process.env.API_KEY': JSON.stringify("AIzaSyCgmQQECX5u9PHRZiIB1DpxleLSmV8xuGk")
  }
})