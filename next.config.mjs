// Nur diese Seiten dürfen den Kalender einbetten (Browser-seitige Sperre).
const frameAncestors = (process.env.ALLOWED_ORIGIN || 'https://arbeitsbereiche.vbg.de')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .join(' ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${frameAncestors}` },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
