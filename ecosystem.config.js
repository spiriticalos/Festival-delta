module.exports = {
  apps: [
    {
      name:          'bohemians-festival',
      script:        'server.js',
      instances:     1,
      autorestart:   true,
      watch:         false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file:  'logs/err.log',
      out_file:    'logs/out.log',
      merge_logs:  true,
    },
  ],
};
