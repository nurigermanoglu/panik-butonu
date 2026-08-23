# PARTİ PANİK

Tarayıcıdan oynanan, **2-4 kişilik**, pixel-art mini oyun düellosu (WarioWare / Party Panic tarzı).
Arka arkaya gelen kısa mini oyunlar; her turu kazanan puan alır, **5 tur kazanan şampiyon** olur.

---

## Nasıl çalıştırılır

Bilgisayarda Node.js kurulu olmalı (kurulu: v24).

```bash
node server/index.js
```

Sunucu açıldığında ekrana iki adres yazar:

- `http://localhost:3000` — bu bilgisayardan oynamak için
- `http://192.168.x.x:3000` — **aynı Wi-Fi'daki telefon/başka bilgisayar** için

İki yol var:

- **HIZLI OYNA** — rastgele biriyle eşleşirsin. Bekleyen açık bir oda varsa oraya girersin,
  yoksa senin adına açık bir oda kurulur ve gelen ilk kişiyle eşleşirsin (odaya 4 kişiye kadar
  yabancı katılabilir). Lobide "HERKESE AÇIK - RAKİP ARANIYOR" yazar.
- **ODA KUR** — özel oda. Sadece 4 harfli kodu (veya linki) verdiğin kişiler girebilir,
  hızlı eşleşme havuzuna **girmez**. Diğerleri **KATIL** ile kodu yazar.

Her iki durumda da odadaki herkes **HAZIRIM** deyince oyun başlar.

Windows'ta klasördeki **BASLAT.bat** dosyasına çift tıklamak da yeterli.

## Kontroller

| Ne zaman | Bilgisayar | Telefon |
|---|---|---|
| Hazır ol (lobide) | `BOŞLUK` / `ENTER` ya da ekrandaki **HAZIRIM** butonu | **HAZIRIM** butonu veya alttaki **BAS** |
| Tekrar oyna (şampiyon ekranında) | `BOŞLUK` veya `ENTER` | Ekrana dokun ya da **BAS** |
| Hedef tur sayısını değiştir (lobide, **sadece odayı kuran**) | `←` `→` | Yanlardaki ok butonları |
| Karakter değiştir (lobide, herkes kendi karakterini) | Karakterinin yanındaki oklara **tıkla** | Oklara **dokun** |
| At Yarışı, Refleks Düellosu, Sıcak Patates | `BOŞLUK` / `ENTER` ya da **ekrana sol tıkla** | Büyük **BAS** butonu ya da ekrana dokun |
| Engelden Kaç, Düşenleri Yakala | `←` `→` şerit değiştir (veya `A` `D`) | Sol / sağ butonu |
| Hafıza Dizisi, Zemin Çöküyor | Yön tuşları veya `W` `A` `S` `D` | 4 yön butonu |
| Sıcak Patates | `BOŞLUK` | Büyük **BAS** butonu |
| Köstebek Avı, Kablo Kesme | Fareyle **tıkla** | Ekrana **dokun** |
| Dosya Silme, Şekil Yerleştir, Puzzle | Fareyle tut-**sürükle**-bırak | Parmakla tut-**sürükle**-bırak |

Ekranın altındaki butonlar **sadece dokunmatik cihazlarda** görünür ve o anki mini oyuna göre
kendiliğinden değişir. Fare + klavyesi olan bilgisayarlarda gizlenir (klavye ve fare zaten yeter),
böylece oyun ekranı daha büyük olur.
**Lobide yön tuşlarının / WASD'nin bir işlevi yoktur** — orada yapılacak tek şey hazır olmak,
o da boşluk tuşu (veya ekrana dokunma) ile olur.

### Odadan çıkmak

Üst çubuktaki kırmızı **← ÇIK** butonu ana menüye döndürür. Yanlışlıkla
`ODA KUR`a basıp `HIZLI OYNA` yerine yanlış odaya düşersen buradan çıkarsın.

- Lobide ve şampiyon ekranında tek dokunuş yeter.
- **Maç ortasındaysan iki kez** basman gerekir (buton önce `EMİN MİSİN?` diye sorar),
  böylece oynarken yanlışlıkla basıp maçtan düşmezsin.

Çıkmak koptun sayılmaz: yerin tutulmaz, diğerleri seni beklemez, oda hemen
lobiye döner ve `ADIN AYRILDI` yazar.

## Mini oyunlar

| Oyun | Süre | Amaç |
|---|---|---|
| **At Yarışı** | 8 sn | Tuşa bastıkça kulvarında koşarsın; bitiş çizgisine ilk varan kazanır |
| **Refleks Düellosu** | ~10 sn | Ekran yeşile dönünce en hızlı tepki veren kazanır. İşaret gelmeden basarsan **o tur yanarsın** ve tuşun geri kalanında işlemez — ekranda "ERKEN BASTIN! / BU TUR YANDIN" yazar. Kazanan, tuşu sunucuya ilk ulaşan değil, gerçekten en hızlı tepki verendir (bkz. aşağıda "adalet") |
| **Engelden Kaç** | 14 sn | Subway Surfers tarzı 3 şeritli koşu: **sol/sağ** ile şerit değiştir. Zıplama yok — her engel tam bir duvar, tek kurtuluş doğru şeride geçmek. Herkes birebir aynı deseni oynar ve desen her zaman geçilebilir üretilir. Kazanan: hayatta kalan → daha uzun koşan |
| **Hafıza Dizisi** | 14 sn | Gösterilen ok dizisini ilk doğru tekrarlayan kazanır |
| **Sıcak Patates** | ~30 sn | Bomba rastgele birinde başlar, tuşa basınca rastgele başkasına geçer. Fitil el değiştirse de yanmaya devam eder; patladığında elinde tutan elenir. Tek kişi kalana kadar sürer |
| **Köstebek Avı** | 13 sn | 7 toprak deliği (3 üst + 4 alt), deliklerden çıkan köstebeklere çekiçle vur (+1). Bombaya vurursan -2. Aynı delikten üst üste köstebek çıkmaz (bir delik boşaldıktan sonra en az 1 sn dinlenir). Köstebek ve bomba gerçek resim. Köstebeğe vurunca kısa süre sersemlemiş hâli (`img/kostebek_vur.png`) görünüp kaybolur |
| **Dosya Silme** | 12 sn | Eski bir bilgisayar masaüstünde 7 klasörü çöp kutusuna sürükle. Hepsini en hızlı silen kazanır |
| **Kablo Kesme** | ~13.6 sn | İki aşamalı: önce renkler tek tek gösterilir (kablolar henüz yok), sonra kablolar açılır ve sırayı **ezberden** kesmen gerekir — sıra bir daha gösterilmez. Yanlış kabloya dokunursan makas 1.2 saniye sıkışır **ve sıra başa sarar**: kesilen kablolar onarılır, baştan başlarsın. Sırayı ilk bitiren kazanır; kimse bitiremezse **en çok ilerleyebilen** kazanır |
| **Şekil Yerleştir** | 14 sn | Ahşap oyuncak: 5 ahşap bloğu (kare, üçgen, daire, artı, yıldız) tahtadaki kendi deliklerine sürükle. Yanlış deliğe bırakırsan blok yerine döner |
| **Düşenleri Yakala** | 13 sn | Herkes aynı sahada, 5 şeritte: yukarıdan düşen yıldızları topla (+1), bombalardan kaç (-2). **Sol/sağ** ile şerit değiştir. Bir eşyayı o şeritteki herkes alır. Aynı anda en fazla 2 eşya düşer, yani bombadan kaçacak yer hep vardır |
| **Zemin Çöküyor** | 14 sn | **Herkes aynı** 6x6 ızgarada oynar: kareler tek tek çöker (önce yanıp söner, sonra kaybolur), yön tuşlarıyla kaçıp ayakta kalırsın. Aynı kareye birden fazla oyuncu girebilir — kimse kimseyi engellemez. Desen **her zaman kaçılabilir** üretilir. Son ayakta kalan kazanır; herkes düşerse en geç düşen |
| **Puzzle** | 14 sn | Elma resminin 4x4 ızgarasındaki eksik 3 karesini sağdaki parçalardan bulup doğru yuvaya sürükle. İki resim **sırayla** gelir (torba yöntemi), yani her ikisi de düzenli olarak çıkar |

Toplam **12 mini oyun**. Her turda "torba" yönteminden biri gelir: hepsi tekrar etmeden birer kez
oynanır, sonra torba yenilenir.

> Halka Geçirme, Şişe Vurma ve Buton Yağmuru oyunları çıkarıldı ve kodları
> silindi. Geri isteyen olursa git geçmişinden alınabilir.

---

## Ayarlar

Her şey [server/config.js](server/config.js) içinde:

```js
MAX_PLAYERS: 4,     // odaya en fazla kaç kişi (2 yaparsan tekrar ikili düello olur)
MIN_PLAYERS: 2,     // oyunun başlayabilmesi için gereken en az kişi
WINS_NEEDED: 5,     // başlangıç hedefi; kişi sayısıyla çarpılır (4 kişide 15 puan)
WINS_MIN: 1,        // hedefin inebileceği en düşük değer
WINS_MAX: 9,        // hedefin çıkabileceği en yüksek değer
RECONNECT_GRACE: 15, // maç ortasında kopan oyuncunun yeri kaç saniye tutulur
LOBBY_GRACE: 8,      // lobide kopan için aynısı (beklemenin anlamı yok, kısa)
SPEED_ROUNDS: 10,    // kaçıncı turda oyunlar en hızlı hâline gelir
PORT: 3000,
```

### Karakter seçimi

Lobide her oyuncunun **kendi karakterinin yanında `◀` `▶` okları** çıkar; onlara tıklayarak
(telefonda dokunarak) 8 karakter arasında geçiş yapılır. Oklar sadece **kendi** karakterinin
yanında görünür, başkasınınkini değiştiremezsin.

> Lobide ekranın boş bir yerine basmak hiçbir şey yapmaz — hazır olmak için
> **HAZIRIM** butonuna basmak gerekir. Böylece yanlışlıkla hazır verilmez.

Karakterler: EJDER · KRAL · ÜÇGEN · YILDIZ · BAKLAVA · HAYALET · PEMBE · MANTAR
(hepsi tek bir sayfadan geliyor: `public/img/karakterler.png`)

**İki oyuncu aynı karakteri alamaz:** odaya giren boştaki ilk karakteri alır, oklarla gezerken
başkasının seçtiği karakterler atlanır. Seçilen karakter
lobide, mini oyunlarda, tur sonucunda ve şampiyon ekranında kullanılır. Elenen/ölen oyuncunun
karakteri soluk çizilir.

Yeni karakter eklemek için `public/js/chars.js` içindeki `KUTU` listesine sayfadaki kutusunu
ekle ve `server/config.js` içindeki `CHAR_COUNT` değerini artır.

### Puanlama (derece puanı)

Her turun sonunda **sadece kazanan değil, herkes derecesine göre puan alır**. `n` kişilik
bir turda önünde `k` kişi olan oyuncu `n-1-k` puan kazanır:

| Sıra | 2 kişi | 3 kişi | 4 kişi |
|---|---|---|---|
| 1. | 1 | 2 | 3 |
| 2. | 0 | 1 | 2 |
| 3. | — | 0 | 1 |
| 4. | — | — | 0 |

Eşit derecedekiler aynı puanı paylaşır. **Herkes eşitse kimse puan almaz** — yoksa berabere
turlar da herkesi hedefe aynı hızda yaklaştırır, şampiyonluk da aradaki farkla değil kurayla
belirlenirdi.

Eskiden yalnızca kazanan 1 puan alıyordu; 4 kişilik maçlarda her turda üç kişi eli boş
kalıyor ve maçlar uzuyordu. Ölçüldü (25 maçın ortalaması, ayar 5):

| Kişi | Eskiden | Şimdi |
|---|---|---|
| 2 | 14.9 tur | 13.5 tur |
| 3 | 15.7 tur | 11.9 tur |
| 4 | 16.0 tur | **11.6 tur** |

### Hedef puan (kaç puan şampiyon eder)

Lobide `HEDEF: 15 PUAN` yazısının **iki yanındaki ok butonlarına tıklayarak** ayarlanır.
Ayar tur cinsindendir (1-9) ve **kişi sayısına göre ölçeklenir**: tur başına en fazla `n-1`
puan dağıtıldığı için ayar "kaç tur kazanmaya denk" anlamını korur.

| Ayar | 2 kişi | 3 kişi | 4 kişi |
|---|---|---|---|
| 5 | 5 puan | 10 puan | 15 puan |

Hedefe iki kişi **aynı puanla** ulaşırsa maç biter değil, devam eder: şampiyonluk oyuncu
sırasına göre kurayla verilmez, aradaki fark açılana kadar oynanır.

Bu oklar sadece **odayı kurana** görünür ve sadece onda çalışır; diğerleri
yazıyı gri olarak görür ama değiştiremez. Klavyeden `←` `→` tuşları da aynı işi yapar.

Kurucu = odayı açan kişi. Kurucu odadan ayrılırsa sıradaki oyuncu devralır.
Ayar sadece lobide değiştirilebilir; maç başladıktan sonra sabitlenir.

### Kaç kişi oynanır

Oda **4 kişiliktir**, ama 2 veya 3 kişiyle de oynanır — odadaki herkes "hazır" deyince oyun
başlar. Renkler katılma sırasına göre verilir: turuncu, mavi, yeşil, mor.

**Dikkat:** Oyun, o an odada olan herkes hazır olunca başlar. 4 kişi oynayacaksanız
herkes odaya girmeden hazır olmayın — maç başladıktan sonra gelen kişi o maça alınmaz
(lobide "3 / 4 OYUNCU" yazısı kimin eksik olduğunu gösterir). Herkesin gelmesini zorunlu
kılmak isterseniz `MIN_PLAYERS` değerini de 4 yapın.

4 kişide **Engelden Kaç** ekranı dört sahaya bölünür ve sahalar otomatik daralır
(100 birim yerine 74); engel deseni yine herkes için birebir aynı ve her zaman geçilebilir kalır.

4 kişilik maçlar derece puanı sayesinde artık daha kısa (bkz. [Puanlama](#puanlama-derece-puanı));
yine de kısa tutmak istersen odayı kuran lobide hedefi 2-3'e düşürebilir.

## Yeni mini oyun eklemek

1. `server/minigames/yenioyun.js` — kuralları (sunucu bunu işletir, hile olmaz):

```js
module.exports = {
  id: 'yenioyun',
  name: 'OYUN ADI',
  instruction: 'NE YAPILACAK!',
  controls: 'action',   // 'action' | 'lr' | 'dpad' | 'pointer'
  duration: 10,
  // seviye: 0 (ilk tur) .. 1 (en hizli). hafiza: ODAYA ait kalici not defteri -
  // turlar arasi hatirlanmasi gereken sey varsa (torba vb.) buraya yazilir.
  create(playerIds, seviye, hafiza) {
    return {
      // Girdi. controls'a göre gelen action'lar:
      //   'action' -> ('press')
      //   'lr'     -> ('move', -1|0|1)
      //   'dpad'   -> ('dir', 'up'|'down'|'left'|'right')
      //   'pointer'-> ('grab'|'drag'|'drop', {x,y})   x,y = 320x180 ekran koordinatı
      input(pid, action, data) {},
      update(dt) {},                 // her karede
      done() { return false; },      // erken bitti mi
      winners() { return []; },      // kazananlar ([] = berabere)
      // Derece puani icin TAM SIRALAMA: birinciden sonuncuya gruplar.
      // Esitler ayni grupta olur -> [['p0'], ['p1','p2']]
      // Kolayligi icin server/minigames/siralama.js kullanilabilir.
      derece() { return []; },
      text() { return ''; },         // sonuç ekranı yazısı
      snap() { return {}; },         // istemciye gönderilen durum
    };
  },
};
```

2. `server/minigames/index.js` listesine ekle.
3. `public/js/minigames/yenioyun.js` — çizimi:

```js
PP.MG.yenioyun = { draw(ctx, st, v) { /* st = snap() sonucu */ } };
```

4. `public/index.html` içine `<script>` satırını ekle.

Oyunun çekirdeğinde hiçbir değişiklik gerekmez.

Testlere de dokunman gerekmez: [test/minioyunlar.test.js](test/minioyunlar.test.js)
listeyi olduğu gibi gezdiği için yeni oyunun arayüzü ve dayanıklılığı
kendiliğinden sınanır. `npm test` çalıştırıp yeni oyunun listede
geçtiğini görürsün.

---

## Dosya yapısı

```
server/
  index.js        HTTP statik sunucu + WebSocket yönlendirme
  ws.js           Sıfır bağımlılıklı WebSocket (RFC 6455) implementasyonu
  config.js       Tüm ayarlar
  room.js         Oda ve oyuncu yönetimi
  gameLoop.js     Durum makinesi: lobi → geri sayım → oyun → sonuç → şampiyon
  minigames/      Her mini oyunun kuralları
test/
  yardimci.js     Ortak kurulum (sahte bağlantı, oda kurma, zaman ilerletme)
  *.test.js       Testler (npm test)
public/
  index.html      Menü + oyun ekranı + dokunmatik butonlar
  css/style.css
  js/font.js      Elle çizilmiş 5x7 pixel font (Türkçe harfler dahil)
  js/gfx.js       Palet ve sprite çizimi
  js/chars.js     Oyuncu karakterleri (karakterler.png'den kırpılır, seçilebilir)
  js/sound.js     Web Audio ile üretilen ses efektleri + fon müziği
  js/net.js       Sunucu bağlantısı (kopunca kendi kendine geri bağlanır)
  js/input.js     Klavye + dokunmatik
  js/main.js      Ekranlar ve çizim döngüsü
  js/minigames/   Her mini oyunun çizimi
  img/            Oyun resimleri:
                    elma1.png / elma2.png  -> Puzzle
                    kostebek.png / bomba.png -> Köstebek Avı
                    kostebek_vur.png        -> vurulmuş köstebek
                    cekic.png / cekic_vur.png -> çekiç (normal / vuruş anı)
                    klasor.png / cop.png    -> Dosya Silme
                    karakterler.png         -> oyuncu karakterleri
```

### Puzzle resmini değiştirmek

Yeni bir resim eklemek için `public/img/` altına koy, sonra
`public/js/minigames/puzzle.js` içindeki `KAYNAK` listesine satırını ekle:

```js
{ src: 'img/yeni.png', kirp: { x: 126, y: 103, w: 391, h: 435 } }
```

`kirp` = resmin içindeki asıl çizimin kutusu (etrafındaki boş zemini kırpar).
Ardından `server/minigames/puzzle.js` içindeki `IMAGE_COUNT` değerini artır.
Resim, ızgara boyutuna bir kez yumuşak küçültülüp saklanır; kareler sonra 1:1 çizilir,
yani dither deseni bulanıklaşmaz.

Harici kütüphane yok — `npm install` gerekmez.

## Testler

Sunucu tarafının tamamı saf JavaScript olduğu için testler ne tarayıcı ne de
gerçek bir bağlantı ister: sahte soketlerle gerçek oda kurulur ve zaman elle
ilerletilir, böylece bir maç saniyeler içinde baştan sona oynanır.

```bash
npm test
```

Harici test kütüphanesi yok — Node'un kendi `node:test` aracı kullanılıyor,
yani yine `npm install` gerekmiyor. 97 test bir saniyede biter.

| Dosya | Neyi sınar |
|---|---|
| [test/oda.test.js](test/oda.test.js) | Kopan oyuncunun yerini cihaz anahtarıyla geri alması, aynı ismi yazan yabancının yeri kapamaması, sohbet kuralları |
| [test/minioyunlar.test.js](test/minioyunlar.test.js) | 10 mini oyunun ortak arayüzü; hepsinin 2 ve 4 kişiyle, üç hız seviyesinde, bozuk paketler dahil rastgele girdi altında çökmeden bitmesi |
| [test/kablokesme.test.js](test/kablokesme.test.js) | Ezberleme aşaması, sıranın istemciye sızmaması, yanlış kesimde başa sarma ve kazanan seçimi |
| [test/mac.test.js](test/mac.test.js) | 2/3/4 kişilik tam maçların şampiyona ulaşması, kopan oyuncuda maçın duraklaması, şampiyon ekranı davranışı |
| [test/puan.test.js](test/puan.test.js) | Derece puanı dağıtımı, hedef ölçeği, şampiyon seçimi, oyunların `derece()` sıralamasının tutarlılığı |
| [test/yakala.test.js](test/yakala.test.js) | Düşenleri Yakala: düşme programının adaleti (bombadan kaçış hep var), yakalama kuralları, sonuç seçimi |
| [test/zemin.test.js](test/zemin.test.js) | Zemin Çöküyor deseninin adaleti (kusursuz oyuncu 600 desende hiç ölmüyor), kuşatılma olmaması, hareket kuralları, ortak ızgara davranışı |

Testlerin kendisi de sınandı: koda bilerek üç hata sokulup (gösterim koruması
kaldırıldı, yer kapma tekrar isme bağlandı, şampiyon ekranında otomatik hazır
geri getirildi) üçünün de ilgili testlerce yakalandığı doğrulandı.

## Turlar ilerledikçe hızlanma

WarioWare gibi: 1. turda oyunlar normal hızda, **10. turda en hızlı** hâlinde
ve orada kalıyor. Geri sayım ekranında `TUR 7` ve `HIZ +%67` yazar.

| Mini oyun | 1. turda | 10. turda |
|---|---|---|
| Köstebek Avı | 20 köstebek, 13 sn | **28 köstebek**, daha kısa süre kalıyorlar |
| Hafıza Dizisi | 4 sembol, 0.72 sn/sembol | **6 sembol**, 0.47 sn/sembol |
| Dosya Silme | 7 dosya, 12 sn | **10 dosya**, 10.2 sn |
| Engelden Kaç | 16 engel sırası | **20 engel sırası**, %25 daha hızlı |
| Sıcak Patates | normal fitil | **%35 daha kısa fitil** |
| Kablo Kesme | 4.6 sn ezberleme + 9 sn kesme | **3.2 sn ezberleme + 6.8 sn kesme**, **1.68 sn ceza** |
| Şekil Yerleştir / Puzzle | 14 sn | **10.1 sn** |
| Zemin Çöküyor | 0.75 sn uyarı, 14 sn | **0.45 sn uyarı**, 11.2 sn, çökmeler sıklaşır |
| Düşenleri Yakala | 108 birim/sn düşüş | **%35 daha hızlı**, eşyalar sıklaşır |
| At Yarışı | 8 sn | **6 sn** (aynı mesafe) |
| Refleks Düellosu | 10 sn | 7.5 sn — *zorlaşmaz, sadece tempo artar* |

Refleks Düellosu bilerek zorlaşmıyor: tepki süresi tepki süresidir, oyunu
hızlandırmak insanı daha hızlı reflekse sahip yapmaz — sadece haksızlık olurdu.

**Engelden Kaç hızlanırken bile adil kalır.** Satır aralığının alt sınırı
engelin kalınlığı ve hızından hesaplanıyor; sıkıştırma, geçilebilirliğin izin
verdiği yere kadar iner ve orada durur. Ölçüldü: her hız seviyesinde üretilen
desenlerin **%100'ü** geçilebilir.

Hızlanma turla artar, **skorla değil** — beraberlikler de turu ilerletir.
Hızı kapatmak ya da yavaşlatmak için `SPEED_ROUNDS` değerini büyüt.

## Bağlantı koparsa ne olur

Telefon kilitlenirse, Wi-Fi bir an takılırsa ya da sekme arka plana atılırsa
oyuncu **odadan atılmaz**:

- Kopan kişinin yeri, skoru ve karakteri tutulur.
- **Maç durur.** Diğerlerinin ekranında `AYSE KOPTU - MAC DURDU` ve geri sayım çıkar.
- Kopan kişi dönünce aynı turdan, aynı skorla devam edilir. Tarayıcı kendi kendine
  bağlanmayı dener (önce yarım saniyede bir, sonra aralığı açarak, en fazla 6 sn).
- Süre dolarsa (maçta 15 sn, lobide 8 sn) oyuncu gerçekten çıkarılır, oda lobiye döner.

Yer tutma iki gizli anahtarla çalışır: **sekmeye özel** olan (aynı sekme geri
bağlanınca devreye girer, sekme kapanınca silinir) ve **tarayıcıya özel** olan
(sekmeyi kapatıp koddan tekrar girersen seni tanır). İkisi de yalnızca senin
tarayıcında durur, hiçbir oyuncu listesinde görünmez: oda kodunu bilen biri —
hatta kopan oyuncuyla aynı ismi yazan biri — onun yerine geçemez.

## Farklı şehirdeki arkadaşlarla oynamak

### Yol 1 — Tünel (hazır, hesap gerektirmez)

Klasördeki **INTERNETE-AC.bat** dosyasına çift tıkla. Bu dosya:

1. Oyun sunucusunu başlatır,
2. Cloudflare üzerinden geçici bir internet adresi oluşturur.

Pencerede `https://xxxx-yyyy-zzzz.trycloudflare.com` gibi bir adres çıkar — **arkadaşlarına
gönderilecek adres budur**. Odayı kurduğunda oyun sana zaten paylaşılabilir linki gösterir
(`.../#KOD` şeklinde); arkadaşın o linke tıklayınca oda kodu otomatik dolar.

Bilmen gerekenler:

- **Pencere açık kaldığı sürece** adres çalışır. Kapatınca bağlantı kesilir.
- Her açılışta **adres değişir**, yani her seferinde yeni linki paylaşman gerekir.
- Adres açıkken linke sahip olan herkes oyuna girebilir. Odalar 4 harfli kodla korunur ve
  2 kişi dolunca kapanır, ama yine de linki tanımadığın kişilerle paylaşma ve
  oyun bitince pencereyi kapat.
- Bilgisayarın açık olmalı — sunucu sende çalışıyor.

Kurulum gerekiyorsa (bir kereye mahsus):

```bash
winget install Cloudflare.cloudflared
```

### Yol 2 — Kalıcı adres (bilgisayarın kapalıyken de çalışsın)

Oyunu ücretsiz bir barındırma servisine (Render, Railway, Fly.io) yüklersen sabit bir adres
alırsın ve senin bilgisayarın kapalıyken de oynanır. Proje buna hazır: dış bağımlılığı yok ve
`PORT` ortam değişkenini otomatik okur.

Render için: projeyi bir GitHub deposuna yükle → Render'da "New Web Service" → depoyu seç →
Build Command boş bırak, Start Command `node server/index.js`. Hesap açman gerekir, o kısmı
senin yapman lazım; takılırsan adım adım anlatırım.

## İnternet üzerinden oynarken adalet

Uzak bağlantılarda herkesin gecikmesi (ping) farklıdır. Buna karşı:

- **Refleks Düellosu** kazananı "tuşu sunucuya ilk ulaşan" değil, **gerçekten en hızlı tepki
  veren** olarak belirlenir. Her oyuncu işareti kendi ekranında gördüğü andan tuşa bastığı ana
  kadar geçen süreyi bildirir; sunucu bunu kendi ölçtüğü gecikmeyle sınırlayıp doğrular
  (ne insan sınırının altı, ne de kendi gecikmesinin izin verdiğinden düşük bir süre kabul edilir).
- Lobide her oyuncunun **ping değeri** gösterilir (yeşil = iyi, sarı = orta, turuncu = yüksek).
- Diğer mini oyunlar gecikmeye zaten dayanıklıdır; **Engelden Kaç**'ta yüksek ping'de
  hareket biraz gecikmeli hissedilebilir.
