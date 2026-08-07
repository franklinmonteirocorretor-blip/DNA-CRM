import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headers de segurança para produção
  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).hostname : '*'

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://*.supabase.co",
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: https://*.supabase.co https://${supabaseDomain}`,
            "connect-src 'self' https://*.supabase.co",
            "frame-src 'self'",
            "font-src 'self'",
          ].join('; ') },
        ],
      },
    ]
  },
};

export default nextConfig;