import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "pg",
    "pg-native",
    "@auth/prisma-adapter",
    "bcryptjs",
    "ioredis",
    "bullmq",
    "pino",
    "pino-pretty",
  ],
};

export default nextConfig;
