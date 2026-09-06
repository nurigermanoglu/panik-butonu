'use strict';
const cfg = require('./config');
const MINIGAMES = require('./minigames');

// Faz akisi:  lobby -> intro -> play -> result -> (intro | gameover)
class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'lobby';
    this.timer = 0;
    this.mg = null;        // mini oyun modulu (meta)
    this.inst = null;      // mini oyun ornegi (mantik)
    this.tur = 0;          // kacinci tur oynaniyor (hiz bunun uzerinden artar)
    this.bag = [];         // karistirilmis torba: her oyun tekrar etmeden bir kez gelir
    // Mini oyunlarin turlar arasinda hatirlamasi gereken seyler (ornegin
    // puzzle'in resim torbasi). ODA BASINA: modul seviyesinde tutulsaydi
    // ayni anda oynayan butun odalar tek torbayi paylasirdi.
    this.hafiza = {};
    this.lastId = null;
    this.result = null;
    this.winner = null;
    this.notice = null;
    this.final = false;    // bu tur FINAL TURU mu (puanlar iki katina cikar)
    // Mac boyunca biriken istatistikler. Mini oyunlara HIC dokunmadan,
    // yalnizca tur sonuclarindan cikarilir - yeni bir oyun eklendiginde
    // kendiliginden calisir.
    this.istat = {};
    this.dirty = true;
    this.refresh = 0;
  }

  // ---------- oyuncu komutlari ----------

  setReady(player, value) {
    if (this.phase !== 'lobby') return;
    player.ready = !!value;
    this.dirty = true;
    this.tryStart();
  }

  tryStart() {
    const ps = this.room.players;
    if (ps.length < cfg.MIN_PLAYERS) return;
    // Sadece botlardan olusan bir oda mac baslatmasin
    if (!ps.some((p) => !p.bot)) return;
    if (!ps.every((p) => p.ready)) return;
    for (const p of ps) { p.wins = 0; p.ready = p.bot; }
    this.notice = null;
    this.tur = 0;
    this.bag = [];
    this.nextRound();
  }

  // Hedef turu (kac galibiyet sampiyon eder) - sadece odayi kuran, sadece lobide
  setTarget(player, delta) {
    if (this.phase !== 'lobby') return;
    if (player.id !== this.room.hostId) return;
    const d = Number(delta) < 0 ? -1 : 1;
    const next = this.room.winsNeeded + d;
    this.room.winsNeeded = Math.max(cfg.WINS_MIN, Math.min(cfg.WINS_MAX, next));
    this.dirty = true;
  }

  // Karakter secimi - herkes kendi karakterini lobide degistirir.
  // Baskasinin sectigi karakter atlanir: iki kisi ayni karakteri alamaz.
  setChar(player, delta) {
    if (this.phase !== 'lobby') return;
    const n = cfg.CHAR_COUNT;
    const d = Number(delta) < 0 ? -1 : 1;
    const alinan = new Set(
      this.room.players.filter((p) => p !== player).map((p) => p.char)
    );
    let c = player.char;
    for (let i = 0; i < n; i++) {
      c = (((c + d) % n) + n) % n;
      if (!alinan.has(c)) {
        player.char = c;
        this.dirty = true;
        return;
      }
    }
  }

  // Sampiyon ekranindan lobiye dondurur. Basan kisi HAZIR SAYILMAZ:
  // lobide herkes kendi HAZIRIM butonuna basar.
  //
  // Lobide gelen 'again' paketleri de yok sayilir. Iki kisi sampiyon ekraninda
  // neredeyse ayni anda basmis olabilir; ikinci paket oda lobiye dustukten
  // sonra ulasir ve o kisiyi istem disi hazir yapardi.
  requestRematch() {
    if (this.phase !== 'gameover') return;
    this.toLobby(null);
  }

  handleInput(player, action, data) {
    if (this.phase !== 'play' || !this.inst) return;
    // Gecikme bilgisi de gecirilir: refleks turu bunu adalet/hile siniri icin kullanir
    this.inst.input(player.id, action, data, player.conn ? player.conn.rtt || 0 : 0);
  }

  onPlayerLeft(player) {
    delete this.istat[player.id];
    if (this.phase === 'lobby') { this.dirty = true; return; }
    this.toLobby(player.name + ' AYRILDI');
  }

  // ---------- faz gecisleri ----------

  toLobby(notice) {
    this.phase = 'lobby';
    this.timer = 0;
    this.mg = null;
    this.inst = null;
    this.result = null;
    this.winner = null;
    this.notice = notice;
    this.final = false;
    this.istat = {};
    for (const p of this.room.players) { p.ready = p.bot; p.wins = 0; }
    this.tur = 0;
    this.dirty = true;
  }

  // Torba yontemi: butun mini oyunlar bir tur icinde birer kez gelir, sonra torba yenilenir.
  pickMinigame() {
    if (!this.bag.length) {
      this.bag = MINIGAMES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = tmp;
      }
      // yeni torbanin ilki, bir onceki turun oyunuyla ayni olmasin
      if (this.lastId && this.bag.length > 1 && this.bag[0].id === this.lastId) {
        const tmp = this.bag[0]; this.bag[0] = this.bag[1]; this.bag[1] = tmp;
      }
    }
    const chosen = this.bag.shift();
    this.lastId = chosen.id;
    return chosen;
  }

  // 0 = ilk tur (normal hiz), 1 = en yuksek hiz. Aradaki turlarda dogru orantili.
  seviye() {
    const n = Math.max(2, cfg.SPEED_ROUNDS);
    return Math.max(0, Math.min(1, (this.tur - 1) / (n - 1)));
  }

  nextRound() {
    this.tur++;
    for (const p of this.room.players) if (p.bot) p.botBekle = 0.3;
    // Bayrak tur BASINDA sabitlenir: tur ortasinda degisip puani sasirtmasin
    this.final = this.finalTuru;
    this.mg = this.pickMinigame();
    // Mini oyun kendi hizini bu seviyeye gore ayarlar.
    this.inst = this.mg.create(this.room.players.map((p) => p.id), this.seviye(), this.hafiza);
    this.result = null;
    this.phase = 'intro';
    this.timer = cfg.INTRO_TIME;
    this.dirty = true;
  }

  startPlay() {
    this.phase = 'play';
    // Oyun kendi suresini kisaltmis olabilir (hizlandikca sureler de kisalir)
    this.timer = (this.inst && this.inst.sure) || this.mg.duration;
    if (this.inst.start) this.inst.start();
  }

  // Hedef, lobide secilen sayinin TA KENDISI. Kisi sayisina gore
  // olceklenmez: bot eklemek/cikarmak hedefi oynatmaz.
  get hedefPuan() {
    return this.room.winsNeeded;
  }

  // Biri TEK TURDA sampiyonlugu alabilecek duruma geldiyse sonraki tur
  // "final turu" olur: puanlar iki katina cikar. Boylece geride kalanlarin
  // son bir sansi olur ve mac tek tarafli bitmez.
  //
  // Kosul saglandigi surece her tur final turudur; bu bilerek boyle, cunku
  // "1 tur kala" durumu devam ettigi muddetce gerilim de devam etmeli.
  get finalTuru() {
    const n = Math.max(2, this.room.players.length);
    const enYuksek = Math.max(0, ...this.room.players.map((p) => p.wins));
    // enYuksek > 0: mac daha baslamadan final turu ilan edilmesin
    return enYuksek > 0 && enYuksek + (n - 1) >= this.hedefPuan;
  }

  // Turda kacinci gelen kac puan alir:
  //   n kisilik turda onunde k kisi olan (n - 1 - k) puan alir
  //   2 kisi -> 1 / 0          (eski sistemle birebir ayni)
  //   4 kisi -> 3 / 2 / 1 / 0
  // Esit derecedekiler ayni puani paylasir.
  //
  // HERKES esitse (tek grup) kimse puan almaz. Yoksa berabere turlar da
  // herkesi hedefe ayni hizda yaklastirir, sampiyonluk da kurayla belirlenirdi.
  puanDagit() {
    const oyuncular = this.room.players;
    const n = oyuncular.length;
    const gruplar = this.inst.derece ? this.inst.derece() : null;
    if (!gruplar || gruplar.length <= 1) return;

    // Final turunda herkes iki kat puan alir
    const carpan = this.final ? 2 : 1;
    let onunde = 0;
    for (const grup of gruplar) {
      const puan = Math.max(0, n - 1 - onunde) * carpan;
      if (puan > 0) {
        for (const p of oyuncular) {
          if (grup.indexOf(p.id) >= 0) p.wins += puan;
        }
      }
      onunde += grup.length;
    }
  }

  // Bir oyuncunun mac istatistigi (yoksa olusturulur)
  istatOku(id) {
    if (!this.istat[id]) {
      this.istat[id] = {
        kazanma: 0,      // kac tur birinci bitirdi
        seri: 0,         // su anki ust uste kazanma
        enUzunSeri: 0,
        oyunlar: {},     // { miniOyunId: kazanma sayisi }
        sonuncu: 0,      // kac turda tek basina sonuncu oldu
      };
    }
    return this.istat[id];
  }

  istatIsle(winners) {
    const oyuncular = this.room.players;
    const n = oyuncular.length;

    // Derece gruplarindan herkesin sirasini cikar (0 = birinci)
    const gruplar = this.inst.derece ? this.inst.derece() : null;
    const sira = {};
    if (gruplar) {
      let onunde = 0;
      for (const grup of gruplar) {
        for (const id of grup) sira[id] = onunde;
        onunde += grup.length;
      }
    }

    for (const p of oyuncular) {
      const st = this.istatOku(p.id);
      if (winners.indexOf(p.id) >= 0) {
        st.kazanma++;
        st.seri++;
        if (st.seri > st.enUzunSeri) st.enUzunSeri = st.seri;
        if (this.mg) st.oyunlar[this.mg.id] = (st.oyunlar[this.mg.id] || 0) + 1;
      } else {
        st.seri = 0;
      }
      // Tek basina sonuncu olmak: berabere bitmis turlarda kimse sonuncu sayilmaz
      if (sira[p.id] === n - 1 && n > 1) st.sonuncu++;
    }
  }

  finishRound() {
    this.puanDagit();
    const winners = this.inst.winners() || [];
    this.istatIsle(winners);
    this.result = { winners, text: this.inst.text ? this.inst.text() : '' };
    this.phase = 'result';
    this.timer = cfg.RESULT_TIME;
    this.dirty = true;
  }

  afterResult() {
    // Hedefe ulasan tek kisiyse sampiyon olur. Iki kisi ayni anda ve ayni
    // puanla ulastiysa mac devam eder: sampiyonluk siralamayla degil,
    // aradaki farkla belirlensin.
    const hedef = this.hedefPuan;
    const enYuksek = Math.max(...this.room.players.map((p) => p.wins));
    const adaylar = enYuksek >= hedef
      ? this.room.players.filter((p) => p.wins === enYuksek)
      : [];
    const champ = adaylar.length === 1 ? adaylar[0] : null;
    if (champ) {
      this.winner = champ.id;
      this.phase = 'gameover';
      this.timer = 0;
      this.inst = null;
      this.mg = null;
      this.dirty = true;
    } else {
      this.nextRound();
    }
  }

  // ---------- botlar ----------
  //
  // Botlar sunucuda oynar ama oyunun IC degiskenlerine bakmaz: yalnizca
  // snap() ciktisini, yani istemcinin de gordugu bilgiyi kullanirlar.
  // Boylece "her seyi bilen" bir rakip olmazlar.
  //
  // Kontrol semasina gore genel bir davranis uygularlar; her mini oyun icin
  // ayri bot yazilmadi. Sonuc: iyi bir insanin gerisinde kalirlar ama odayi
  // doldurup maci canlandirirlar.

  botAraligi(controls) {
    // Hamleler arasi bekleme. Kisa aralik = daha atak bot.
    let temel;
    switch (controls) {
      case 'action': temel = 0.15 + Math.random() * 0.2; break;
      // Serit oyunlarinda (Engelden Kac, Dusenleri Yakala) insan surekli
      // tepki verebiliyor. 0.3-0.7 sn cok yavasti: zor bot bile Engelden
      // Kac'ta sahanin yarisinda oluyordu (14 sn'nin 7'si).
      case 'lr': temel = 0.1 + Math.random() * 0.14; break;
      case 'dpad': temel = 0.25 + Math.random() * 0.35; break;
      default: temel = 0.2 + Math.random() * 0.25; break;    // pointer
    }
    // Zorluk tempoyu olcekler: kolay bot seyrek, zor bot sik hamle yapar
    const z = this.room.botZorluk;
    const carpan = cfg.BOT_ZORLUK_TEMPO[z] !== undefined ? cfg.BOT_ZORLUK_TEMPO[z] : 1;
    return temel * carpan;
  }

  // Bot zorlugu - sadece odayi kuran, sadece lobide
  setBotZorluk(player, idx) {
    if (this.phase !== 'lobby') return;
    if (player.id !== this.room.hostId) return;
    if (typeof idx !== 'number' || !Number.isInteger(idx)) return;
    if (idx < 0 || idx >= cfg.BOT_ZORLUK_ADLARI.length) return;
    this.room.botZorluk = idx;
    this.dirty = true;
  }

  botHamle(bot, snap) {
    // Mini oyun kendi bot mantigini sunuyorsa o kullanilir. Genel davranis
    // (asagisi) kontrol semasina gore rastgele hamle yapar; bu bazi oyunlarda
    // yeterli, bazilarinda degil.
    if (this.inst.botHamle) {
      this.inst.botHamle(bot.id, snap, this.room.botZorluk);
      return;
    }

    const ctrl = this.mg.controls;

    if (ctrl === 'action') {
      // Refleks turunda isaret gelmeden basmak "yanmak" demek; bot da
      // ekranda isareti gorene kadar bekler.
      if (this.mg.id === 'reflex' && snap && !snap.sig) return;
      // Tepki suresi olarak insan sinirlarina yakin bir deger bildirir
      this.inst.input(bot.id, 'press', 220 + Math.floor(Math.random() * 120), 0);
      return;
    }

    if (ctrl === 'lr') {
      this.inst.input(bot.id, 'dir', Math.random() < 0.5 ? 'left' : 'right');
      return;
    }

    if (ctrl === 'dpad') {
      const yonler = ['up', 'down', 'left', 'right'];
      this.inst.input(bot.id, 'dir', yonler[Math.floor(Math.random() * 4)]);
      return;
    }

    // pointer: rastgele bir noktaya dokun, sonra birak.
    // Surukleme gereken oyunlarda (dosya/sekil/puzzle) birakma noktasi
    // hedefe yakin secilir ki bot bazen isabet ettirebilsin.
    const x = 20 + Math.random() * 280;
    const y = 40 + Math.random() * 120;
    this.inst.input(bot.id, 'grab', { x: x, y: y });
    this.inst.input(bot.id, 'drag', { x: 250, y: 110 });
    this.inst.input(bot.id, 'drop', { x: 250, y: 110 });
  }

  botTick(dt) {
    if (this.phase !== 'play' || !this.inst || !this.mg) return;
    // Ezber gerektiren oyunlarda (Hafiza Dizisi, Kablo Kesme) bot da ekrani
    // IZLEMEK zorunda: gosterilen sembolleri kacirmamak icin botIzle her
    // karede cagrilir. Hamle ise her zamanki araliklarla yapilir.
    const izleyen = !!this.inst.botIzle;
    let snap = null;

    for (const p of this.room.players) {
      if (!p.bot) continue;
      p.botBekle -= dt;
      const hamleZamani = p.botBekle <= 0;
      if (!izleyen && !hamleZamani) continue;

      if (snap === null) snap = this.inst.snap ? this.inst.snap() : {};
      if (izleyen) this.inst.botIzle(p.id, snap);
      if (!hamleZamani) continue;

      p.botBekle = this.botAraligi(this.mg.controls);
      this.botHamle(p, snap);
    }
  }

  // ---------- ana dongu ----------

  tick(dt) {
    // Biri kopmussa mac DURUR. Yoksa o kisi geri geldiginde turlari kaybetmis
    // olurdu; 3 saniyelik bir wifi takilmasi maci bitirebilirdi.
    // Lobide ve sampiyon ekraninda duraklatmanin anlami yok.
    const kopuk = this.room.players.some((p) => !p.connected);
    const canli = this.phase === 'intro' || this.phase === 'play' || this.phase === 'result';
    if (kopuk && canli) {
      this.dirty = true;
      this.room.broadcast(this.snapshot());
      return;
    }

    switch (this.phase) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) this.startPlay();
        break;

      case 'play':
        this.timer -= dt;
        this.botTick(dt);
        this.inst.update(dt);
        if (this.inst.done() || this.timer <= 0) {
          this.timer = Math.max(0, this.timer);
          this.finishRound();
        }
        break;

      case 'result':
        this.timer -= dt;
        if (this.timer <= 0) this.afterResult();
        break;

      default:
        break; // lobby / gameover: zamanlayici yok
    }

    // Lobi/sampiyon ekraninda saniyede bir tazele: ping gostergesi canli kalsin
    if (this.phase === 'lobby' || this.phase === 'gameover') {
      this.refresh += dt;
      if (this.refresh >= 1) { this.refresh = 0; this.dirty = true; }
    }

    const live = this.phase === 'intro' || this.phase === 'play' || this.phase === 'result';
    if (live || this.dirty) {
      this.room.broadcast(this.snapshot());
      this.dirty = false;
    }
  }

  // Sampiyon ekraninda gosterilecek istatistik satirlari.
  // Sunucu HAZIR liste gonderir, istemci yalnizca cizer - boylece iki tarafta
  // ayni hesabin tekrarlanmasi gerekmez.
  //
  // Her satir yalnizca ANLAMLIYSA listeye girer: tek tur kazanmak "seri"
  // sayilmaz, herkes bir tur kazandiysa "hic kazanamayan" satiri cikmaz.
  istatListesi() {
    const oyuncular = this.room.players;
    if (!oyuncular.length) return null;
    const adi = (id) => {
      const p = oyuncular.find((x) => x.id === id);
      return p ? p.name : '?';
    };
    // Bir olcute gore en iyi olan(lar); esitlik varsa satir atlanir cunku
    // "en cok" demek anlamsizlasir.
    const tekLider = (olc) => {
      let en = -1, kim = null, esit = false;
      for (const p of oyuncular) {
        const d = olc(this.istatOku(p.id));
        if (d > en) { en = d; kim = p.id; esit = false; }
        else if (d === en) esit = true;
      }
      return esit || en <= 0 ? null : { id: kim, deger: en };
    };

    const out = [];

    // Satirlar METIN degil ANAHTAR tasir: ceviriyi istemci yapar, boylece
    // ayni odadaki iki kisi farkli dilde gorebilir (bkz. public/js/dil.js).
    const enCok = tekLider((s) => s.kazanma);
    if (enCok) {
      out.push({ ad: { k: 'istat.enCokTur' }, kim: adi(enCok.id),
        deger: { k: 'istat.tur', p: { n: enCok.deger } } });
    }

    const seri = tekLider((s) => (s.enUzunSeri >= 2 ? s.enUzunSeri : 0));
    if (seri) {
      out.push({ ad: { k: 'istat.enUzunSeri' }, kim: adi(seri.id),
        deger: { k: 'istat.seri', p: { n: seri.deger } } });
    }

    // Favori oyun: bir oyuncunun EN COK kazandigi mini oyun (en az 2 kez)
    let favEn = 1, favId = null, favOyun = null, favEsit = false;
    for (const p of oyuncular) {
      const oy = this.istatOku(p.id).oyunlar;
      for (const gid in oy) {
        if (oy[gid] > favEn) { favEn = oy[gid]; favId = p.id; favOyun = gid; favEsit = false; }
        else if (oy[gid] === favEn && favId && (p.id !== favId || gid !== favOyun)) favEsit = true;
      }
    }
    if (favId && !favEsit) {
      // Oyunun ADI da cevrilecegi icin burada yalnizca id gonderilir;
      // istemci onu kendi dilindeki adla degistirir.
      out.push({
        ad: { k: 'istat.uzmanlik' },
        kim: adi(favId),
        deger: { k: 'istat.uzmanlikDeger', p: { oyun: favOyun, n: favEn } },
      });
    }

    // Hic tur kazanamayanlar (herkes kazandiysa bu satir cikmaz)
    const bosta = oyuncular.filter((p) => this.istatOku(p.id).kazanma === 0);
    if (bosta.length && bosta.length < oyuncular.length) {
      out.push({
        ad: { k: 'istat.hicKazanamadi' },
        kim: bosta.map((p) => p.name).join(', '),
        deger: '',
      });
    }

    const dip = tekLider((s) => (s.sonuncu >= 2 ? s.sonuncu : 0));
    if (dip) {
      out.push({ ad: { k: 'istat.enCokSonuncu' }, kim: adi(dip.id),
        deger: { k: 'istat.tur', p: { n: dip.deger } } });
    }

    return out.length ? out : null;
  }

  snapshot() {
    return {
      t: 'sync',
      code: this.room.code,
      phase: this.phase,
      timer: Math.round(this.timer * 100) / 100,
      players: this.room.playersJSON(),
      mg: this.mg
        ? { id: this.mg.id, name: this.mg.name, instruction: this.mg.instruction, controls: this.mg.controls, dur: Math.round(((this.inst && this.inst.sure) || this.mg.duration) * 10) / 10 }
        : null,
      st: this.inst && this.phase !== 'intro' ? this.inst.snap() : null,
      result: this.result,
      winner: this.winner,
      notice: this.notice,
      // Istatistikler yalnizca sampiyon ekraninda anlamli; her karede
      // hesaplanip bosuna yollanmasin.
      istat: this.phase === 'gameover' ? this.istatListesi() : null,
      final: this.final,                // bu tur puanlar iki katina cikiyor mu
      botZor: this.room.botZorluk,      // 0 kolay, 1 orta, 2 zor
      needed: this.room.winsNeeded,     // lobideki ayar (= hedef puan)
      hedef: this.hedefPuan,            // sampiyonluk icin gereken PUAN
      tur: this.tur,
      seviye: Math.round(this.seviye() * 100) / 100,
      // Kopuk oyuncu varsa: kimi bekledigimiz ve kac saniye kaldigi
      bekle: this.room.players.some((p) => !p.connected)
        ? {
            ad: this.room.players.filter((p) => !p.connected).map((p) => p.name).join(', '),
            sn: this.room.graceLeft(),
          }
        : null,
      host: this.room.hostId,
      acik: this.room.acik,
      needMin: cfg.WINS_MIN,
      needMax: cfg.WINS_MAX,
      max: cfg.MAX_PLAYERS,
      min: cfg.MIN_PLAYERS,
    };
  }
}

module.exports = Game;
