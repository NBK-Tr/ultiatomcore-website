# UltiAtomCore — WordPress Uyarlama ve Güncelleme Rehberi

Bu klasör (`wordpress-uyarlama`), statik sitede yapılan tüm modernleştirmelerin, güvenlik yamalarının (Tekil Oyuncu ID, PIN kilitleme, Admin isim koruması, gizli kurucu anahtarı), oyun hata düzeltmelerinin ve yeni **Akıllı & Kavramsal Şifre Oluşturucu** sayfasının mevcut WordPress altyapınıza (`ultiatomcore.com`) birebir uyarlanmış halini içerir.

---

## 1. Ana PHP Backend Güncellemesi (`temel php.txt`)
WordPress panelinizde kullandığınız kod parçacığı eklentisinde (WPCode / Code Snippets veya tema `functions.php` dosyanızda) yer alan mevcut temel PHP kodunuzu **[`temel php.txt`](temel%20php.txt)** dosyasının içeriğiyle değiştirin.

**Bu güncelleme ile WordPress backend'inize eklenenler:**
- **Admin İsim Koruması (`uac_is_admin_reserved_name`)**: Admin yetkisi olmayan hiçbir oyuncu adının içinde `admin`, `adm1n`, `4dmin`, `yonetici`, `moderator`, `kurucu`, `ultiatom`, `atomcore` vb. ifadeler geçemez.
- **Tekil Oyuncu ID (`UAC-XXXXXXXX`)**: Her oyuncu adına özel tekil kimlik üretilir ve tüm oyun kayıtları (`uac_player_auth_*`) bu ID altında birleştirilir.
- **Yeni REST API Uçları**:
  - `/wp-json/uac-platform/v1/auth-login` (Profil sayfasından doğrudan PIN doğrulama ve hesap kilitleme)
  - `/wp-json/uac-platform/v1/admin-login` ve `/wp-json/uac-platform/v1/admin-logout` (Gizli kurucu anahtarı veya WordPress Yönetici oturumu ile ön yüz Admin yetkisi açma)
- **Password Challenge Backend Kural Düzeltmesi**: 10. kuraldaki rakam toplamı (`10-65`), 12. kural UTF-8 son harf kontrolü, 24. kural tam sayı taşması (`% 3`) ve 28. kural çoklu `X` kontrolü ön yüzle birebir senkronize edildi.
- **Günün Sırrı İpucu Kaydı**: Sayfa yenilendiğinde açılmış ipucunun kaybolmaması (`unlocked_hint`) ve Türkçe `İ/I` + artikel (`bir/bu/şu`) normalizasyonu eklendi.

---

## 2. Genel CSS Güncellemesi (`temel css.txt`)
WordPress'te genel stil kodlarınızı tuttuğunuz alanı (**Görünüm → Özelleştir → Ek CSS** veya kullandığınız CSS snippet'i) **[`temel css.txt`](temel%20css.txt)** dosyasındaki içerikle güncelleyin.
- Mevcut oyun stilleriniz korunmuş, üzerine modernize edilen cam (glassmorphism) kartlar, koyu tema form alanları (`.uac-dark-field`), gizli `<details>` Admin kutusu ve yeni **Şifre Oluşturucu** sayfasının tüm stilleri eklenmiştir.

---

## 3. Son Sığınak Eklentisini Güncelleme (`uac-son-siginak-wp.zip`)
1. WordPress Admin panelinde **Eklentiler → Yeni Eklenti Ekle → Eklenti Yükle** menüsüne gidin.
2. Bu klasördeki **[`uac-son-siginak-wp.zip`](uac-son-siginak-wp.zip)** dosyasını seçip yükleyin ve **"Mevcut olanı yüklenenle değiştir"** seçeneğine tıklayın.
   - *(Alternatif olarak FTP / Dosya Yöneticisi kullanıyorsanız `wp-content/plugins/uac-son-siginak-wp/` klasörünün içine bu klasördeki `uac-son-siginak-wp` dosyalarını atabilirsiniz).*

---

## 4. Mevcut Sayfaların HTML ve JS Kodlarını Güncelleme
Eski yapınızda olduğu gibi her sayfanın **Özel HTML (Custom HTML)** bloğunu ilgili `... html.txt` dosyasıyla, sayfa özel JS snippet'ini ise `... js.txt` dosyasıyla güncelleyin:

| Sayfa | WordPress Kalıcı Bağlantısı (Slug) | HTML Kodu | JS Kodu |
| :--- | :--- | :--- | :--- |
| **Anasayfa** | `/` | `anasayfa html.txt` | `anasayfa js.txt` |
| **Klavye Muharebesi** | `/klavye-muharebesi/` | `klavye muharebesi html.txt` | `klavye muharebesi js.txt` |
| **Password Challenge** | `/password-challenge/` | `password challenge html.txt` | `password challenge js.txt` |
| **Günün Sırrı** | `/gunun-sirri/` | `gunun sirri html.txt` | `gunun sirri js.txt` |
| **Profilim** | `/profilim/` | `profilim html.txt` | `profilim js.txt` |
| **Sohbet** | `/sohbet/` | `sohbet html.txt` | `sohbet js.txt` |

> **Not (`profilim html.txt`)**: Gönderdiğiniz ekran görüntüsündeki beyaz renkli ve varsayılan şifreyi ifşa eden riskli placeholder tamamen kaldırılmış, koyu temalı ve kapalı (`<details>`) bir **Yönetici Doğrulama** çekmecesine dönüştürülmüştür.

---

## 5. Yeni "Şifre Oluşturucu" Sayfasını WordPress'e Ekleme
1. WordPress Admin panelinde **Sayfalar → Yeni Sayfa Ekle**'ye tıklayın.
2. Sayfa başlığını **Şifre Oluşturucu**, kalıcı bağlantısını (URL slug) **`sifre-olusturucu`** (`/sifre-olusturucu/`) yapın.
3. Sayfa içerisine bir **Özel HTML (Custom HTML)** bloğu ekleyip **[`sifre olusturucu html.txt`](sifre%20olusturucu%20html.txt)** dosyasının içeriğini yapıştırın.
4. Diğer oyun sayfalarında kullandığınız gibi bu sayfaya özel JS alanına (veya `<script>...</script>` etiketi içine) **[`sifre olusturucu js.txt`](sifre%20olusturucu%20js.txt)** dosyasının içeriğini ekleyin.
5. **Görünüm → Menüler** (veya Site Düzenleyici → Üst Menü) kısmından üst navigasyon menünüze `/sifre-olusturucu/` bağlantısını ("Şifre Oluşturucu") ekleyin.
