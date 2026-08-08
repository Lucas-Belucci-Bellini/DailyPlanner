import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Erro de tipo ou de lint tem que derrubar o build, e nao virar surpresa em
  // producao: os dois ficam ligados de proposito.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
