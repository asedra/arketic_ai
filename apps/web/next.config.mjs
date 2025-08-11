// Bundle analyzer configuration (optional)
let withBundleAnalyzer = (config) => config;
try {
  const bundleAnalyzer = await import('@next/bundle-analyzer');
  withBundleAnalyzer = bundleAnalyzer.default({
    enabled: process.env.ANALYZE === 'true',
  });
} catch (e) {
  console.log('Bundle analyzer not installed, skipping...');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // React 19 optimizations (stable features only)
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/*',
      'sonner',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'clsx',
      'tailwind-merge'
    ],
    // Improve Fast Refresh performance
    webVitalsAttribution: ['CLS', 'LCP'],
    // Turbo for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Security headers
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
    ];
  },
  
  // API routes - proxy to the backend API
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'https://api.arketic.com'
      : process.env.DOCKER_ENV === 'true'
        ? 'http://api:8000'  // Docker service name
        : 'http://localhost:8000';
    
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/:path*`,
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
    DOCKER_ENV: process.env.DOCKER_ENV || 'false',
  },
  
  // Image optimization
  images: {
    domains: ['arketic.com', 'api.arketic.com', 'localhost', 'api'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Server external packages for better Docker support
  ...(process.env.NODE_ENV === 'development' && {
    serverExternalPackages: [],
  }),
  
  // Webpack configuration for better development experience
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimized file watching configuration
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 1000,
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next',
          '**/dist',
          '**/build',
          '**/.turbo',
          '**/*.log',
          '**/coverage',
          '**/.env*',
          '**/public/uploads',
          '**/temp',
          '**/tmp',
          '**/.cache'
        ],
      };
      
      config.watchOptions.followSymlinks = false;
      
      // Development optimizations
      config.optimization = {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
        minimize: false,
        concatenateModules: false,
        usedExports: false,
        providedExports: false,
        sideEffects: false,
        realContentHash: false,
        innerGraph: false,
        mangleExports: false,
      };
      
      config.performance = {
        hints: false,
      };
      
      // Optimize Fast Refresh
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: ['./next.config.mjs', './package.json']
        },
      };
      
      // Better source maps for development
      config.devtool = 'eval-cheap-module-source-map';
      
      // Reduce HMR update frequency
      if (config.devServer) {
        config.devServer.watchOptions = {
          ...config.devServer.watchOptions,
          aggregateTimeout: 500,
          poll: false,
        };
      }
    }
    
    // React 19 optimizations
    if (!dev && config.optimization && config.optimization.splitChunks) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        react: {
          name: 'react',
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          chunks: 'all',
          priority: 20,
        },
      };
    }
    
    return config;
  },
  
  
  // Ignore build errors during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withBundleAnalyzer(nextConfig);