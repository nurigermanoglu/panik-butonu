# Oyunu 7/24 açık tutmak (bilgisayarın kapalıyken de çalışsın)

Şu an oyun **senin bilgisayarında** çalışıyor; sen kapatınca link ölüyor.
Oyunu internetteki bir sunucuya yüklersen bilgisayarın kapalıyken de açık kalır
ve link hep aynı olur.

Proje bunun için hazır: dış bağımlılığı yok, portu ortamdan okuyor,
`render.yaml` ayar dosyası eklendi.

---

## En kolay yol: Render (ücretsiz, kredi kartı istemez)

### 1. GitHub hesabı aç
[github.com](https://github.com) → **Sign up**. Zaten varsa geç.

### 2. Kodu GitHub'a yükle
- GitHub'da sağ üstten **+** → **New repository**
- İsim: `panik-butonu` · **Public** seç · **Create repository**
- Açılan sayfada **uploading an existing file** bağlantısına tıkla
- `oyuuuuun` klasörünün **içindekileri** (server, public, package.json, render.yaml…)
  sürükleyip bırak → **Commit changes**

> Klasörün kendisini değil, içindekileri yükle. `.claude` klasörünü yüklemene gerek yok.

### 3. Render'a bağla
- [render.com](https://render.com) → **Get Started** → GitHub ile giriş yap
- **New +** → **Web Service** → az önce açtığın `panik-butonu` deposunu seç
- Ayarlar kendiliğinden gelir (`render.yaml` sayesinde). Gelmezse:
  - Runtime: **Node**
  - Build Command: `npm install`
  - Start Command: `node server/index.js`
  - Instance Type: **Free**
- **Create Web Service** → 1-2 dakika bekle

### 4. Bitti
Sana `https://panik-butonu-xxxx.onrender.com` gibi bir adres verir.
**Bu adres hep aynı kalır** ve bilgisayarın kapalıyken de çalışır.

---

## Bilmen gereken tek şey

Render'ın ücretsiz planı, **15 dakika kimse girmezse uyur.** Uyuduktan sonra
ilk giren kişi ~50 saniye bekler, sonra normal hızında çalışır.
Yani "arkadaşına linki at, o açsın" senaryosunda ilk açılış biraz yavaş olur.

Bu rahatsız ederse uyumayan seçenekler:

| Servis | Ücretsiz | Uyur mu | Not |
|---|---|---|---|
| **Render** | ✅ | 15 dk sonra uyur | Kart istemez, en kolayı |
| **Fly.io** | ✅ (sınırlı) | Uyumaz | Kayıtta kredi kartı ister |
| **Koyeb** | ✅ (1 servis) | Uyumaz | Kurulumu biraz daha uzun |

---

## Yükledikten sonra

Oyunu güncellemek istersen: değişen dosyaları GitHub'da aynı şekilde yükle,
Render otomatik olarak yeni sürümü yayına alır.

Bilgisayarında test etmeye devam etmek istersen `BASLAT.bat` hâlâ çalışıyor.
