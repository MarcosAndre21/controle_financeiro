import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignora erros do ESLint na hora do build de produção
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignora erros de tipagem estática do TypeScript no build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;