module.exports = {
  apps: [
    {
      name: 'agent-workflows-web',
      // Run from apps/web directory
      cwd: './apps/web',
      // Use pnpm to run the dev script (starts both Vite + Fastify)
      script: 'pnpm',
      args: 'dev',
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3456,
        HOST: '127.0.0.1',
        VITE_PORT: 5173,
        LOG_LEVEL: 'info'
      },
      // Single instance
      instances: 1,
      exec_mode: 'fork',
      // Auto-restart on file changes (optional, can disable)
      watch: false,
      // Restart if memory exceeds 500MB
      max_memory_restart: '500M',
      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Auto-restart on crash
      autorestart: true,
      // Max restarts within 1 minute before stopping
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
