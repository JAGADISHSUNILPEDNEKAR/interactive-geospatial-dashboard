/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  
  // Enable WebAssembly support
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Optimize Three.js imports
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'three': 'three/build/three.module.js',
      };
    }

    return config;
  },

  // Image optimization
  images: {
    domains: ['localhost', 'api.mapbox.com', 'tile.openstreetmap.org'],
    formats: ['image/avif', 'image/webp'],
  },

  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/api/flask/:path*',
        destination: process.env.FLASK_SERVICE_URL || 'http://localhost:5000/api/:path*',
      },
      {
        source: '/api/node/:path*',
        destination: process.env.NODE_SERVICE_URL || 'http://localhost:3001/api/:path*',
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Enable SWC plugins
  experimental: {
    optimizeCss: true,
    serverActions: true,
  },
};

module.exports = nextConfig;