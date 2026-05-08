module.exports = {
  apps: [
    {
      name: "resumeai-worker",
      script: "node_modules/.bin/tsx",
      args: "workers/index.ts",
      instances: 1, // Change to max or a number for cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
