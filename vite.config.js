import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { razorpayServerPlugin } from './src/lib/razorpay/serverMiddleware.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), razorpayServerPlugin(env)],
  }
})
