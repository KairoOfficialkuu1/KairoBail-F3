'use strict';
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const baileys = require('./lib');

const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const SESSION_DIR = process.env.SESSION_DIR || './session';
const PHONE_NUMBER = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');
const LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
const RECONNECT_BASE_MS = Math.max(1000, Number(process.env.RECONNECT_DELAY_MS) || 3000);
const RECONNECT_MAX_MS = Math.max(RECONNECT_BASE_MS, Number(process.env.RECONNECT_MAX_DELAY_MS) || 30000);
let stopping = false;
let reconnectTimer = null;
let reconnectAttempt = 0;
let activeSocket = null;
let connecting = false;

function scheduleReconnect(reason) {
  if (stopping || reconnectTimer) return;
  const delay = Math.min(RECONNECT_BASE_MS * (2 ** reconnectAttempt), RECONNECT_MAX_MS);
  reconnectAttempt = Math.min(reconnectAttempt + 1, 10);
  console.log(`[KairoBail] Coba sambung ulang dalam ${Math.ceil(delay / 1000)} detik (${reason}).`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch(err => {
      console.error('[KairoBail] Reconnect gagal:', err?.stack || err);
      scheduleReconnect('startup/reconnect error');
    });
  }, delay);
}

if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function') {
  console.error('[KairoBail] Export makeWASocket/useMultiFileAuthState tidak tersedia pada build ini.');
  process.exit(1);
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
    console.log('[KairoBail] WhatsApp Web version:', version.join('.'));
  } catch (e) {
    console.warn('[KairoBail] Gagal mengambil versi terbaru; memakai default library:', e.message);
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: process.env.LOG_LEVEL || 'silent' }),
    printQRInTerminal: false,
    browser: ['KairoBail F3', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !PHONE_NUMBER && !state.creds.registered) {
      console.log('\n[KairoBail] Scan QR ini melalui WhatsApp > Perangkat tertaut > Tautkan perangkat:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'connecting') console.log('[KairoBail] Menghubungkan ke WhatsApp...');
    if (connection === 'open') console.log('[KairoBail] Berhasil terhubung. Bot aktif.');
    if (connection === 'close' && !stopping) {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.error('[KairoBail] Koneksi terputus. Kode:', code ?? 'tidak diketahui');
      if (code === DisconnectReason.loggedOut) {
        console.error('[KairoBail] Sesi logout. Hapus folder session lalu jalankan npm start untuk pairing ulang.');
        process.exitCode = 1;
      } else {
        setTimeout(() => connect().catch(err => { console.error('[KairoBail] Reconnect gagal:', err); process.exit(1); }), 3000);
      }
    }
  });

  if (PHONE_NUMBER && !state.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log('\n[KairoBail] PAIRING CODE:', code);
      console.log('[KairoBail] Masukkan di WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.');
    } catch (e) {
      console.error('[KairoBail] Gagal meminta pairing code:', e.message);
      console.error('[KairoBail] Pastikan PHONE_NUMBER di panel berisi kode negara + nomor, tanpa tanda +.');
    }
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      if (text.trim().toLowerCase() === '!ping') {
        try { await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! KairoBail F3 aktif ✅' }, { quoted: msg }); }
        catch (e) { console.error('[KairoBail] Gagal membalas pesan:', e.message); }
      }
    }
  });
}

process.on('SIGINT', () => { stopping = true; if (reconnectTimer) clearTimeout(reconnectTimer); console.log('\n[KairoBail] Shutdown diminta.'); process.exit(0); });
process.on('SIGTERM', () => { stopping = true; if (reconnectTimer) clearTimeout(reconnectTimer); console.log('\n[KairoBail] Shutdown diminta panel.'); process.exit(0); });
connect().catch(err => { console.error('[KairoBail] Startup gagal:', err?.stack || err); scheduleReconnect('startup error'); });
