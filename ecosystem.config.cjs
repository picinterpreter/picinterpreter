module.exports = {
  apps: [
    {
      name: 'picinterpreter',
      cwd: __dirname,
      script: 'server.js',
      interpreter: 'node',
      node_args: '--env-file=.env.production',
      env: {
        HOSTNAME: '0.0.0.0',
        PORT: '3001',
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
}
