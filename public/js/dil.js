/* DIL - Turkce / Ingilizce
 *
 * TASARIM KARARI: sunucu bitmis METIN degil ANAHTAR gonderir, ceviriyi
 * istemci yapar. Yani ayni odadaki iki kisi farkli dilde oynayabilir -
 * biri Turkce, digeri Ingilizce gorur. Sunucu bitmis metin gonderseydi
 * odadaki herkes tek bir dile mahkum olurdu; uzaktan oynama bu oyunun
 * ozelligi oldugu icin bu dogru takas degil.
 *
 * Sunucudan gelen sonuc yazilari { k: 'anahtar', p: { ...degerler } }
 * seklinde gelir; buradaki t() onu istenen dilde metne cevirir.
 *
 * Secim localStorage'da saklanir. Ilk acilista tarayicinin dili bakilir:
 * Turkce degilse Ingilizce ile baslar.
 */
(function (PP) {
  'use strict';

  var SOZLUK = {
    tr: {
      // ---- menu / genel ----
      'menu.hizli': 'HIZLI OYNA',
      'menu.veya': 'VEYA ARKADAŞINLA',
      'menu.odaKur': 'ODA KUR',
      'menu.katil': 'KATIL',
      'menu.adin': 'ADIN',
      'menu.kod': 'KOD',
      'menu.bosluk': 'BOŞLUK',
      'menu.yonTuslari': 'YÖN TUŞLARI',
      'ust.tamEkran': 'TAM EKRAN',
      'ust.cik': '← ÇIK',
      'ust.sesAc': 'Sesi aç',
      'ust.sesKapat': 'Sesi kapat',
      'ust.sesAcik': 'Ses açık',
      'ust.sesKapali': 'Ses kapalı',
      'ust.dil': 'DİL',
      'sohbet.baslik': 'Sohbet',
      'sohbet.yaz': 'Mesaj yaz...',
      'sohbet.mesaj': 'Mesaj',
      'sohbet.gonder': 'GÖNDER',
      'sohbet.bos': 'BOŞ MESAJ GÖNDERİLEMEZ',
      'sohbet.gitmedi': 'MESAJ GÖNDERİLEMEDİ',
      'sohbet.hizli': 'ÇOK HIZLI YAZIYORSUN, BİR AN BEKLE',
      'cevir.ipucu': 'TELEFONU YAN ÇEVİR — OYUN 3 KAT BÜYÜR',
      'pad.bas': 'BAS',

      // ---- lobi ----
      'lobi.oyun': 'OYUN',
      'lobi.hazir': 'HAZIR',
      'lobi.hazirIptal': 'HAZIR (İPTAL)',
      'lobi.enAzKisi': 'EN AZ {n} KİŞİ',
      'lobi.hedef': 'HEDEF: {n} PUAN',
      'lobi.bot': 'BOT: {n}',
      'lobi.kod': 'KOD : {kod}',
      'lobi.kopyalandi': 'KOPYALANDI',
      'lobi.rakipAraniyor': 'RAKİP ARANIYOR',
      'lobi.cik': 'ÇIK',
      'lobi.eminMisin': 'EMİN MİSİN?',
      'zorluk.kolay': 'KOLAY',
      'zorluk.orta': 'ORTA',
      'zorluk.zor': 'ZOR',

      // ---- mac akisi ----
      'mac.tur': 'TUR {n}',
      'mac.hiz': 'HIZ +%{n}',
      'mac.finalTuru': 'FİNAL TURU - PUANLAR X2',
      'mac.berabere': 'BERABERE!',
      'mac.kazandi': '{ad} KAZANDI!',
      'mac.kazandiEk': 'KAZANDI!',
      'mac.durduSn': 'MAÇ DURDU - {n} SANİYE BEKLENİYOR',
      'ag.kisiKoptu': '{ad} KOPTU',
      'mac.sampiyon': 'ŞAMPİYON',
      'mac.tekrarBas': 'TEKRAR OYNAMAK İÇİN BAS',
      'mac.durdu': 'MAÇ DURDU - {ad}',
      'ag.baglaniyor': 'BAĞLANIYOR',
      'ag.koptu': 'BAĞLANTI KOPTU',
      'ag.yok': 'BAĞLANTI YOK... {n} SN',
      'ag.geriBaglaniyor': 'GERİ BAĞLANIYOR',
      'ag.yerTutuluyor': 'GERİ BAĞLANIYOR - YERİN TUTULUYOR',
      'ag.donulemedi': 'ODAYA DÖNÜLEMEDİ',
      'ag.hata': 'HATA',

      // ---- istatistikler ----
      'istat.enCokTur': 'EN ÇOK TUR KAZANAN',
      'istat.tur': '{n} TUR',
      'istat.enUzunSeri': 'EN UZUN SERİ',
      'istat.seri': '{n} TUR ÜST ÜSTE',
      'istat.uzmanlik': 'UZMANLIK ALANI',
      'istat.uzmanlikDeger': '{oyun} x{n}',
      'istat.hicKazanamadi': 'HİÇ TUR KAZANAMADI',
      'istat.enCokSonuncu': 'EN ÇOK SONUNCU',

      // ---- mini oyun adlari ----
      'oyun.race.ad': 'AT YARIŞI',
      'oyun.race.emir': 'BAS BAS! KOŞ!',
      'oyun.reflex.ad': 'REFLEKS DÜELLOSU',
      'oyun.reflex.emir': 'İŞARETİ BEKLE!',
      'oyun.dodge.ad': 'ENGELDEN KAÇ',
      'oyun.dodge.emir': 'ŞERİT DEĞİŞTİR!',
      'oyun.memory.ad': 'HAFIZA DİZİSİ',
      'oyun.memory.emir': 'DİZİYİ EZBERLE!',
      'oyun.mole.ad': 'KÖSTEBEK AVI',
      'oyun.mole.emir': 'KÖSTEBEKLERE VUR!',
      'oyun.hotpotato.ad': 'SICAK PATATES',
      'oyun.hotpotato.emir': 'BOMBAYI ELDEN ÇIKAR!',
      'oyun.filedelete.ad': 'DOSYA SİLME',
      'oyun.filedelete.emir': 'DOSYALARI ÇÖPE AT!',
      'oyun.wirecut.ad': 'KABLO KESME',
      'oyun.wirecut.emir': 'KIVILCIMI BANTTA KES!',
      'oyun.shapesort.ad': 'ŞEKİL YERLEŞTİR',
      'oyun.shapesort.emir': 'ŞEKİLLERİ YERİNE KOY!',
      'oyun.puzzle.ad': 'PUZZLE',
      'oyun.puzzle.emir': 'EKSİK PARÇALARI TAK!',
      'oyun.floor.ad': 'ZEMİN ÇÖKÜYOR',
      'oyun.floor.emir': 'ÇÖKEN KARELERDEN KAÇ!',
      'oyun.collect.ad': 'DÜŞENLERİ YAKALA',
      'oyun.collect.emir': 'YILDIZLARI TOPLA!',
      'oyun.tersemir.ad': 'TERS EMİR',
      'oyun.tersemir.emir': 'KIRMIZIYSA TERSİNE BAS!',

      // ---- oyun ici yazilar ----
      'ic.collect.uyari': 'BOMBAYA DOKUNMA!',
      'ic.dodge.bitti': 'BİTTİ',
      'ic.dodge.ipucu': 'SOL / SAĞ = ŞERİT DEĞİŞTİR',
      'ic.filedelete.cop': 'ÇÖP',
      'ic.filedelete.ipucu': 'SÜRÜKLE VE ÇÖPE BIRAK',
      'ic.floor.dustu': 'DÜŞTÜ',
      'ic.floor.ipucu': 'YÖN TUŞLARI = KAÇ',
      'ic.hotpotato.buum': 'BUUM!',
      'ic.hotpotato.sende': 'BOMBA SENDE!',
      'ic.hotpotato.bomba': 'BOMBA:',
      'ic.hotpotato.elendi': 'ELENDİ',
      'ic.hotpotato.basKurtul': 'BAS VE KURTUL!',
      'ic.hotpotato.bekle': 'BEKLE...',
      'ic.memory.ezberle': 'EZBERLE',
      'ic.memory.siraSende': 'SIRA SENDE!',
      'ic.memory.yanlis': 'YANLIŞ!',
      'ic.memory.yonTuslari': 'YÖN TUŞLARI',
      'ic.mole.uyari': 'BOMBAYA VURMA!',
      'ic.puzzle.yukleniyor': 'RESİM YÜKLENİYOR...',
      'ic.race.bitti': 'BİTTİ!',
      'ic.race.ipucu': 'BAS BAS! KOŞ!',
      'ic.reflex.erken': 'ERKEN BASTIN!',
      'ic.reflex.yandin': 'BU TUR YANDIN',
      'ic.reflex.rakibiBekle': 'RAKİBİ BEKLE',
      'ic.reflex.izle': 'RAKİBİNİ İZLE...',
      'ic.reflex.isaretBekle': 'İŞARETİ BEKLİYOR...',
      'ic.reflex.bas': 'BAS!',
      'ic.reflex.bekle': 'BEKLE',
      'ic.reflex.erkenYanar': 'ERKEN BASAN YANAR!',
      'ic.reflex.yandi': 'YANDI!',
      'ic.reflex.ms': '{n} MS',
      // Ters Emir'in yon kelimeleri: oyunun okunacak emri bunlar
      'yon.left': 'SOL',
      'yon.right': 'SAĞ',
      'yon.up': 'YUKARI',
      'yon.down': 'AŞAĞI',
      'ic.tersemir.ters': 'TERS!',
      'ic.tersemir.hazirOl': 'HAZIR OL',
      'ic.tersemir.kural': 'KIRMIZI = TERSİNE BAS',
      'ic.wirecut.sikisti': 'MAKAS SIKIŞTI!',
      'ic.wirecut.simdiKes': 'ŞİMDİ KES!',
      'ic.wirecut.banttaKes': 'BANTTA KES',

      // ---- tur sonu yazilari (sunucudan anahtar olarak gelir) ----
      'sonuc.berabere': 'TAM BERABERE!',
      'sonuc.race.sure': '{n} SANİYE!',
      'sonuc.race.onde': 'ÖNDE BİTİRDİ!',
      'sonuc.race.foto': 'FOTO BİTİŞ! BERABERE',
      'sonuc.reflex.ms': '{n} MS',
      'sonuc.reflex.hepsiErken': 'HEPSİ ERKEN BASTI!',
      'sonuc.reflex.kimseBasamadi': 'KİMSE BASAMADI!',
      'sonuc.reflex.ayniAnda': 'TAM AYNI ANDA!',
      'sonuc.dodge.tekAyakta': 'TEK AYAKTA KALAN!',
      'sonuc.dodge.hepsiSag': 'HEPSİ SAĞ KALDI!',
      'sonuc.dodge.ayniAnda': 'AYNI ANDA GİTTİLER!',
      'sonuc.dodge.uzunKostu': 'DAHA UZUN KOŞTU!',
      'sonuc.memory.canavar': 'HAFIZA CANAVARI!',
      'sonuc.memory.enCok': 'EN ÇOK İLERLEYEN!',
      'sonuc.memory.hepsiSasirdi': 'HEPSİ ŞAŞIRDI!',
      'sonuc.memory.kimseBitiremedi': 'KİMSE BİTİREMEDİ!',
      'sonuc.mole.skor': '{n} KÖSTEBEK!',
      'sonuc.hotpotato.patlamadi': 'BOMBA PATLAMADI!',
      'sonuc.hotpotato.sonKurtulan': 'SON KURTULAN!',
      'sonuc.hotpotato.ayakta': 'AYAKTA KALANLAR!',
      'sonuc.filedelete.hepsi': 'HEPSİNİ SİLDİ!',
      'sonuc.filedelete.kismi': '{n} / {t} DOSYA',
      'sonuc.wirecut.kimse': 'KİMSE KESEMEDİ!',
      'sonuc.wirecut.skor': '{n} / {t} KABLO',
      'sonuc.wirecut.skorSikisma': '{n} / {t} KABLO ({s} SIKIŞMA)',
      'sonuc.shapesort.hepsi': 'HEPSİNİ TAKTI!',
      'sonuc.shapesort.kismi': '{n} / {t} ŞEKİL',
      'sonuc.puzzle.hepsi': 'PUZZLE TAMAM!',
      'sonuc.puzzle.kismi': '{n} / {t} PARÇA',
      'sonuc.floor.ayakta': 'AYAKTA KALAN!',
      'sonuc.floor.enGec': 'EN GEÇ DÜŞEN!',
      'sonuc.floor.hepsiAyakta': 'HEPSİ AYAKTA KALDI!',
      'sonuc.floor.ayniAnda': 'AYNI ANDA DÜŞTÜLER!',
      'sonuc.collect.kimse': 'KİMSE TOPLAYAMADI!',
      'sonuc.collect.skor': '{n} YILDIZ!',
      'sonuc.collect.skorBomba': '{n} YILDIZ! ({b} BOMBA)',
      'sonuc.tersemir.kimse': 'KİMSE ŞAŞIRTAMADI!',
      'sonuc.tersemir.skor': '{n}/{t} DOĞRU!',
      'sonuc.tersemir.skorYanlis': '{n}/{t} DOĞRU! ({y} YANLIŞ)'
    },

    en: {
      'menu.hizli': 'QUICK PLAY',
      'menu.veya': 'OR WITH FRIENDS',
      'menu.odaKur': 'CREATE ROOM',
      'menu.katil': 'JOIN',
      'menu.adin': 'NAME',
      'menu.kod': 'CODE',
      'menu.bosluk': 'SPACE',
      'menu.yonTuslari': 'ARROW KEYS',
      'ust.tamEkran': 'FULLSCREEN',
      'ust.cik': '← LEAVE',
      'ust.sesAc': 'Unmute',
      'ust.sesKapat': 'Mute',
      'ust.sesAcik': 'Sound on',
      'ust.sesKapali': 'Sound off',
      'ust.dil': 'LANG',
      'sohbet.baslik': 'Chat',
      'sohbet.yaz': 'Type a message...',
      'sohbet.mesaj': 'Message',
      'sohbet.gonder': 'SEND',
      'sohbet.bos': 'CANNOT SEND EMPTY MESSAGE',
      'sohbet.gitmedi': 'MESSAGE NOT SENT',
      'sohbet.hizli': 'SLOW DOWN, WAIT A MOMENT',
      'cevir.ipucu': 'TURN YOUR PHONE SIDEWAYS — 3X BIGGER',
      'pad.bas': 'TAP',

      'lobi.oyun': 'GAME',
      'lobi.hazir': 'READY',
      'lobi.hazirIptal': 'READY (CANCEL)',
      'lobi.enAzKisi': 'NEED {n} PLAYERS',
      'lobi.hedef': 'TARGET: {n} POINTS',
      'lobi.bot': 'BOTS: {n}',
      'lobi.kod': 'CODE : {kod}',
      'lobi.kopyalandi': 'COPIED',
      'lobi.rakipAraniyor': 'LOOKING FOR PLAYERS',
      'lobi.cik': 'LEAVE',
      'lobi.eminMisin': 'ARE YOU SURE?',
      'zorluk.kolay': 'EASY',
      'zorluk.orta': 'NORMAL',
      'zorluk.zor': 'HARD',

      'mac.tur': 'ROUND {n}',
      'mac.hiz': 'SPEED +{n}%',
      'mac.finalTuru': 'FINAL ROUND - DOUBLE POINTS',
      'mac.berabere': 'DRAW!',
      'mac.kazandi': '{ad} WINS!',
      'mac.kazandiEk': 'WINS!',
      'mac.durduSn': 'MATCH PAUSED - WAITING {n} S',
      'ag.kisiKoptu': '{ad} DISCONNECTED',
      'mac.sampiyon': 'CHAMPION',
      'mac.tekrarBas': 'PRESS TO PLAY AGAIN',
      'mac.durdu': 'MATCH PAUSED - {ad}',
      'ag.baglaniyor': 'CONNECTING',
      'ag.koptu': 'CONNECTION LOST',
      'ag.yok': 'NO CONNECTION... {n} S',
      'ag.geriBaglaniyor': 'RECONNECTING',
      'ag.yerTutuluyor': 'RECONNECTING - YOUR SEAT IS HELD',
      'ag.donulemedi': 'COULD NOT REJOIN ROOM',
      'ag.hata': 'ERROR',

      'istat.enCokTur': 'MOST ROUNDS WON',
      'istat.tur': '{n} ROUNDS',
      'istat.enUzunSeri': 'LONGEST STREAK',
      'istat.seri': '{n} IN A ROW',
      'istat.uzmanlik': 'SPECIALITY',
      'istat.uzmanlikDeger': '{oyun} x{n}',
      'istat.hicKazanamadi': 'WON NO ROUNDS',
      'istat.enCokSonuncu': 'MOST LAST PLACES',

      'oyun.race.ad': 'HORSE RACE',
      'oyun.race.emir': 'TAP TAP! RUN!',
      'oyun.reflex.ad': 'REFLEX DUEL',
      'oyun.reflex.emir': 'WAIT FOR THE SIGNAL!',
      'oyun.dodge.ad': 'DODGE THE WALLS',
      'oyun.dodge.emir': 'SWITCH LANES!',
      'oyun.memory.ad': 'MEMORY SEQUENCE',
      'oyun.memory.emir': 'MEMORISE THE ORDER!',
      'oyun.mole.ad': 'WHACK-A-MOLE',
      'oyun.mole.emir': 'HIT THE MOLES!',
      'oyun.hotpotato.ad': 'HOT POTATO',
      'oyun.hotpotato.emir': 'PASS THE BOMB!',
      'oyun.filedelete.ad': 'FILE CLEANUP',
      'oyun.filedelete.emir': 'DRAG FILES TO THE BIN!',
      'oyun.wirecut.ad': 'WIRE CUTTER',
      'oyun.wirecut.emir': 'CUT WHEN THE SPARK IS IN THE BAND!',
      'oyun.shapesort.ad': 'SHAPE SORTER',
      'oyun.shapesort.emir': 'PUT SHAPES IN THEIR HOLES!',
      'oyun.puzzle.ad': 'JIGSAW',
      'oyun.puzzle.emir': 'FILL THE MISSING PIECES!',
      'oyun.floor.ad': 'FLOOR IS FALLING',
      'oyun.floor.emir': 'ESCAPE THE FALLING TILES!',
      'oyun.collect.ad': 'CATCH THE FALLING',
      'oyun.collect.emir': 'COLLECT THE STARS!',
      'oyun.tersemir.ad': 'REVERSE ORDER',
      'oyun.tersemir.emir': 'IF RED, DO THE OPPOSITE!',

      'ic.collect.uyari': "DON'T TOUCH THE BOMBS!",
      'ic.dodge.bitti': 'OUT',
      'ic.dodge.ipucu': 'LEFT / RIGHT = SWITCH LANE',
      'ic.filedelete.cop': 'BIN',
      'ic.filedelete.ipucu': 'DRAG AND DROP IN THE BIN',
      'ic.floor.dustu': 'FELL',
      'ic.floor.ipucu': 'ARROW KEYS = ESCAPE',
      'ic.hotpotato.buum': 'BOOM!',
      'ic.hotpotato.sende': 'YOU HAVE THE BOMB!',
      'ic.hotpotato.bomba': 'BOMB:',
      'ic.hotpotato.elendi': 'OUT',
      'ic.hotpotato.basKurtul': 'TAP TO PASS!',
      'ic.hotpotato.bekle': 'WAIT...',
      'ic.memory.ezberle': 'MEMORISE',
      'ic.memory.siraSende': 'YOUR TURN!',
      'ic.memory.yanlis': 'WRONG!',
      'ic.memory.yonTuslari': 'ARROW KEYS',
      'ic.mole.uyari': "DON'T HIT THE BOMBS!",
      'ic.puzzle.yukleniyor': 'LOADING IMAGE...',
      'ic.race.bitti': 'DONE!',
      'ic.race.ipucu': 'TAP TAP! RUN!',
      'ic.reflex.erken': 'TOO EARLY!',
      'ic.reflex.yandin': 'YOU ARE OUT THIS ROUND',
      'ic.reflex.rakibiBekle': 'WAIT FOR OTHERS',
      'ic.reflex.izle': 'WATCHING THE OTHERS...',
      'ic.reflex.isaretBekle': 'WAITING FOR THE SIGNAL...',
      'ic.reflex.bas': 'TAP!',
      'ic.reflex.bekle': 'WAIT',
      'ic.reflex.erkenYanar': 'TAP TOO EARLY AND YOU ARE OUT!',
      'ic.reflex.yandi': 'OUT!',
      'ic.reflex.ms': '{n} MS',
      'yon.left': 'LEFT',
      'yon.right': 'RIGHT',
      'yon.up': 'UP',
      'yon.down': 'DOWN',
      'ic.tersemir.ters': 'REVERSE!',
      'ic.tersemir.hazirOl': 'GET READY',
      'ic.tersemir.kural': 'RED = DO THE OPPOSITE',
      'ic.wirecut.sikisti': 'SCISSORS JAMMED!',
      'ic.wirecut.simdiKes': 'CUT NOW!',
      'ic.wirecut.banttaKes': 'CUT IN THE BAND',

      'sonuc.berabere': 'PERFECT TIE!',
      'sonuc.race.sure': '{n} SECONDS!',
      'sonuc.race.onde': 'FINISHED AHEAD!',
      'sonuc.race.foto': 'PHOTO FINISH! TIE',
      'sonuc.reflex.ms': '{n} MS',
      'sonuc.reflex.hepsiErken': 'EVERYONE JUMPED THE GUN!',
      'sonuc.reflex.kimseBasamadi': 'NOBODY TAPPED!',
      'sonuc.reflex.ayniAnda': 'EXACTLY THE SAME MOMENT!',
      'sonuc.dodge.tekAyakta': 'LAST ONE STANDING!',
      'sonuc.dodge.hepsiSag': 'EVERYONE SURVIVED!',
      'sonuc.dodge.ayniAnda': 'THEY WENT TOGETHER!',
      'sonuc.dodge.uzunKostu': 'RAN THE LONGEST!',
      'sonuc.memory.canavar': 'MEMORY MONSTER!',
      'sonuc.memory.enCok': 'GOT THE FURTHEST!',
      'sonuc.memory.hepsiSasirdi': 'EVERYONE SLIPPED UP!',
      'sonuc.memory.kimseBitiremedi': 'NOBODY FINISHED!',
      'sonuc.mole.skor': '{n} MOLES!',
      'sonuc.hotpotato.patlamadi': 'THE BOMB NEVER WENT OFF!',
      'sonuc.hotpotato.sonKurtulan': 'LAST SURVIVOR!',
      'sonuc.hotpotato.ayakta': 'SURVIVORS!',
      'sonuc.filedelete.hepsi': 'DELETED THEM ALL!',
      'sonuc.filedelete.kismi': '{n} / {t} FILES',
      'sonuc.wirecut.kimse': 'NOBODY CUT A WIRE!',
      'sonuc.wirecut.skor': '{n} / {t} WIRES',
      'sonuc.wirecut.skorSikisma': '{n} / {t} WIRES ({s} JAMS)',
      'sonuc.shapesort.hepsi': 'ALL SHAPES IN!',
      'sonuc.shapesort.kismi': '{n} / {t} SHAPES',
      'sonuc.puzzle.hepsi': 'JIGSAW COMPLETE!',
      'sonuc.puzzle.kismi': '{n} / {t} PIECES',
      'sonuc.floor.ayakta': 'STILL STANDING!',
      'sonuc.floor.enGec': 'FELL LAST!',
      'sonuc.floor.hepsiAyakta': 'EVERYONE SURVIVED!',
      'sonuc.floor.ayniAnda': 'THEY ALL FELL TOGETHER!',
      'sonuc.collect.kimse': 'NOBODY COLLECTED!',
      'sonuc.collect.skor': '{n} STARS!',
      'sonuc.collect.skorBomba': '{n} STARS! ({b} BOMBS)',
      'sonuc.tersemir.kimse': 'NOBODY GOT TRICKED!',
      'sonuc.tersemir.skor': '{n}/{t} CORRECT!',
      'sonuc.tersemir.skorYanlis': '{n}/{t} CORRECT! ({y} WRONG)'
    }
  };

  var DILLER = ['tr', 'en'];
  var ANAHTAR = 'pp_dil';
  var secili = 'tr';

  function baslangic() {
    try {
      var kayitli = localStorage.getItem(ANAHTAR);
      if (kayitli && SOZLUK[kayitli]) return kayitli;
    } catch (e) { /* gizli sekmede localStorage patlayabilir */ }
    // Kayit yoksa tarayicinin diline bak: Turkce degilse Ingilizce basla
    var tarayici = (navigator.language || 'tr').toLowerCase();
    return tarayici.indexOf('tr') === 0 ? 'tr' : 'en';
  }
  secili = baslangic();

  // {n} gibi yer tutucularini doldurur
  function doldur(kalip, p) {
    if (!p) return kalip;
    return kalip.replace(/\{(\w+)\}/g, function (tam, ad) {
      return p[ad] !== undefined ? String(p[ad]) : tam;
    });
  }

  /**
   * t(anahtar, degerler) -> secili dilde metin
   * t({ k: 'anahtar', p: {...} }) -> sunucudan gelen sonuc yazisi icin
   *
   * Anahtar bulunamazsa once Turkceye, o da yoksa anahtarin kendisine
   * duser: eksik ceviri ekrani bos birakmaz, gozle de fark edilir.
   */
  function t(anahtar, degerler) {
    if (anahtar && typeof anahtar === 'object') {
      degerler = anahtar.p;
      anahtar = anahtar.k;
    }
    if (!anahtar) return '';
    var kalip = SOZLUK[secili][anahtar];
    if (kalip === undefined) kalip = SOZLUK.tr[anahtar];
    if (kalip === undefined) return anahtar;
    return doldur(kalip, degerler);
  }

  PP.dil = {
    t: t,
    diller: DILLER,
    get kod() { return secili; },
    sec: function (kod) {
      if (!SOZLUK[kod] || kod === secili) return false;
      secili = kod;
      try { localStorage.setItem(ANAHTAR, kod); } catch (e) { /* yoksay */ }
      document.documentElement.setAttribute('lang', kod);
      // HTML'deki sabit yazilar da guncellensin
      PP.dil.htmlTazele();
      return true;
    },
    // data-dil="anahtar" tasiyan ogeleri doldurur.
    // data-dil-ph / data-dil-al: placeholder ve aria-label icin.
    htmlTazele: function () {
      var d = document.querySelectorAll('[data-dil]');
      for (var i = 0; i < d.length; i++) d[i].textContent = t(d[i].getAttribute('data-dil'));
      var ph = document.querySelectorAll('[data-dil-ph]');
      for (var j = 0; j < ph.length; j++) ph[j].placeholder = t(ph[j].getAttribute('data-dil-ph'));
      var al = document.querySelectorAll('[data-dil-al]');
      for (var k = 0; k < al.length; k++) al[k].setAttribute('aria-label', t(al[k].getAttribute('data-dil-al')));
    },
    // Test/gelistirme kolayligi: iki sozlukte de ayni anahtarlar var mi?
    eksikler: function () {
      var eks = [];
      for (var a in SOZLUK.tr) if (SOZLUK.en[a] === undefined) eks.push('en eksik: ' + a);
      for (var b in SOZLUK.en) if (SOZLUK.tr[b] === undefined) eks.push('tr eksik: ' + b);
      return eks;
    }
  };
})(window.PP = window.PP || {});
