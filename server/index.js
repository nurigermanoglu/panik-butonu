'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const ws = require('./ws');
const { RoomManager } = require('./room');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// ---------------- HTTP: statik dosyalar ----------------

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {          // dizin disina cikma korumasi
    res.writeHead(403).end('403');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 - bulunamadi');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// ---------------- WebSocket: oyun trafigi ----------------

const rooms = new RoomManager();

ws.attach(server, (conn) => {
  let room = null;
  let player = null;

  const fail = (m) => conn.sendJSON({ t: 'err', m });

  const enter = (r, name) => {
    const p = r.add(conn, name);
    if (!p) { fail('ODA DOLU'); return false; }
    room = r;
    player = p;
    conn.sendJSON({ t: 'joined', code: r.code, id: p.id, slot: p.slot, token: p.token });
    r.game.dirty = true;
    r.broadcast(r.game.snapshot());
    return true;
  };

  conn.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;

    switch (msg.t) {
      case 'create': {
        if (room) return;
        enter(rooms.create(), msg.name);
        break;
      }
      case 'quick': {                       // HIZLI OYNA - rastgele eslesme
        if (room) return;
        enter(rooms.hizliOda(), msg.name);
        break;
      }
      case 'join': {
        if (room) return;
        const r = rooms.get(msg.code);
        if (!r) return fail('ODA BULUNAMADI');

        // Sekmesini kapatip geri gelen kisi burada takiliyordu: yeri hala
        // tutuluyor, oda onu bekliyor, ama "OYUN BASLAMIS" deyip iceri
        // almiyorduk. Ayni isimle kopuk bekleyen varsa eski yerine otur.
        const geri = r.kopukIsimle(msg.name);
        if (geri) {
          r.reattach(geri, conn);
          room = r;
          player = geri;
          conn.sendJSON({
            t: 'joined', code: r.code, id: geri.id, slot: geri.slot,
            token: geri.token, geri: true,
          });
          r.broadcast(r.game.snapshot());
          break;
        }

        if (r.isFull) return fail('ODA DOLU');
        if (r.game.phase !== 'lobby') return fail('OYUN BASLAMIS');
        enter(r, msg.name);
        break;
      }
      // Baglanti koptu ve geri geldi: eski yerine otur.
      // Slot, skor, karakter, hepsi duruyor - mac kaldigi yerden devam eder.
      case 'resume': {
        if (room) return;
        const r = rooms.get(msg.code);
        if (!r || r.dead) return fail('ODA KAPANDI');
        const p = r.byToken(msg.token);
        if (!p) return fail('YERIN VERILDI');
        // Eski baglanti hala aciksa (F5 yarisinda olabilir) onu kapat:
        // ayni oyuncu iki soketle durmasin.
        const eski = p.conn;
        if (eski && eski !== conn) { try { eski.close(); } catch (e) { /* yoksay */ } }
        r.reattach(p, conn);
        room = r;
        player = p;
        conn.sendJSON({ t: 'joined', code: r.code, id: p.id, slot: p.slot, token: p.token, geri: true });
        r.broadcast(r.game.snapshot());
        break;
      }
      case 'ready':
        if (room) room.game.setReady(player, msg.v !== false);
        break;
      case 'in':
        if (room) room.game.handleInput(player, msg.a, msg.d);
        break;
      case 'target':
        if (room) room.game.setTarget(player, msg.d);
        break;
      case 'char':
        if (room) room.game.setChar(player, msg.d);
        break;
      case 'again':
        if (room) room.game.requestRematch(player);
        break;
      // Odadan bilerek cikma. Baglantiyi KAPATMIYORUZ: kapatmak "koptu"
      // sayilir, yeri tutulur ve istemci kendi kendine geri baglanirdi.
      // Burada oyuncu gercekten cikarilir, soket menude tekrar kullanilir.
      case 'leave': {
        if (!room) return;
        room.remove(player);
        if (!room.dead) room.broadcast(room.game.snapshot());
        room = null;
        player = null;
        conn.sendJSON({ t: 'left' });
        break;
      }
      default:
        break;
    }
  });

  conn.on('close', () => {
    if (room && player) {
      // Oyuncu zaten baska bir baglantiyla geri gelmisse (yarisan paketler),
      // eski baglantinin kapanmasi onu tekrar kopuk yapmasin.
      if (player.conn === conn) {
        room.markOffline(player);
        if (!room.dead) room.broadcast(room.game.snapshot());
      }
      room = null;
      player = null;
    }
  });
});

// ---------------- Ana dongu ----------------

// Windows'ta zamanlayici cozunurlugu ~15.6 ms. setInterval(33) istenen 33'e
// degil 46.8'e yuvarlanir; yani "30 Hz" aslinda 21 Hz olur ve hareket tirtiklanir.
// Cozum: dongu SABIT 33 ms beklemez, her seferinde bir sonraki tik anina kalan
// sureyi hesaplar. Yuvarlama yukari kacinca bir sonraki bekleme kisalir ve
// ortalama tam TICK_HZ'de kalir.
const ADIM_MS = 1000 / cfg.TICK_HZ;
let last = Date.now();
let sonrakiTik = Date.now() + ADIM_MS;

function dongu() {
  const now = Date.now();
  const dt = Math.min(0.1, (now - last) / 1000);   // sekme donunca dev adim atmasin
  last = now;
  rooms.tickAll(dt);

  sonrakiTik += ADIM_MS;
  // Cok geri kaldiysak (uyku/askiya alma) birikmis tiklari kovalamaya calisma
  if (sonrakiTik < now) sonrakiTik = now + ADIM_MS;
  setTimeout(dongu, Math.max(0, sonrakiTik - Date.now()));
}
setTimeout(dongu, ADIM_MS);

// ---------------- Baslat ----------------

server.listen(cfg.PORT, () => {
  const nets = require('os').networkInterfaces();
  const lan = [];
  for (const name in nets) {
    for (const n of nets[name] || []) {
      if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
    }
  }
  console.log('');
  console.log('  PARTI PANIK sunucusu calisiyor!');
  console.log('  --------------------------------');
  console.log('  Bu bilgisayar : http://localhost:' + cfg.PORT);
  for (const ip of lan) {
    console.log('  Ayni Wi-Fi    : http://' + ip + ':' + cfg.PORT);
  }
  console.log('  Oyuncu sayisi : ' + cfg.MAX_PLAYERS + ' (server/config.js icinden degistirilir)');
  console.log('');
});
