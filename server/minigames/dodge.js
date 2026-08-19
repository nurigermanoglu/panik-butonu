'use strict';
// ENGELDEN KAC - herkes kendi sahasinda, ama tam olarak AYNI engeller ve yildizlar duser.
//
// Kazanan nasil belirlenir (sirasiyla):
//   1) Hayatta kalan, olene ustun gelir
//   2) Esitse: daha cok yildiz toplayan kazanir
//   3) O da esitse: daha uzun dayanan kazanir
// Yildizlar sayesinde "ikisi de sag kaldi" turlari da bir kazanan uretir.

// Saha genisligi oyuncu sayisina gore: ekran bolundugu icin 3-4 kiside daha dar olmali.
// (320 px ekran / 4 sutun = 80 px; saha 74 birim + kenar payi sigar)
function arenaWidth(playerCount) {
  return playerCount <= 2 ? 100 : 74;
}

const ARENA_H = 140;
const PLAYER_W = 10;
const PLAYER_H = 10;
const PLAYER_Y = ARENA_H - PLAYER_H - 4;
const SPEED = 72;
const OBS_H = 8;
const STAR = 6;
const DURATION = 12;

function buildSchedule(ARENA_W) {
  // Desen her zaman GECILEBILIR uretilir: bir "guvenli koridor" takip edilir ve her engel
  // koridoru acikta birakacak sekilde yerlestirilir. Koridor, oyuncunun o surede
  // kosabilecegi mesafe kadar kayar. Boylece olum sansa degil reflekse baglidir.
  const obstacles = [];
  const stars = [];
  const HALF = PLAYER_W / 2 + 2;

  let st = 0.9;
  let safe = ARENA_W / 2;
  let prevArrival = 0;

  while (st < DURATION) {
    const w = 10 + Math.random() * 14;
    const v = 40 + Math.random() * 12 + st * 2.8;
    const arrival = st + (PLAYER_Y + OBS_H) / v;
    const gapT = arrival - prevArrival;

    // Iki engel neredeyse ayni anda geliyorsa koridoru oynatma: ikisi de ayni bosluga izin versin.
    let reach = 14;
    let g = safe;
    if (gapT >= 0.35) {
      reach = Math.max(14, gapT * SPEED * 0.75);
      const lo = Math.max(HALF, safe - reach);
      const hi = Math.min(ARENA_W - HALF, safe + reach);
      g = lo + Math.random() * (hi - lo);
    }

    // Engeli koridorun soluna ya da sagina koy
    const leftRoom = g - HALF;
    const rightRoom = ARENA_W - (g + HALF);
    let x;
    if (leftRoom >= w && rightRoom >= w) {
      x = Math.random() < 0.5
        ? Math.random() * (leftRoom - w)
        : (g + HALF) + Math.random() * (rightRoom - w);
    } else if (leftRoom >= w) {
      x = Math.random() * (leftRoom - w);
    } else {
      x = Math.min(ARENA_W - w, g + HALF);
    }
    obstacles.push({ st, x, w, v });

    // Yildiz: guvenli koridorun icinde ama tam merkezde degil. Hayatta kalmak icin
    // bosluktan gecmek yeter; yildizi almak icin dogru NOKTAYA denk gelmek gerekir.
    if (Math.random() < 0.85) {
      let sx = g + (Math.random() * 2 - 1) * reach * 0.15;
      sx = Math.max(HALF, Math.min(ARENA_W - HALF, sx)) - STAR / 2;
      const clashesObstacle = sx < x + w && sx + STAR > x;
      if (!clashesObstacle) stars.push({ st, x: sx, v });
    }

    safe = g;
    prevArrival = arrival;
    st += Math.max(0.36, 0.92 - st * 0.040);
  }

  return { obstacles, stars };
}

module.exports = {
  id: 'dodge',
  name: 'ENGELDEN KAC',
  instruction: 'KAC VE YILDIZ TOPLA!',
  controls: 'lr',
  duration: DURATION,

  create(playerIds) {
    const ARENA_W = arenaWidth(playerIds.length);
    const plan = buildSchedule(ARENA_W);
    const pl = {};
    for (const id of playerIds) {
      pl[id] = { x: ARENA_W / 2 - PLAYER_W / 2, dir: 0, alive: true, deadAt: DURATION, stars: 0 };
    }

    return {
      ids: playerIds.slice(),
      pl,
      plan,
      nextObs: 0,
      nextStar: 0,
      obs: [],
      stars: [],
      t: 0,

      input(pid, a, d) {
        if (a !== 'move') return;
        const p = this.pl[pid];
        if (!p) return;
        p.dir = d < 0 ? -1 : d > 0 ? 1 : 0;
      },

      update(dt) {
        this.t += dt;

        while (this.nextObs < this.plan.obstacles.length && this.plan.obstacles[this.nextObs].st <= this.t) {
          const s = this.plan.obstacles[this.nextObs++];
          this.obs.push({ x: s.x, w: s.w, y: -OBS_H, v: s.v });
        }
        while (this.nextStar < this.plan.stars.length && this.plan.stars[this.nextStar].st <= this.t) {
          const s = this.plan.stars[this.nextStar++];
          this.stars.push({ x: s.x, y: -STAR, v: s.v, by: [] });
        }

        for (let i = this.obs.length - 1; i >= 0; i--) {
          this.obs[i].y += this.obs[i].v * dt;
          if (this.obs[i].y > ARENA_H) this.obs.splice(i, 1);
        }
        for (let i = this.stars.length - 1; i >= 0; i--) {
          this.stars[i].y += this.stars[i].v * dt;
          if (this.stars[i].y > ARENA_H) this.stars.splice(i, 1);
        }

        for (const id of this.ids) {
          const p = this.pl[id];
          if (!p.alive) continue;

          p.x += p.dir * SPEED * dt;
          if (p.x < 0) p.x = 0;
          if (p.x > ARENA_W - PLAYER_W) p.x = ARENA_W - PLAYER_W;

          for (const s of this.stars) {
            if (s.by.indexOf(id) >= 0) continue;
            if (
              p.x < s.x + STAR && p.x + PLAYER_W > s.x &&
              PLAYER_Y < s.y + STAR && PLAYER_Y + PLAYER_H > s.y
            ) {
              s.by.push(id);
              p.stars++;
            }
          }

          for (const o of this.obs) {
            if (
              p.x < o.x + o.w && p.x + PLAYER_W > o.x &&
              PLAYER_Y < o.y + OBS_H && PLAYER_Y + PLAYER_H > o.y
            ) {
              p.alive = false;
              p.deadAt = this.t;
              break;
            }
          }
        }
      },

      done() {
        return this.ids.every((id) => !this.pl[id].alive);
      },

      // Sirali karsilastirma: once hayatta kalma, sonra yildiz, sonra dayanma suresi
      winners() {
        const score = (id) => {
          const p = this.pl[id];
          return [p.alive ? 1 : 0, p.stars, p.deadAt];
        };
        const better = (a, b) => {
          for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i] + 1e-6) return 1;
            if (a[i] < b[i] - 1e-6) return -1;
          }
          return 0;
        };
        let best = score(this.ids[0]);
        for (const id of this.ids) {
          if (better(score(id), best) > 0) best = score(id);
        }
        const top = this.ids.filter((id) => better(score(id), best) === 0);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const w = this.winners();
        if (!w.length) {
          return this.ids.every((id) => this.pl[id].alive) ? 'TAM BERABERE!' : 'AYNI ANDA GITTILER!';
        }
        const p = this.pl[w[0]];
        if (p.alive && this.ids.some((id) => !this.pl[id].alive)) return 'TEK AYAKTA KALAN!';
        if (p.alive) return p.stars + ' YILDIZ TOPLADI!';
        return 'DAHA UZUN DAYANDI!';
      },

      snap() {
        const pl = {};
        for (const id of this.ids) {
          pl[id] = { x: Math.round(this.pl[id].x), a: this.pl[id].alive, s: this.pl[id].stars };
        }
        return {
          w: ARENA_W, h: ARENA_H, pw: PLAYER_W, ph: PLAYER_H, py: PLAYER_Y, oh: OBS_H, ss: STAR,
          obs: this.obs.map((o) => ({ x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w) })),
          stars: this.stars.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), by: s.by })),
          pl,
        };
      },
    };
  },
};
