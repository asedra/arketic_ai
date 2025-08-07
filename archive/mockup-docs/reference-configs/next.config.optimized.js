/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Enable React strict mode for better performance debugging
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  experimental: {
    outputFileTracingRoot: __dirname,
    // Enable app directory features
    appDir: true,
    // Enable server components caching
    serverComponentsExternalPackages: ['sharp'],
    // Enable webpack build worker
    webpackBuildWorker: true,
  },
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Security and performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), fullscreen=(self)',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*).css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://api.arketic.com/api/:path*'
          : 'http://localhost:8000/api/:path*',
      },
    ];
  },
  
  // Health check endpoint
  async redirects() {
    return [
      {
        source: '/health',
        destination: '/api/health',
        permanent: false,
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || 'development',
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  },
  
  // Advanced Webpack configuration for performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      )
    }
    
    // Advanced chunk splitting for better caching
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // Vendor chunks
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          
          // UI components chunk
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /[\\/]components[\\/]ui[\\/]/,
            priority: 30,
          },
          
          // Common chunks
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
          
          // Large libraries
          d3: {
            name: 'd3',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]d3/,
            priority: 40,
          },
          
          recharts: {
            name: 'recharts',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]recharts/,
            priority: 40,
          },
        },
      }
    }
    
    // Tree shaking optimizations
    config.optimization.usedExports = true
    config.optimization.sideEffects = false
    
    // Add performance hints
    if (!dev) {
      config.performance = {
        maxAssetSize: 250000,
        maxEntrypointSize: 250000,
        hints: 'warning',
      }
    }
    
    return config;
  },
  
  // Enhanced image optimization
  images: {
    domains: ['arketic.com', 'api.arketic.com'],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Internationalization
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;