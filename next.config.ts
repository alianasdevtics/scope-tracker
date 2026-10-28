import type { NextConfig } from 'next'

const config: NextConfig = {
  // Enables forbidden(), so PM-only actions answer 403 instead of a generic error.
  experimental: { authInterrupts: true },
}

export default config
