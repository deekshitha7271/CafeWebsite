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

// ── Give server 3s to boot, then start the print client ──────────────────────
setTimeout(() => {
  console.log('\n🖨️  Starting Kitchen Bridge print client …\n');

  const printDir = path.join(__dirname, 'print-client');
  const printClient = spawn('node', ['index.js'], {
    cwd: printDir,
    stdio: 'inherit',
    shell: isWin,
  });

  printClient.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Print client exited with code ${code}`);
    }
  });

  // Clean up both on exit
  const cleanup = () => {
    console.log('\n🛑 Shutting down all processes …');
    if (!server.killed) server.kill('SIGINT');
    if (!printClient.killed) printClient.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

}, 3000);

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});
