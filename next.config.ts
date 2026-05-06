import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark heavy Node.js-only packages as external so Turbopack/webpack
  // don't try to bundle them. Bundling these causes:
  //  - Prisma: "PrismaClient is unable to run in this browser environment"
  //  - bcrypt/ioredis/bullmq: Node.js API errors in edge-adjacent builds
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "bcryptjs",
    "ioredis",
    "bullmq",
    "pino",
    "pino-pretty",
  ],
};

export default nextConfig;
