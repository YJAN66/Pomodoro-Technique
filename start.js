// Launcher: clears ELECTRON_RUN_AS_NODE and spawns electron
const { spawn } = require('child_process');
const path = require('path');

// Remove the env var that forces Electron into Node.js mode
delete process.env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code);
});
