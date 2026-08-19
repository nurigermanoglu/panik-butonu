'use strict';
// Minimal WebSocket (RFC 6455) sunucusu - harici bagimlilik yok.
const crypto = require('crypto');
const { EventEmitter } = require('events');

// RFC 6455 sabiti - birebir dogru olmali, tarayicilar bunu katı dogrular
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 1 << 20; // 1 MB guvenlik siniri

class Conn extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.closed = false;
    this.fragOpcode = 0;
    this.fragChunks = [];
    this.rtt = 0;          // gidis-donus gecikmesi (ms) - oyun adaleti icin olculur
    this.missed = 0;       // arka arkaya cevapsiz ping sayisi
    this._pingAt = 0;

    socket.setNoDelay(true);
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this._shutdown());
    socket.on('error', () => this._shutdown());

    // Duzenli ping: hem baglanti canli mi diye bakar hem de gecikmeyi olcer.
    this.pinger = setInterval(() => {
      if (this.missed >= 4) return this._shutdown();   // ~20 sn cevapsiz -> dustu
      this.missed++;
      this._pingAt = Date.now();
      this._frame(0x9, Buffer.alloc(0));
    }, 5000);
  }

  _onData(chunk) {
    if (this.closed) return;
    this.buf = Buffer.concat([this.buf, chunk]);
    if (this.buf.length > MAX_FRAME) return this.close();
    while (this._parse()) { /* birden fazla frame gelmis olabilir */ }
  }

  _parse() {
    const b = this.buf;
    if (b.length < 2) return false;

    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;

    if (len === 126) {
      if (b.length < off + 2) return false;
      len = b.readUInt16BE(off);
      off += 2;
    } else if (len === 127) {
      if (b.length < off + 8) return false;
      const big = b.readBigUInt64BE(off);
      off += 8;
      if (big > BigInt(MAX_FRAME)) { this.close(); return false; }
      len = Number(big);
    }
    if (len > MAX_FRAME) { this.close(); return false; }

    let maskKey = null;
    if (masked) {
      if (b.length < off + 4) return false;
      maskKey = b.subarray(off, off + 4);
      off += 4;
    }
    if (b.length < off + len) return false;

    const payload = Buffer.from(b.subarray(off, off + len));
    this.buf = Buffer.from(b.subarray(off + len));

    if (maskKey) {
      for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i & 3];
    }

    switch (opcode) {
      case 0x8: // close
        this.close();
        return false;
      case 0x9: // ping
        this._frame(0xA, payload);
        return true;
      case 0xA: // pong
        this.missed = 0;
        if (this._pingAt) this.rtt = Date.now() - this._pingAt;
        return true;
      case 0x0: // devam frame'i
        this.fragChunks.push(payload);
        if (fin) {
          const full = Buffer.concat(this.fragChunks);
          this.fragChunks = [];
          this._deliver(this.fragOpcode, full);
        }
        return true;
      case 0x1:
      case 0x2:
        if (!fin) {
          this.fragOpcode = opcode;
          this.fragChunks = [payload];
          return true;
        }
        this._deliver(opcode, payload);
        return true;
      default:
        return true;
    }
  }

  _deliver(opcode, payload) {
    this.missed = 0;
    if (opcode === 0x1) this.emit('message', payload.toString('utf8'));
  }

  _frame(opcode, payload) {
    if (this.closed || this.socket.destroyed) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;
    try { this.socket.write(Buffer.concat([header, payload])); } catch (e) { this._shutdown(); }
  }

  send(text) {
    this._frame(0x1, Buffer.from(String(text), 'utf8'));
  }

  sendJSON(obj) {
    this.send(JSON.stringify(obj));
  }

  close() {
    if (this.closed) return;
    this._frame(0x8, Buffer.alloc(0));
    try { this.socket.end(); } catch (e) { /* yoksay */ }
    this._shutdown();
  }

  _shutdown() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.pinger);
    try { this.socket.destroy(); } catch (e) { /* yoksay */ }
    this.emit('close');
  }
}

function attach(httpServer, onConnection) {
  httpServer.on('upgrade', (req, socket) => {
    if (process.env.PP_DEBUG) console.log('[ws] upgrade istegi:', JSON.stringify(req.headers));
    const key = req.headers['sec-websocket-key'];
    const upgrade = String(req.headers.upgrade || '').toLowerCase();
    if (!key || upgrade !== 'websocket') {
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
    );
    onConnection(new Conn(socket), req);
  });
}

module.exports = { attach, Conn };
