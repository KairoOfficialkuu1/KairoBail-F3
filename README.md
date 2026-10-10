# KairoBail F3 — Panel Ready

Community-modified Baileys-compatible library plus a minimal runnable WhatsApp bot scaffold.

## Deploy ke Pterodactyl

1. Upload semua isi repository ini ke GitHub.
2. Di panel, pilih Node.js 20 atau lebih baru.
3. Startup command: `npm start`
4. Tidak perlu menjalankan `npm install` secara manual. Pada boot pertama, `bootstrap.js` akan memasang dependency runtime secara otomatis; server harus memiliki akses internet dan izin tulis.
5. Setelah terhubung, sesi disimpan di folder `session/` agar dapat digunakan lagi saat restart. Jangan bagikan folder tersebut.

## Pairing

- **QR:** jalankan `npm start`, lalu scan QR yang muncul di console panel.
- **Pairing code:** atur environment variable `PHONE_NUMBER` di panel dengan nomor internasional angka saja, contoh `62812xxxxxxx`, lalu restart. Jangan sertakan tanda `+`.

Bot contoh membalas `!ping` dengan `Pong! KairoBail F3 aktif`.

## Catatan penting

- Ini adalah library komunitas dan contoh bot minimal, bukan proyek resmi WhatsApp.
- Boot pertama tetap perlu internet untuk mengunduh dependency. Yang dihilangkan adalah kebutuhan menjalankan `npm install` secara manual.
- Gunakan Node.js 20+. Pastikan panel mengizinkan proses install saat startup dan direktori proyek dapat ditulis.
- Simpan sesi sebagai rahasia; jangan upload `session/` ke GitHub. `.gitignore` mengabaikan folder sesi.
- `whatsapp-rust-bridge` dipatok ke `0.5.5` untuk menghindari error CommonJS `ERR_PACKAGE_PATH_NOT_EXPORTED` yang muncul pada versi sebelumnya.

## KairoBail F3 panel launcher notes

- Start with `npm start`. If runtime dependencies are missing, `bootstrap.js` installs production dependencies automatically and skips package lifecycle/build scripts. The first boot still needs internet access and write permission for `node_modules`.
- Session credentials are saved under `./session` by default; keep this folder persistent between restarts and do not share it. Set `SESSION_DIR` to a persistent panel path if needed.
- Temporary network disconnects retry with backoff. If WhatsApp reports `loggedOut` because the account owner unlinked/revoked the device, the library stops and requires the owner to pair it again; it cannot override that action.
- Linked-device protocol can be used with regular WhatsApp, WhatsApp Business, and compatible beta versions. Compatibility can still vary with WhatsApp-side changes.
- Optional panel variables: `PHONE_NUMBER` (digits including country code, for pairing code), `SESSION_DIR`, `LOG_LEVEL`, `RECONNECT_DELAY_MS`, `RECONNECT_MAX_DELAY_MS`, `WA_BROWSER_NAME`, `WA_BROWSER_PLATFORM`, and `WA_BROWSER_VERSION`.
