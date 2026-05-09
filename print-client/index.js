require('dotenv').config();
const { io } = require('socket.io-client');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_URL   = process.env.BACKEND_URL   || 'http://localhost:5001';
const CORS_ORIGIN   = process.env.CORS_ORIGIN   || 'http://localhost:5173';
const PRINTER_WIDTH = parseInt(process.env.PRINTER_WIDTH || '42', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Printer Discovery — uses PowerShell Get-Printer on Windows
// ─────────────────────────────────────────────────────────────────────────────
function discoverPrinters() {
  try {
    const cmd = 'powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus | ConvertTo-Json"';
    const raw = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    let printers = JSON.parse(raw);
    // PowerShell returns a single object (not array) if only one printer exists
    if (!Array.isArray(printers)) printers = [printers];
    return printers;
  } catch (err) {
    console.error('⚠️  Could not discover printers:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Printer Selection
// ─────────────────────────────────────────────────────────────────────────────
function askQuestion(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function selectPrinter() {
  const printers = discoverPrinters();

  if (printers.length === 0) {
    console.log('\n⚠️  No printers found on this system.');
    console.log('    Make sure your USB thermal printer is plugged in and has a driver installed.');
    console.log('    The bridge will still connect to the backend — orders will be logged to console.\n');
    return null;
  }

  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│       Available Printers on this PC         │');
  console.log('└─────────────────────────────────────────────┘\n');

  printers.forEach((p, i) => {
    const status = p.PrinterStatus === 0 || p.PrinterStatus === 'Normal' ? '🟢' : '🔴';
    console.log(`  [${i + 1}]  ${status}  ${p.Name}`);
    console.log(`         Driver: ${p.DriverName || 'Unknown'}  |  Port: ${p.PortName || 'N/A'}`);
  });

  console.log(`\n  [0]  Skip — don't print, just log to console\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let choice = -1;
  while (choice < 0 || choice > printers.length) {
    const answer = await askQuestion(rl, `  Select printer [0–${printers.length}]: `);
    choice = parseInt(answer, 10);
    if (isNaN(choice) || choice < 0 || choice > printers.length) {
      console.log('  ⚠️  Invalid choice. Try again.');
      choice = -1;
    }
  }

  rl.close();

  if (choice === 0) {
    console.log('\n  ℹ️  No printer selected — KOTs will be logged to console only.\n');
    return null;
  }

  const selected = printers[choice - 1];
  console.log(`\n  ✅ Selected: ${selected.Name}\n`);
  return selected.Name;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS Receipt Builder — generates raw bytes for thermal printers
// ─────────────────────────────────────────────────────────────────────────────
const ESC = '\x1B';
const GS  = '\x1D';

function buildKOTBuffer(order) {
  const lines = [];

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const orderType = order.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN';
  const billNo = order.billNumber || order._id?.slice(-6)?.toUpperCase() || 'N/A';

  // ESC/POS: Init + Center align
  lines.push(`${ESC}@`);           // Initialize printer
  lines.push(`${ESC}a\x01`);       // Center align

  // Double-height bold header
  lines.push(`${ESC}!\x10`);       // Double height
  lines.push(`${ESC}E\x01`);       // Bold on
  lines.push('CAPHE BISTRO\n');
  lines.push(`${ESC}E\x00`);       // Bold off
  lines.push(`${ESC}!\x00`);       // Normal size
  lines.push('** KITCHEN ORDER TICKET **\n');
  lines.push('-'.repeat(PRINTER_WIDTH) + '\n');

  // Left align for details
  lines.push(`${ESC}a\x00`);       // Left align

  const pad = (label, value) => {
    const gap = PRINTER_WIDTH - label.length - value.length;
    return label + ' '.repeat(Math.max(1, gap)) + value + '\n';
  };

  lines.push(pad('Bill No:', billNo));
  lines.push(pad('Date:', dateStr));
  lines.push(pad('Time:', timeStr));
  lines.push(pad('Type:', orderType));

  if (order.table) {
    lines.push(pad('Table:', String(order.table)));
  }
  if (order.customerName) {
    lines.push(pad('Customer:', order.customerName));
  }

  lines.push('-'.repeat(PRINTER_WIDTH) + '\n');

  // Items with prices
  lines.push(`${ESC}E\x01`);       // Bold on
  lines.push(pad('ITEM', 'TOTAL'));
  lines.push(`${ESC}E\x00`);       // Bold off

  const items = order.items || [];
  let itemSubtotal = 0;

  items.forEach(item => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const lineTotal = qty * price;
    itemSubtotal += lineTotal;

    const name = item.name || 'Item';
    const priceStr = `${qty}x${price}=${lineTotal}`;
    const maxNameLen = PRINTER_WIDTH - priceStr.length - 2;
    const display = name.length > maxNameLen ? name.slice(0, maxNameLen - 1) + '~' : name;
    lines.push(pad(`  ${display}`, priceStr));
  });

  if (items.length === 0) {
    lines.push('  (no items)\n');
  }

  lines.push('-'.repeat(PRINTER_WIDTH) + '\n');

  // ── Billing Summary ────────────────────────────────────────────────────────
  const totalItemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const isDineIn = (order.orderType || 'dinein-web') === 'dinein-web';
  const isTakeaway = (order.orderType) === 'takeaway';

  lines.push(pad('Subtotal:', `Rs.${itemSubtotal}`));

  if (isDineIn) {
    const svcCharge = Math.round(itemSubtotal * 0.05 * 100) / 100;
    if (svcCharge > 0) {
      lines.push(pad('Service Charge (5%):', `Rs.${svcCharge}`));
    }
  }
  if (isTakeaway) {
    const tkFee = totalItemCount * 10;
    if (tkFee > 0) {
      lines.push(pad(`Takeaway Fee (${totalItemCount}x10):`, `Rs.${tkFee}`));
    }
  }

  lines.push('-'.repeat(PRINTER_WIDTH) + '\n');
  lines.push(`${ESC}E\x01`);       // Bold on
  const grandTotal = order.total || itemSubtotal;
  lines.push(pad('TOTAL:', `Rs.${grandTotal}`));
  lines.push(`${ESC}E\x00`);       // Bold off
  lines.push('\n');

  // Footer — centered
  lines.push(`${ESC}a\x01`);       // Center
  lines.push('--- END OF KOT ---\n');
  lines.push('\n\n\n');

  // Cut paper
  lines.push(`${GS}V\x00`);        // Full cut

  return lines.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Print via Windows Raw Print (works with any installed USB/network printer)
// ─────────────────────────────────────────────────────────────────────────────
let selectedPrinterName = null;

async function printKOT(order) {
  // Always log to console
  const billNo = order.billNumber || order._id?.slice(-6)?.toUpperCase() || 'N/A';
  const itemsSummary = (order.items || []).map(i => `  ${i.quantity}x ${i.name}`).join('\n');
  console.log(`  ┌── KOT ──────────────────────────┐`);
  console.log(`  │ Bill: ${billNo.padEnd(27)}│`);
  console.log(`  │ Type: ${(order.orderType || 'dine-in').padEnd(27)}│`);
  console.log(`  │ Items:${' '.repeat(27)}│`);
  itemsSummary.split('\n').forEach(l => {
    console.log(`  │ ${l.padEnd(33)}│`);
  });
  console.log(`  └─────────────────────────────────┘`);

  if (!selectedPrinterName) {
    console.log('  ℹ️  No printer selected — skipping hardware print.');
    return;
  }

  // Write raw ESC/POS to a temp file, then send to printer
  const tmpFile = path.join(os.tmpdir(), `kot_${Date.now()}.bin`);

  try {
    const rawData = buildKOTBuffer(order);
    fs.writeFileSync(tmpFile, rawData, 'binary');

    // Use PowerShell Out-Printer for text, or raw copy for ESC/POS
    const printCmd = `copy /b "${tmpFile}" "\\\\localhost\\${selectedPrinterName}"`;

    await new Promise((resolve, reject) => {
      exec(printCmd, { shell: 'cmd.exe', timeout: 10000 }, (err, stdout, stderr) => {
        if (err) {
          // Fallback: try PowerShell printing
          const psCmd = `powershell -NoProfile -Command "Get-Content -Encoding Byte '${tmpFile}' | Set-Content -Encoding Byte -Path '\\\\localhost\\${selectedPrinterName}'"`;
          exec(psCmd, { timeout: 10000 }, (err2) => {
            if (err2) {
              reject(new Error(`Both print methods failed. CMD: ${err.message} | PS: ${err2.message}`));
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });

    console.log(`  ✅ KOT sent to printer: ${selectedPrinterName}`);

  } catch (printErr) {
    console.error(`  🔴 Print failed: ${printErr.message}`);
    console.log('  ℹ️  The order was logged above. You can reprint from the admin dashboard.');
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket Connection — with aggressive auto-reconnect
// ─────────────────────────────────────────────────────────────────────────────
let socket;

function connectToBackend() {
  console.log(`🔌 Connecting to backend: ${BACKEND_URL} …`);

  socket = io(BACKEND_URL, {
    query: { clientType: 'kitchen_bridge' },
    extraHeaders: { origin: CORS_ORIGIN },
    transports: ['polling', 'websocket'],
    reconnection:         true,
    reconnectionAttempts: Infinity,
    reconnectionDelay:    2000,
    reconnectionDelayMax: 30000,
    randomizationFactor:  0.5,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log(`✅ Kitchen Bridge connected  [id: ${socket.id}]`);
    console.log(`   Backend:  ${BACKEND_URL}`);
    console.log(`   Printer:  ${selectedPrinterName || '(console only)'}`);
    console.log('   Waiting for orders …\n');
  });

  socket.on('disconnect', (reason) => {
    console.warn(`⚠️  Disconnected: ${reason}`);
    if (reason === 'io server disconnect') socket.connect();
  });

  socket.on('connect_error', (err) => {
    console.error(`❌ Connection error: ${err.message} — will retry …`);
  });

  socket.on('reconnect', (attempt) => {
    console.log(`🔄 Reconnected after ${attempt} attempt(s).`);
  });

  socket.on('reconnect_attempt', (attempt) => {
    if (attempt % 5 === 0) console.log(`   Reconnect attempt #${attempt} …`);
  });

  // ── KOT Print Events ────────────────────────────────────────────────────
  socket.on('new_kitchen_order', (order) => {
    console.log(`\n🧾 NEW ORDER — Bill: ${order.billNumber || order._id}`);
    printKOT(order).catch(err => console.error('Print error:', err));
  });

  socket.on('admin_reprint_order', (order) => {
    console.log(`\n🔁 REPRINT — Bill: ${order.billNumber || order._id}`);
    printKOT(order).catch(err => console.error('Reprint error:', err));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Process-level error guards
// ─────────────────────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
});

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down Kitchen Bridge.`);
  if (socket) socket.disconnect();
  process.exit(0);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point — discover printers, let admin choose, then connect
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('─────────────────────────────────────────────');
  console.log('  Caphe Bistro — Kitchen Bridge Print Client  ');
  console.log('─────────────────────────────────────────────');

  selectedPrinterName = await selectPrinter();
  connectToBackend();
}

main();
