module.exports = {
  apps: [
    {
      name: 'picinterpreter',
      cwd: __dirname,
      script: 'server.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        PORT: '3001',
      },
    },
  ],
}
