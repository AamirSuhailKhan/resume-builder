import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "pg",
    "pg-native",
    "@auth/prisma-adapter",
    "bcryptjs",
    "ioredis",
    "bullmq",
    "pino",
    "pino-pretty",
    "pdf-parse",
    "pdfjs-dist",
    "mammoth",
  ],

  // ─── Image Optimization ──────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 768, 1024, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ─── HTTP Response Compression ───────────────────────────────────────────────
  compress: true,

  // ─── Reduce Client Bundle via Package Transpile ──────────────────────────────
  // Heavy server-only packages already in serverExternalPackages above.
  // Ensure recharts/d3 are only included where explicitly imported.
  experimental: {
    // Optimise server component payload size
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
