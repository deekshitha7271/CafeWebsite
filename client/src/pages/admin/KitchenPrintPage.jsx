import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// ─────────────────────────────────────────────────────────────────────────────
// KitchenPrintPage — Open this URL on the kitchen PC's browser.
// It auto-connects to the backend via WebSocket and prints incoming orders
// using the browser's native window.print() — no Node.js, no installs.
//
// Setup on Kitchen PC:
//   1. Open Chrome
//   2. Go to: https://your-site.com/kitchen
//   3. Set default printer to the thermal printer in Chrome settings
//   4. (Optional) Launch Chrome with --kiosk-printing for silent auto-print
//
// ─────────────────────────────────────────────────────────────────────────────

const KitchenPrintPage = () => {
  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState([]);
  const [currentPrint, setCurrentPrint] = useState(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const printFrameRef = useRef(null);
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // ── Play notification sound ────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 350);
    } catch (e) { /* audio not available */ }
  }, []);

  // ── Build printable receipt HTML ───────────────────────────────────────────
  const buildReceiptHTML = useCallback((order) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const billNo = order.billNumber || order._id?.slice(-6)?.toUpperCase() || 'N/A';
    const orderType = order.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN';
    const items = order.items || [];

    let itemSubtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const totalItemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const isDineIn = (order.orderType || 'dinein-web') === 'dinein-web';
    const isTakeaway = order.orderType === 'takeaway';

    const svcCharge = isDineIn ? Math.round(itemSubtotal * 0.05 * 100) / 100 : 0;
    const tkFee = isTakeaway ? totalItemCount * 10 : 0;
    const grandTotal = order.total || (itemSubtotal + svcCharge + tkFee);

    const itemRows = items.map(i => `
      <tr>
        <td style="padding:2px 0;text-align:left">${i.name}</td>
        <td style="padding:2px 4px;text-align:center">${i.quantity || 1}</td>
        <td style="padding:2px 0;text-align:right">₹${((i.price || 0) * (i.quantity || 1)).toFixed(0)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>KOT - ${billNo}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 4mm;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 18px; font-weight: 900; margin-bottom: 2px; }
          .subtitle { font-size: 11px; margin-bottom: 6px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .meta-row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 10px; }
          .total-row { font-size: 14px; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">CAPHE BISTRO</div>
          <div class="subtitle">** KITCHEN ORDER TICKET **</div>
        </div>
        <div class="divider"></div>

        <div class="meta-row"><span>Bill No:</span><span class="bold">${billNo}</span></div>
        <div class="meta-row"><span>Date:</span><span>${dateStr}</span></div>
        <div class="meta-row"><span>Time:</span><span>${timeStr}</span></div>
        <div class="meta-row"><span>Type:</span><span class="bold">${orderType}</span></div>
        ${order.table ? `<div class="meta-row"><span>Table:</span><span>${order.table}</span></div>` : ''}
        ${order.customerName ? `<div class="meta-row"><span>Customer:</span><span>${order.customerName}</span></div>` : ''}

        <div class="divider"></div>

        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amt</th></tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="3" style="text-align:center;padding:8px">(no items)</td></tr>'}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="meta-row"><span>Subtotal:</span><span>₹${itemSubtotal.toFixed(0)}</span></div>
        ${svcCharge > 0 ? `<div class="meta-row"><span>Service (5%):</span><span>₹${svcCharge.toFixed(0)}</span></div>` : ''}
        ${tkFee > 0 ? `<div class="meta-row"><span>Takeaway Fee:</span><span>₹${tkFee}</span></div>` : ''}

        <div class="divider"></div>
        <div class="meta-row total-row"><span>TOTAL:</span><span>₹${grandTotal.toFixed(0)}</span></div>
        <div class="divider"></div>

        <div class="center" style="margin-top:8px;font-size:10px">--- END OF KOT ---</div>
        <div style="height:20px"></div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
  }, []);

  // ── Print an order ─────────────────────────────────────────────────────────
  const triggerPrint = useCallback((order) => {
    const receiptHTML = buildReceiptHTML(order);

    const iframe = printFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(receiptHTML);
      doc.close();
      // Give it a moment to render, then print
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Print failed:', e);
        }
      }, 500);
    }
  }, [buildReceiptHTML]);

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      autoConnect: true,
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_kitchen_order', (order) => {
      setOrders(prev => {
        if (prev.some(o => o._id === order._id)) return prev;
        return [{ ...order, receivedAt: new Date().toISOString() }, ...prev].slice(0, 50);
      });
      setCurrentPrint(order);
      playBeep();
    });

    socket.on('admin_reprint_order', (order) => {
      setCurrentPrint(order);
      playBeep();
    });

    return () => { socket.off(); socket.close(); };
  }, [playBeep]);

  // ── Auto-print when a new order arrives ────────────────────────────────────
  useEffect(() => {
    if (currentPrint && autoPrint) {
      triggerPrint(currentPrint);
      setCurrentPrint(null);
    }
  }, [currentPrint, autoPrint, triggerPrint]);

  // ── Manual print ───────────────────────────────────────────────────────────
  const handleManualPrint = (order) => {
    triggerPrint(order);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '24px',
    }}>
      {/* Hidden print iframe */}
      <iframe
        ref={printFrameRef}
        title="print-frame"
        style={{ position: 'absolute', width: 0, height: 0, border: 'none', left: '-9999px' }}
      />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            🖨️ Kitchen Printer
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
            Auto-print incoming orders
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Auto-print toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
            color: autoPrint ? '#34d399' : 'rgba(255,255,255,0.3)',
            padding: '8px 16px', borderRadius: '12px',
            border: `1px solid ${autoPrint ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
            background: autoPrint ? 'rgba(52,211,153,0.1)' : 'transparent',
            transition: 'all 0.3s',
          }}>
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={e => setAutoPrint(e.target.checked)}
              style={{ accentColor: '#34d399' }}
            />
            Auto-Print
          </label>

          {/* Connection status */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '12px',
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
            border: `1px solid ${connected ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.1)'}`,
            background: connected ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
            color: connected ? '#34d399' : 'rgba(255,255,255,0.3)',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: connected ? '#34d399' : 'rgba(255,255,255,0.2)',
              boxShadow: connected ? '0 0 8px rgba(52,211,153,0.6)' : 'none',
              animation: connected ? 'pulse 2s infinite' : 'none',
            }} />
            {connected ? 'Connected' : 'Reconnecting…'}
          </div>
        </div>
      </div>

      {/* Instructions (show when no orders yet) */}
      {orders.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          color: 'rgba(255,255,255,0.2)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Waiting for orders…</p>
          <p style={{ fontSize: '12px', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0', lineHeight: 1.6 }}>
            When a customer pays, the KOT will appear here and auto-print.
            Make sure your thermal printer is set as the default printer in Chrome.
          </p>
        </div>
      )}

      {/* Order list */}
      <div style={{ display: 'grid', gap: '12px', maxWidth: '600px' }}>
        {orders.map(order => (
          <div key={order._id} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>
                <span style={{ color: '#f59e0b' }}>{order.billNumber || '#' + order._id?.slice(-4)}</span>
                <span style={{ marginLeft: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {order.orderType === 'takeaway' ? '🥡 Takeaway' : '🪑 Dine-in'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                {(order.items || []).map(i => `${i.quantity}× ${i.name}`).join(', ')}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                {order.customerName || 'Guest'} • ₹{order.total} • {new Date(order.receivedAt || order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              onClick={() => handleManualPrint(order)}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.target.style.borderColor = 'rgba(245,158,11,0.4)'; e.target.style.color = '#f59e0b'; }}
              onMouseOut={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              🖨️ Print
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media print {
          body * { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default KitchenPrintPage;
