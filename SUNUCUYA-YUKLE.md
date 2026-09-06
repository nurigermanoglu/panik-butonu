# Oyunu 7/24 açık tutmak (bilgisayarın kapalıyken de çalışsın)

> **Yayında:** https://panik-butonu.onrender.com
> **Kaynak:** https://github.com/nurigermanoglu/panik-butonu
>
> Aşağıdaki adımlar bir kez uygulandı. Bundan sonra oyunu güncellemek için
> tek komut yeter: `git push`

Şu an oyun **senin bilgisayarında** çalışıyor; sen kapatınca link ölüyor.
Oyunu internetteki bir sunucuya yüklersen bilgisayarın kapalıyken de açık kalır
ve link hep aynı olur.

Proje bunun için hazır: dış bağımlılığı yok, portu ortamdan okuyor,
`https` üzerinde WebSocket'e kendiliğinden geçiyor, `render.yaml` ayar
dosyası hazır.

---

## En kolay yol: Render (ücretsiz, kredi kartı istemez)

### 1. GitHub hesabı aç

[github.com](https://github.com) → **Sign up**. Zaten varsa geç.

### 2. GitHub'da boş bir depo aç

- Sağ üstten **+** → **New repository**
- İsim: `panik-butonu`
- **Public** seç
- Aşağıdaki "Add a README" / "Add .gitignore" kutularını **işaretleme** (boş kalsın)
- **Create repository**

### 3. Kodu gönder

Proje klasöründe şu iki komutu çalıştır (`KULLANICI_ADIN` yerine kendi GitHub
kullanıcı adını yaz):

```bash
git remote add origin https://github.com/KULLANICI_ADIN/panik-butonu.git
git branch -M main
git push -u origin main
```

İlk `push`ta bir tarayıcı penceresi açılıp GitHub'a giriş yapmanı ister.
Giriş yaptıktan sonra bütün proje geçmişiyle birlikte yüklenir.

### 4. Render'a bağla

- [render.com](https://render.com) → **Get Started** → GitHub ile giriş yap
- **New +** → **Web Service** → az önce açtığın `panik-butonu` deposunu seç
- Ayarlar kendiliğinden gelir (`render.yaml` sayesinde). Gelmezse:
  - Runtime: **Node**
  - Build Command: `npm install`
  - Start Command: `node server/index.js`
  - Instance Type: **Free**
- **Create Web Service** → 1-2 dakika bekle

### 5. Bitti

Sana `https://panik-butonu-xxxx.onrender.com` gibi bir adres verir.
**Bu adres hep aynı kalır** ve bilgisayarın kapalıyken de çalışır.
Linki arkadaşlarına at, istedikleri zaman girsinler.

---

## Bilmen gereken tek şey

Render'ın ücretsiz planı, **15 dakika kimse girmezse uyur.** Uyuduktan sonra
ilk giren kişi ~50 saniye bekler, sonra normal hızında çalışır.
Yani "arkadaşına linki at, o açsın" senaryosunda ilk açılış biraz yavaş olur.
Sen linki birkaç saniye önceden açarsan onlar beklemez.

Bu rahatsız ederse uyumayan seçenekler:

| Servis | Ücretsiz | Uyur mu | Not |
|---|---|---|---|
| **Render** | ✅ | 15 dk sonra uyur | Kart istemez, en kolayı |
| **Fly.io** | ✅ (sınırlı) | Uyumaz | Kayıtta kredi kartı ister, GitHub gerekmez |
| **Koyeb** | ✅ (1 servis) | Uyumaz | Kurulumu biraz daha uzun |

---

## Yükledikten sonra oyunu güncellemek

Değişiklik yaptıktan sonra tek komut yeter:

```bash
git push
```

Render değişikliği görüp yeni sürümü kendiliğinden yayına alır.

Bilgisayarında test etmeye devam etmek istersen `BASLAT.bat` hâlâ çalışıyor.
