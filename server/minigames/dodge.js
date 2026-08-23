'use strict';
// ENGELDEN KAC (Subway Surfers tarzi) - 3 seritli kosu.
//
//   sol / sag  -> serit degistir
//
// Ziplama YOK: her engel tam bir duvar, tek kurtulus serit degistirmek.
//
// Desen bir kez uretilir ve HERKES ayni engelleri oynar. Her satirda en az bir
// serit acik birakilir; satirlar arasi sure en genis serit gecisine (2 serit,
// ~0.27 sn) her zaman yeter. Yani olum sansa degil reflekse baglidir.
//
// Kazanan: hayatta kalan; ikisi de olduyse daha uzun kosan.

const { dereceler } = require('./siralama');
const LANES = 3;
const ARENA_H = 140;
const PLAYER_W = 14, PLAYER_H = 16;
const PLAYER_Y = ARENA_H - 34;        // oyuncunun durdugu cizgi
const SWITCH_SPEED = 7.5;             // serit/sn (bir serit ~0.13 sn)
const ROW_H = 16;                     // engel satirinin kalinligi
const DURATION = 14;

// 2 kisi genis, 3-4 kisi dar saha (ekran bolununce)
function arenaWidth(playerCount) {
  return playerCount <= 2 ? 102 : 78;
}

function laneX(i, W) {
  return Math.round(W * (i + 0.5) / LANES);
}

function buildSchedule(sv) {
  const rows = [];
  let t = 0.9;
  // Turlar ilerledikce engeller %25'e kadar hizlanir. Satir araligi zaten
  // hizdan hesaplandigi icin (asagidaki enAzAra) desen otomatik olarak
  // gecilebilir kalir - hizlaninca aralar da kendiliginden acilir.
  const hizCarpani = 1 + 0.25 * sv;

  while (t < DURATION) {
    // Zorluk sona dogru belirgin sekilde artar: engeller hizlanir, satirlar siklasir
    // ve iki seridi birden kapatma ihtimali yukselir.
    const v = (50 + t * 4.2) * hizCarpani;        // yaklasma hizi (birim/sn)
    const acik = Math.floor(Math.random() * LANES);
    const digerleri = [0, 1, 2].filter((l) => l !== acik);
    const ciftIhtimal = Math.min(0.85, 0.45 + t * 0.025);
    const kapali = Math.random() < ciftIhtimal
      ? digerleri
      : [digerleri[Math.floor(Math.random() * digerleri.length)]];
    const kalinlik = 13 + Math.floor(Math.random() * 6);   // 13-18: her satir ayni durmasin
    const tip = Math.floor(Math.random() * 3);             // gorsel cesit (duvar/blok/bariyer)

    rows.push({ t, v, kapali, h: kalinlik, tip });

    // Aralik biraz sasirtilir ki desen makine gibi duzenli durmasin.
    //
    // Alt sinir SABIT DEGIL, satirin kendisinden hesaplanir:
    //   satirin bandi terk etme suresi (kalinlik/hiz)
    // + en genis serit gecisi (2 serit = 0.27 sn)
    // + tepki payi
    // Boylece kalin ve hizli satirlarda bile bir sonraki satira yetismek
    // her zaman mumkun kalir; desen hicbir zaman gecilemez hale gelmez.
    const gecis = 2 / SWITCH_SPEED;
    const tepkiPayi = 0.36 - t * 0.016;      // tur ilerledikce daralir = zorlasir
    const enAzAra = kalinlik / v + gecis + tepkiPayi;
    // Turlar ilerledikce satirlar SIKLASIR (asil zorluk kaldiraci bu).
    // enAzAra alt siniri yine devrede oldugu icin desen gecilemez hale gelemez:
    // sikistirma, adaletin izin verdigi yere kadar iner ve orada durur.
    var ara = (1.15 - t * 0.045) * (0.85 + Math.random() * 0.32) * (1 - 0.32 * sv);
    t += Math.max(enAzAra, ara);
  }
  return rows;
}

module.exports = {
  id: 'dodge',
  name: 'ENGELDEN KAC',
  instruction: 'SERIT DEGISTIR!',
  controls: 'lr',                  // sadece sol/sag - ziplama yok
  duration: DURATION,

  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    const W = arenaWidth(playerIds.length);
    const plan = buildSchedule(sv);

    const pl = {};
    for (const id of playerIds) {
      pl[id] = {
        lane: 1, hedef: 1, kayma: 1,      // kayma = suzulen serit konumu
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

      input(pid, a, d) {
        const p = this.pl[pid];
        if (!p || !p.alive) return;
        if (a !== 'dir') return;
        if (d === 'left') p.hedef = Math.max(0, p.hedef - 1);
        else if (d === 'right') p.hedef = Math.min(LANES - 1, p.hedef + 1);
      },

      update(dt) {
        this.t += dt;

        while (this.nextRow < this.plan.length && this.plan[this.nextRow].t <= this.t) {
          const r = this.plan[this.nextRow++];
          this.rows.push({ y: -r.h, v: r.v, kapali: r.kapali, h: r.h, tip: r.tip });
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

          const px = laneX(0, this.W) + p.kayma * (laneX(1, this.W) - laneX(0, this.W));
          const solum = px - PLAYER_W / 2, sagim = px + PLAYER_W / 2;

          for (const r of this.rows) {
            if (PLAYER_Y >= r.y + r.h || PLAYER_Y + PLAYER_H <= r.y) continue;
            let carpti = false;
            for (const l of r.kapali) {
              const lx = laneX(l, this.W);
              if (solum < lx + yariSerit && sagim > lx - yariSerit) { carpti = true; break; }
            }
            if (carpti) { p.alive = false; p.deadAt = this.t; break; }
          }
        }
      },

      // ---- bu oyuna ozel bot ----
      // Rastgele serit degistiren genel bot kendini engele sokuyordu: hic
      // oynamayandan bile kotu sonuc aliyordu. Bu bot yaklasan satira bakip
      // acik serite gecer.
      botHamle(pid, snap, zorluk) {
        const me = snap.pl[pid];
        if (!me || !me.a) return;

        const ISABET = [0.6, 0.85, 1];
        const isabet = ISABET[zorluk] !== undefined ? ISABET[zorluk] : 0.85;
        const serit = Math.round(me.h);        // hedeflenen serit

        // Serit degisimi ANLIK degil, suzulerek olur. Hedefe varmadan yeni
        // karar verilirse bot iki serit arasinda kalip ikisinden de carpar -
        // olculdu: zor bot (sik hamle yaptigi icin) kolaydan bile kotuydu.
        if (Math.abs(me.k - me.h) > 0.15) return;

        // Oyuncuya en yakin, henuz TAMAMEN gecmemis satir.
        // "uzaklik < 0 ise atla" demek hataliydi: oyuncunun hizasina girmis
        // ama henuz gecmemis satir yok sayiliyor, bot bir sonrakine gore
        // kacip mevcut engele carpiyordu.
        let yakin = null, enKisa = Infinity;
        for (const r of snap.rows) {
          if (r.y > snap.py + snap.ph) continue;      // tamamen gecti
          const uzaklik = Math.max(0, snap.py - (r.y + r.h));
          const sure = uzaklik / Math.max(1, r.v);
          if (sure < enKisa) { enKisa = sure; yakin = r; }
        }
        if (!yakin) return;
        if (yakin.k.indexOf(serit) < 0) return; // seridim zaten acik

        // Kapali olmayan seritlerden en yakinina gec
        const acik = [];
        for (let l = 0; l < snap.lanes; l++) if (yakin.k.indexOf(l) < 0) acik.push(l);
        if (!acik.length) return;
        let hedef = acik[0];
        for (const l of acik) {
          if (Math.abs(l - serit) < Math.abs(hedef - serit)) hedef = l;
        }
        if (Math.random() > isabet) hedef = Math.floor(Math.random() * snap.lanes);
        if (hedef === serit) return;
        this.input(pid, 'dir', hedef < serit ? 'left' : 'right');
      },

      done() {
        return this.ids.every((id) => !this.pl[id].alive);
      },

      // Hayatta kalanlar esit birinci; olenler arasinda gec olen onde.
      derece() {
        return dereceler(this.ids, (id) => {
          const p = this.pl[id];
          return p.alive ? -1e6 : -p.deadAt;
        });
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
            // hedef serit: istemci paketler arasinda oyuncuyu da suzerek
            // ilerletsin diye gonderilir (yoksa karakter adim adim ziplar)
            h: p.hedef,
          };
        }
        return {
          w: this.W, h: ARENA_H, lanes: LANES,
          pw: PLAYER_W, ph: PLAYER_H, py: PLAYER_Y, rh: ROW_H,
          sw: SWITCH_SPEED,        // serit/sn - istemci ayni suzulmeyi tekrar eder
          // v = hiz: istemci paketler arasinda konumu suzerek akici cizer
          rows: this.rows.map((r) => ({
            y: Math.round(r.y * 10) / 10, v: Math.round(r.v), h: r.h,
            k: r.kapali, tip: r.tip
          })),
          pl,
        };
      },
    };
  },
};
