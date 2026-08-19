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
    conn.sendJSON({ t: 'joined', code: r.code, id: p.id, slot: p.slot });
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
        if (r.isFull) return fail('ODA DOLU');
        if (r.game.phase !== 'lobby') return fail('OYUN BASLAMIS');
        enter(r, msg.name);
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
      case 'leave':
        conn.close();
        break;
      default:
        break;
    }
  });

  conn.on('close', () => {
    if (room && player) {
      room.remove(player);
      if (!room.dead) room.broadcast(room.game.snapshot());
      room = null;
      player = null;
    }
  });
});

// ---------------- Ana dongu ----------------

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.1, (now - last) / 1000);   // sekme donunca dev adim atmasin
  last = now;
  rooms.tickAll(dt);
}, Math.round(1000 / cfg.TICK_HZ));

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
