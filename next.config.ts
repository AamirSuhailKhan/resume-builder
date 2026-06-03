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
};

export default nextConfig;
