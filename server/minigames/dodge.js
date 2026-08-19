'use strict';
// ENGELDEN KAC (Subway Surfers tarzi) - 3 seritli kosu.
//
//   sol / sag  -> serit degistir
//   yukari     -> zipla (sadece ALCAK engeller ziplayarak gecilir)
//
// Desen bir kez uretilir ve HERKES ayni engelleri oynar. Her satirda en az bir
// serit acik birakilir; satirlar arasi sure en genis serit gecisine (2 serit,
// ~0.27 sn) her zaman yeter. Yani olum sansa degil reflekse baglidir.
//
// Kazanan: hayatta kalan; ikisi de olduyse daha uzun kosan.

const LANES = 3;
const ARENA_H = 140;
const PLAYER_W = 14, PLAYER_H = 16;
const PLAYER_Y = ARENA_H - 34;        // oyuncunun durdugu cizgi
const SWITCH_SPEED = 7.5;             // serit/sn (bir serit ~0.13 sn)
const JUMP_TIME = 0.5;                // ziplama toplam suresi
const AIR_FROM = 0.08, AIR_TO = 0.42; // bu aralikta havada sayilir
const ROW_H = 16;                     // engel satirinin kalinligi
const DURATION = 14;

// 2 kisi genis, 3-4 kisi dar saha (ekran bolununce)
function arenaWidth(playerCount) {
  return playerCount <= 2 ? 102 : 78;
}

function laneX(i, W) {
  return Math.round(W * (i + 0.5) / LANES);
}

function buildSchedule() {
  const rows = [];
  let t = 0.9;

  while (t < DURATION) {
    const v = 52 + t * 3.6;                       // yaklasma hizi (birim/sn)
    const acik = Math.floor(Math.random() * LANES);
    const digerleri = [0, 1, 2].filter((l) => l !== acik);
    // %55 ihtimalle iki serit birden kapali (zor), yoksa tek serit
    const kapali = Math.random() < 0.55
      ? digerleri
      : [digerleri[Math.floor(Math.random() * digerleri.length)]];
    const alcak = Math.random() < 0.4;            // alcak engel: ziplayarak da gecilir

    rows.push({ t, v, kapali, alcak });
    t += Math.max(0.58, 1.15 - t * 0.035);        // zamanla siklasir
  }
  return rows;
}

module.exports = {
  id: 'dodge',
  name: 'ENGELDEN KAC',
  instruction: 'SERIT DEGISTIR, ZIPLA!',
  controls: 'dpad',
  duration: DURATION,

  create(playerIds) {
    const W = arenaWidth(playerIds.length);
    const plan = buildSchedule();

    const pl = {};
    for (const id of playerIds) {
      pl[id] = {
        lane: 1, hedef: 1, kayma: 1,      // kayma = suzulen serit konumu
        jump: -1,                          // ziplama baslangic ani (-1 = yerde)
        alive: true, deadAt: DURATION,
      };
    }

    return {
      ids: playerIds.slice(),
      W,
      pl,
      plan,
      nextRow: 0,
      rows: [],
      t: 0,

      havada(p) {
        if (p.jump < 0) return false;
        const d = this.t - p.jump;
        return d >= AIR_FROM && d <= AIR_TO;
      },

      input(pid, a, d) {
        const p = this.pl[pid];
        if (!p || !p.alive) return;
        if (a !== 'dir') return;
        if (d === 'left') p.hedef = Math.max(0, p.hedef - 1);
        else if (d === 'right') p.hedef = Math.min(LANES - 1, p.hedef + 1);
        else if (d === 'up') {
          if (p.jump < 0 || this.t - p.jump > JUMP_TIME) p.jump = this.t;
        }
      },

      update(dt) {
        this.t += dt;

        while (this.nextRow < this.plan.length && this.plan[this.nextRow].t <= this.t) {
          const r = this.plan[this.nextRow++];
          this.rows.push({ y: -ROW_H, v: r.v, kapali: r.kapali, alcak: r.alcak });
        }

        for (let i = this.rows.length - 1; i >= 0; i--) {
          this.rows[i].y += this.rows[i].v * dt;
          if (this.rows[i].y > ARENA_H) this.rows.splice(i, 1);
        }

        const yariSerit = this.W / (LANES * 2);

        for (const id of this.ids) {
          const p = this.pl[id];
          if (!p.alive) continue;

          // serit gecisi (suzulerek)
          const fark = p.hedef - p.kayma;
          const adim = SWITCH_SPEED * dt;
          if (Math.abs(fark) <= adim) p.kayma = p.hedef;
          else p.kayma += Math.sign(fark) * adim;
          p.lane = Math.round(p.kayma);

          if (p.jump >= 0 && this.t - p.jump > JUMP_TIME) p.jump = -1;

          const px = laneX(0, this.W) + p.kayma * (laneX(1, this.W) - laneX(0, this.W));
          const solum = px - PLAYER_W / 2, sagim = px + PLAYER_W / 2;
          const ucuyor = this.havada(p);

          for (const r of this.rows) {
            if (PLAYER_Y >= r.y + ROW_H || PLAYER_Y + PLAYER_H <= r.y) continue;
            if (r.alcak && ucuyor) continue;                  // ustunden atladi
            let carpti = false;
            for (const l of r.kapali) {
              const lx = laneX(l, this.W);
              if (solum < lx + yariSerit && sagim > lx - yariSerit) { carpti = true; break; }
            }
            if (carpti) { p.alive = false; p.deadAt = this.t; break; }
          }
        }
      },

      done() {
        return this.ids.every((id) => !this.pl[id].alive);
      },

      winners() {
        const alive = this.ids.filter((id) => this.pl[id].alive);
        if (alive.length === this.ids.length) return [];       // hepsi sag kaldi
        if (alive.length > 0) return alive;
        const best = Math.max(...this.ids.map((id) => this.pl[id].deadAt));
        const top = this.ids.filter((id) => this.pl[id].deadAt >= best - 1e-6);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const alive = this.ids.filter((id) => this.pl[id].alive);
        if (!this.winners().length) {
          return alive.length ? 'HEPSI SAG KALDI!' : 'AYNI ANDA GITTILER!';
        }
        if (alive.length > 0) return 'TEK AYAKTA KALAN!';
        return 'DAHA UZUN KOSTU!';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          const p = this.pl[id];
          pl[id] = {
            k: Math.round(p.kayma * 100) / 100,
            a: p.alive,
            z: p.jump >= 0 ? Math.round(Math.min(1, (this.t - p.jump) / JUMP_TIME) * 100) / 100 : -1,
          };
        }
        return {
          w: this.W, h: ARENA_H, lanes: LANES,
          pw: PLAYER_W, ph: PLAYER_H, py: PLAYER_Y, rh: ROW_H,
          rows: this.rows.map((r) => ({ y: Math.round(r.y), k: r.kapali, al: r.alcak })),
          pl,
        };
      },
    };
  },
};
