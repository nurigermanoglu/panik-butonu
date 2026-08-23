# PARTİ PANİK (çalışma adı) — Geliştirme Planı

WarioWare / Buster Jam / Party Panic tarzı, web tarayıcısından oynanan, 2 kişilik (ileride 4 kişilik), 2D pixel-art mini oyun koleksiyonu.

---

## 1. Oyun Konsepti

- İki oyuncu bir odada buluşur (oda kodu veya link ile).
- Oyun, arka arkaya gelen **kısa mini oyunlardan** (5–15 saniye) oluşur.
- Her mini oyunun kazananı puan alır; belirli tura ulaşınca (örn. 5 galibiyet) genel kazanan ilan edilir.
- Mini oyunlar rastgele sırayla gelir; her birinin öncesinde 3 saniyelik "Hazır ol! — GÖREV: ..." ekranı gösterilir.
- Ton: komik, hızlı, abartılı — pixel-art grafikler, zıpır ses efektleri.

## 2. Teknoloji Seçimi

| Katman | Teknoloji | Neden |
|---|---|---|
| İstemci (oyun) | HTML5 Canvas + saf JavaScript | Kurulumsuz, her tarayıcıda ve telefonda çalışır |
| Sunucu | Node.js + `ws` (WebSocket) | Gerçek zamanlı iletişim için standart, basit |
| Grafik | 320×180 iç çözünürlük, `image-rendering: pixelated` ile büyütme | Otantik pixel-art görünümü |
| Ses | Web Audio API (basit efektler kod ile üretilebilir) | Dosya bağımlılığı olmadan retro sesler |

Framework kullanılmayacak (Phaser vb. yok) — mini oyunlar küçük olduğu için saf Canvas yeterli ve tamamen kontrol bizde olur.

## 3. Mimari (4 kişiye genişlemeye hazır)

### Sunucu — otoriter model
- **Oda sistemi:** `Room { code, players[], state }` — kapasite bir sabittir: `MAX_PLAYERS = 2`. 4 kişiye geçiş = bu sabiti değiştirmek + arayüz düzenlemeleri.
- **Oyuncu listesi:** Kod hiçbir yerde "oyuncu1/oyuncu2" diye sabitlenmez; her şey `players` dizisi üzerinden döner.
- **Oyun akışı durum makinesi:** `LOBBY → COUNTDOWN → MINIGAME → RESULT → (tekrar COUNTDOWN veya GAMEOVER)`
- Sunucu mini oyunun kurallarını işletir (hile koruması + senkron garantisi), istemciler girdi gönderir ve durumu çizer.

### İstemci
- Tek `index.html` + modüler JS dosyaları.
- Sunucudan gelen durumu (state) her karede çizer; kendi girdilerini (tuş/dokunma) sunucuya yollar.
- Kontroller: klavye (masaüstü) + dokunmatik butonlar (telefon) — baştan ikisi de desteklenir.

### Mini oyun modül arayüzü (en kritik tasarım kararı)
Her mini oyun, sunucuda ve istemcide **standart bir arayüzü** uygulayan bağımsız bir dosyadır:

```
// Sunucu tarafı
{ id, name, duration, init(players), handleInput(player, input), update(dt), isFinished(), getScores() }

// İstemci tarafı
{ id, draw(ctx, state), getControls() }
```

Yeni mini oyun eklemek = bu arayüzü uygulayan 1 dosya yazıp listeye eklemek. Oyunun çekirdeğine dokunulmaz.

## 4. Başlangıç Mini Oyunları (ilk sürümde 4 adet)

1. **Buton Yağmuru** — Kim daha hızlı tuşa basarsa çubuğu doldurur (mash yarışı).
2. **Refleks Düellosu** — Ekran "ŞİMDİ!" dediğinde ilk basan kazanır; erken basan yanar.
3. **Düşen Engellerden Kaç** — Sağa sola hareket, ekrandan yağan nesnelere çarpmadan hayatta kal.
4. **Hafıza Dizisi** — Simon tarzı: gösterilen renk/yön dizisini doğru tekrar et.

Sonradan eklenebilecekler: halat çekme, hedef vurma, hızlı matematik, ritim tutturma, alan kapmaca...

## 5. Geliştirme Aşamaları

**Durum: Aşama 1-4 tamamlandı, oyun oynanabilir.** Çalıştırma talimatı için [README.md](README.md).

### Aşama 1 — Altyapı (iskelet) ✅
- [x] Node.js projesi, WebSocket sunucusu, statik dosya sunumu
- [x] Oda sistemi: oda kur / koda katıl, lobi ekranı, "hazırım" butonu
- [x] Bağlantı kopması yönetimi (oyuncu düşerse oyun lobiye döner)

### Aşama 2 — Oyun Döngüsü Çerçevesi ✅
- [x] Durum makinesi (lobi → geri sayım → mini oyun → sonuç → tekrar)
- [x] Mini oyun modül arayüzü + "torba" seçici (hepsi tekrar etmeden birer kez gelir)
- [x] Skor tablosu ve şampiyon ekranı + tekrar oyna

### Aşama 3 — İlk Mini Oyunlar ✅
- [x] 4 mini oyunun sunucu mantığı + istemci çizimi
- [x] Klavye ve dokunmatik kontroller

### Aşama 4 — Görsel/İşitsel Cila ✅
- [x] Elle çizilmiş 5x7 pixel font (Türkçe harfler dahil)
- [x] Pixel-art karakterler, konfeti, geçiş ekranları ("3-2-1", şampiyon kutlaması)
- [x] Retro ses efektleri (Web Audio ile üretiliyor, ses dosyası yok)

### Aşama 5 — 4 Kişiye Genişletme ✅
- [x] `MAX_PLAYERS: 4` — oda artık 4 kişilik (2 ve 3 kişiyle de oynanır)
- [x] Engelden Kaç sahaları oyuncu sayısına göre daralıyor (4 kişide 74 birim), desen yine %100 geçilebilir
- [x] Lobide "X / 4 OYUNCU" sayacı ve eksik oyuncu uyarısı
- [x] Tüm ekranların 4 kişilik yerleşimi font ölçüleriyle doğrulandı, taşma yok
- [ ] Geç katılan oyuncu için bekleme davranışı (şu an maç başladıysa odaya alınmıyor, sonraki maçı bekliyor)

### Aşama 6 — Denge, altyapı ve genişleme ✅

- [x] **Derece puanı**: her turda herkes sırasına göre puan alır (4 kişide 3/2/1/0);
      hedef kişi sayısına göre ölçeklenir. Ölçüldü: 4 kişilik maçlar 16 → 11.6 tura indi
- [x] **Otomatik test paketi**: `npm test` — 77 test, harici bağımlılık yok
      (Node'un `node:test` aracı). Testler mutasyonla doğrulandı
- [x] **Kablo Kesme yeniden tasarlandı**: iki aşamalı ezber oyunu; sıra istemciye
      hiç gönderilmiyor, yanlış kesim başa sarıyor
- [x] **Zemin Çöküyor** eklendi (11. mini oyun, `dpad`)
- [x] Altı hata düzeltildi (patlama sprite'ı, telefon kilidi sonrası bağlantı,
      isim taşmaları, sessiz sohbet reddi, isimle yer kapma, paylaşılan puzzle torbası)
- [x] Ana menü lobinin görsel diline uyarlandı; üst çubuk her iki ekranda ortak

### Sırada ne var

- [ ] Yeni `dpad` / `lr` oyunları (dağılım hâlâ pointer ağırlıklı: 5 pointer, 3 action, 1 lr, 2 dpad)
- [ ] İzleyici modu (yukarıdaki geç katılım maddesinin çözümü)
- [ ] Lobide oyun seçimi/eleme
- [ ] Maç sonu istatistikleri, bot, maç içi emote, renk körü desteği, ayrı ses seviyeleri

## 6. Test notları

- Uçtan uca test: iki sahte oyuncu (bot) ile tam maç oynatıldı; 4 kişilik mod da doğrulandı.
- **Engelden Kaç** dengesi ölçüldü: engel deseni her zaman *geçilebilir* üretiliyor
  (120/120 desen, tüm x konumlarını tarayan çözücüyle doğrulandı), yani ölüm şansa değil
  reflekse bağlı. Kusursuz oyuncu ~15 yıldızın ~11'ini toplayabiliyor.
- Türkçe harfler ve tüm mini oyun ekranları canvas piksel dökümüyle doğrulandı.

## 7. Dosya Yapısı

```
oyuuuuun/
├── server/
│   ├── index.js          # WebSocket sunucu + statik dosya sunumu
│   ├── room.js           # Oda ve oyuncu yönetimi
│   ├── gameLoop.js       # Durum makinesi
│   └── minigames/        # Her mini oyunun sunucu mantığı (1 dosya = 1 oyun)
├── public/
│   ├── index.html
│   ├── js/
│   │   ├── main.js       # Bağlantı + ekran yönetimi
│   │   ├── renderer.js   # Pixel-art canvas çizimi
│   │   ├── input.js      # Klavye + dokunmatik
│   │   └── minigames/    # Her mini oyunun istemci çizimi
│   └── css/style.css
├── package.json
└── PLAN.md
```

## 8. Test ve Oynama

- Geliştirme sırasında: `node server/index.js` → iki tarayıcı sekmesi açıp iki oyuncu gibi test.
- Arkadaşla oynamak için: sunucu internete açılmalı — seçenekler: aynı Wi-Fi'da yerel IP ile, ya da ücretsiz barındırma (Render / Railway / Glitch) veya geçici tünel (ngrok).
