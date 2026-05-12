/**
 * Caphe Bistro — Unified Launcher
 * ────────────────────────────────
 * Starts both the backend server and the kitchen bridge print client
 * in a single terminal window. Run from the project root:
 *
 *   node start-all.js
 *
 * The print client waits 3 seconds for the server to boot before connecting.
 * Both processes are killed cleanly on Ctrl+C.
 */

const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

// ── Spawn the backend server ─────────────────────────────────────────────────
const serverDir = path.join(__dirname, 'server');
const server = spawn('node', ['index.js'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: isWin,
});

console.log('🚀 Starting backend server …');

// Clean up server on exit
const cleanup = () => {
  console.log('\n🛑 Shutting down server …');
  if (!server.killed) server.kill('SIGINT');
  setTimeout(() => process.exit(0), 1000);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});
