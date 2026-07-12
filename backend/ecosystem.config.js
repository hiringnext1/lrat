/**
 * PM2 Ecosystem Configuration (R3)
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop lrat-backend
 *   pm2 restart lrat-backend
 *   pm2 logs lrat-backend
 *   pm2 monit
 *   
 * Auto-start on boot:
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'lrat-backend',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,                    // Single instance (SQLite doesn't support concurrent writes)
      exec_mode: 'fork',
      max_memory_restart: '512M',      // Auto-restart if memory exceeds 512MB
      watch: false,                     // Disable watch in production
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',               // Consider started if alive for 10s
      restart_delay: 5000,             // Wait 5s between restarts
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout: 15000,             // Wait 15s for graceful shutdown
      listen_timeout: 10000,           // Wait 10s for ready signal
    },
  ],
};
