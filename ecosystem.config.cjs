module.exports = {
  apps: [
    {
      name: 'picinterpreter',
      cwd: __dirname,
      script: 'server.js',
      interpreter: 'node',
      node_args: '--env-file=.env.production',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
}
