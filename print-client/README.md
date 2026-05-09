# 🖨️ Caphe Bistro — Kitchen Bridge Print Client

A standalone Node.js script that acts as the **Local Bridge** between the deployed Caphe Bistro backend and a **USB/network thermal printer** in the kitchen.

---

## Architecture

```
[Backend (Cloud)]
   │  socket event: new_kitchen_order
   │  socket event: admin_reprint_order
   ▼
[This Script — Kitchen PC]
   │  node-thermal-printer
   ▼
[Thermal Printer (USB / TCP)]
```

---

## Prerequisites

- **Node.js 18+** installed on the kitchen PC
- A thermal printer (Epson, Star, or Citizen) connected via **USB** or **TCP/IP**

---

## Setup

### 1. Install dependencies

```bash
cd print-client
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable            | Example                             | Notes                                  |
|---------------------|-------------------------------------|----------------------------------------|
| `BACKEND_URL`       | `https://your-app.onrender.com`     | No trailing slash                      |
| `PRINTER_TYPE`      | `epson`                             | `epson` \| `star` \| `citizen`         |
| `PRINTER_INTERFACE` | `tcp://192.168.1.100`               | TCP/IP or USB path (see below)         |
| `PRINTER_WIDTH`     | `42`                                | Characters per line (80mm = 42 chars)  |

#### Printer Interface Examples

| Connection   | Value                         |
|--------------|-------------------------------|
| TCP/IP       | `tcp://192.168.1.100`         |
| USB (Windows)| `\\\\.\COM3`                  |
| USB (Linux)  | `/dev/usb/lp0`                |
| USB (macOS)  | `/dev/tty.usbmodem001`        |

### 3. Run

```bash
npm start
```

You should see:
```
─────────────────────────────────────────────
  Caphe Bistro — Kitchen Bridge Print Client  
─────────────────────────────────────────────
🔌 Connecting Kitchen Bridge to https://your-app.onrender.com …
✅ Kitchen Bridge connected  [id: abc123]
   Backend:  https://your-app.onrender.com
   Printer:  tcp://192.168.1.100  (EPSON)
```

The admin dashboard will now show **"Printer Online"** ✅.

---

## Auto-start on Boot (Windows)

To run the bridge automatically when the kitchen PC boots:

1. Create a `start-bridge.bat` file:
   ```batch
   @echo off
   cd /d "C:\path\to\CafeWebsite-main\print-client"
   node index.js
   ```
2. Press `Win + R`, type `shell:startup`, and place a shortcut to the `.bat` file there.

Or use **PM2** for production-grade process management:
```bash
npm install -g pm2
pm2 start index.js --name "caphe-bridge"
pm2 save
pm2 startup
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Printer Offline` in admin dashboard | Ensure this script is running on the kitchen PC |
| `Printer connectivity check failed` | Check `PRINTER_INTERFACE` in `.env` and that the printer is powered on |
| `Connection error` on startup | Check `BACKEND_URL` is correct and the backend is running |
| Nothing prints but no errors | Verify `PRINTER_TYPE` matches your hardware |
