
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
        "https://6000-firebase-studio-1748549332563.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev"
        // You can add more origins here if needed, e.g., other preview environments
    ],
  }
};

export default nextConfig;
