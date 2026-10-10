#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function canLoad(name) {
  try { require.resolve(name, { paths: [root] }); return true; }
  catch { return false; }
}
// npm start is the only command the panel needs. Install runtime packages on first boot.
const requiredRuntime = ['whatsapp-rust-bridge', 'qrcode-terminal', 'pino', '@hapi/boom', 'async-mutex', 'crypto-js', 'libsignal', 'lru-cache', 'music-metadata', 'p-queue', 'protobufjs', 'ws', '@cacheable/node-cache'];
if (requiredRuntime.some(name => !canLoad(name))) {
  console.log('[KairoBail] Dependency runtime belum lengkap; memasang otomatis (tanpa menjalankan script build paket)...');
  const install = spawnSync(npm, ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: process.env
  });
  if (install.error) { console.error('[KairoBail] Gagal menjalankan npm install:', install.error.message); process.exit(1); }
  if (install.status !== 0) { console.error('[KairoBail] Instalasi dependency gagal. Periksa koneksi internet dan log panel.'); process.exit(install.status || 1); }
}
const entry = path.join(root, 'bot.js');
if (!fs.existsSync(entry)) { console.error('[KairoBail] File bot.js tidak ditemukan.'); process.exit(1); }
const child = spawnSync(process.execPath, [entry], { cwd: root, stdio: 'inherit', env: process.env });
if (child.error) { console.error(child.error); process.exit(1); }
process.exit(child.status ?? 1);
