'use strict';
// REFLEKS DUELLOSU - ekran yesile donunce ILK basan kazanir. Erken basan yanar.
//
// Internet uzerinden adalet: kazanani "tusu sunucuya ilk ulasan" diye secmek, dusuk ping'li
// oyuncuya haksiz avantaj verir. Onun yerine her istemci KENDI olctugu tepki suresini
// bildirir (isareti gordugu an ile tusa bastigi an arasi), sunucu da bunu makul sinirlar
// icinde dogrular. Boylece ping denklemden cikar; herkes kendi ekraninda yaristigi gibi olur.

const HUMAN_FLOOR_MS = 90;   // insan tepkisinin makul alt siniri
const SLACK_MS = 40;         // olcum/yuvarlama payi

module.exports = {
  id: 'reflex',
  name: 'REFLEKS DUELLOSU',
  instruction: 'ISARETI BEKLE!',
  controls: 'action',
  duration: 10,

  // NOT: Bu oyun turlar ilerledikce ZORLASMAZ - tepki suresi tepki suresidir,
  // hizlandirmakla insan daha hizli refleks kazanmaz. Sadece TEMPO artar:
  // isaret daha erken gelir ve tur daha cabuk biter.
  create(playerIds, seviye) {
    const sv = Math.max(0, Math.min(1, seviye || 0));
    const sure = 10 * (1 - 0.25 * sv);
    const fouled = {};
    const reaction = {};
    for (const id of playerIds) { fouled[id] = false; reaction[id] = null; }

    return {
      ids: playerIds.slice(),
      sure,
      fouled,
      reaction,
      t: 0,
      wait: (1.8 + Math.random() * 2.9) * (1 - 0.3 * sv),
      signal: false,
      signalAt: 0,

      input(pid, a, d, rtt) {
        if (a !== 'press') return;
        if (this.fouled[pid] === undefined) return;
        if (this.fouled[pid] || this.reaction[pid] !== null) return;   // zaten bitti

        if (!this.signal) {
          this.fouled[pid] = true;      // erken bastin -> yandin
          return;
        }

        // Sunucunun gordugu sure = gercek tepki + gidis-donus gecikmesi.
        // Dolayisiyla dogru tepki suresi (serverMs - rtt) degerinden kucuk OLAMAZ.
        // Istemci daha dusuk bir sure bildirirse bu sinira cekilir; boylece hile,
        // oyuncunun gercek gecikmesi kadarla sinirli kalir.
        const serverMs = (this.t - this.signalAt) * 1000;
        const floor = Math.max(HUMAN_FLOOR_MS, serverMs - (Number(rtt) || 0) - SLACK_MS);

        let ms = Number(d);
        if (!isFinite(ms) || ms <= 0) ms = serverMs;
        ms = Math.max(floor, Math.min(ms, serverMs + SLACK_MS));
        this.reaction[pid] = Math.round(ms);
      },

      update(dt) {
        this.t += dt;
        if (!this.signal && this.t >= this.wait) {
          this.signal = true;
          this.signalAt = this.t;
        }
      },

      // Herkes basana (ya da yanana) kadar bekle - yavas baglanti kaybetmesin
      done() {
        return this.ids.every((id) => this.fouled[id] || this.reaction[id] !== null);
      },

      winners() {
        const valid = this.ids.filter((id) => !this.fouled[id] && this.reaction[id] !== null);
        if (!valid.length) return [];
        const best = Math.min(...valid.map((id) => this.reaction[id]));
        const top = valid.filter((id) => this.reaction[id] === best);
        return top.length === this.ids.length ? [] : top;
      },

      text() {
        const w = this.winners();
        if (w.length) return this.reaction[w[0]] + ' MS';
        if (this.ids.every((id) => this.fouled[id])) return 'HEPSI ERKEN BASTI!';
        if (this.ids.every((id) => this.reaction[id] === null)) return 'KIMSE BASAMADI!';
        return 'TAM AYNI ANDA!';
      },

      snap() {
        return {
          sig: this.signal,
          fouled: this.fouled,
          r: this.reaction,
        };
      },
    };
  },
};
