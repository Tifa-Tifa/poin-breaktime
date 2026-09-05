/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/app.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
