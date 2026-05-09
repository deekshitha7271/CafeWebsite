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
  const [isReady, setIsReady] = useState(false);
  const printFrameRef = useRef(null);
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // ── Play notification sound ────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    if (!isReady) return; // Browser blocks audio until interaction
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Double beep
      setTimeout(() => {
        const ctx2 = new AudioCtx();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx2.currentTime + 0.2);
      }, 350);
    } catch (e) { /* audio not available */ }
  }, [isReady]);

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
        <td style="padding:4px 0;text-align:left;font-weight:bold">${i.name}</td>
        <td style="padding:4px;text-align:center">x${i.quantity || 1}</td>
        <td style="padding:4px 0;text-align:right">₹${((i.price || 0) * (i.quantity || 1)).toFixed(0)}</td>
      </tr>
    `).join('');

    return `
      <html>
      <head>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 13px; width: 72mm; padding: 2mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-size: 16px; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size:20px;font-weight:900">CÁ PHÊ BISTRO</div>
          <div style="font-size:10px">** KITCHEN ORDER TICKET **</div>
        </div>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between"><span>Bill: <b>${billNo}</b></span> <span>${timeStr}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Type: <b>${orderType}</b></span> ${order.table ? `<span>Table: <b>${order.table}</b></span>` : ''}</div>
        ${order.customerName ? `<div>Cust: ${order.customerName}</div>` : ''}
        <div class="divider"></div>
        <table>
          <thead><tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Amt</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between" class="total"><span>TOTAL:</span><span>₹${grandTotal.toFixed(0)}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size:10px;margin-top:10px">--- END OF TICKET ---</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;
  }, []);

  // ── Print an order ─────────────────────────────────────────────────────────
  const triggerPrint = useCallback((order) => {
    if (!isReady) return;
    const receiptHTML = buildReceiptHTML(order);
    const iframe = printFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(receiptHTML);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Print failed:', e);
        }
      }, 500);
    }
  }, [buildReceiptHTML, isReady]);

  // ── Socket connection ──────────────────────────────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(':5173', ':5001');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      query: { clientType: 'kitchen_bridge' }, // 👈 CRITICAL: Identify as printer
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Printer Socket Connected');
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_kitchen_order', (order) => {
      console.log('📥 New Order Received:', order);
      setOrders(prev => {
        if (prev.some(o => o._id === order._id)) return prev;
        return [{ ...order, receivedAt: new Date().toISOString() }, ...prev].slice(0, 50);
      });
      setCurrentPrint(order);
      playBeep();
    });

    socket.on('admin_reprint_order', (order) => {
      console.log('🔄 Reprint Requested:', order);
      setCurrentPrint(order);
      playBeep();
    });

    return () => { socket.off(); socket.close(); };
  }, [playBeep]);

  // ── Auto-print when a new order arrives ────────────────────────────────────
  useEffect(() => {
    if (currentPrint && autoPrint && isReady) {
      triggerPrint(currentPrint);
      setCurrentPrint(null);
    }
  }, [currentPrint, autoPrint, triggerPrint, isReady]);

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

      {/* Browser Interaction Requirement Overlay */}
      {!isReady && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '40px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔥</div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Ready to Cook?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>
            To enable <b>Auto-Print</b> and <b>Alert Sounds</b>, browsers require a manual interaction. Click the button below to activate the kitchen station.
          </p>
          <button
            onClick={() => {
              setIsReady(true);
              if (currentPrint && autoPrint) triggerPrint(currentPrint);
            }}
            style={{
              padding: '20px 48px', borderRadius: '24px',
              background: '#f59e0b', color: '#000',
              fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(245,158,11,0.3)',
              transition: 'all 0.3s'
            }}
            onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.target.style.transform = 'scale(1)'}
          >
            Start Kitchen Session
          </button>
        </div>
      )}

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
