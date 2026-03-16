# 🚀 Kurye & Restoran Yönetim Sistemi (KuryeApp)

Modern web teknolojileri (React + Vite + Tailwind CSS) kullanılarak geliştirilmiş, restoran sahipleri (Esnaf) ve Kuryeler için tasarlanmış tam kapsamlı bir **POS, CRM ve Sipariş Takip Otomasyonu**.

Bu proje, karmaşık masaüstü yazılımlarının yerine, her cihazda (Masaüstü, Tablet, Mobil) kusursuz çalışan, hızlı ve modern bir "SaaS" (Hizmet olarak yazılım) mimarisi hedeflenerek oluşturulmuştur.

## ✨ Öne Çıkan Özellikler

### 🏢 Esnaf (Restoran) Paneli
* **📊 Akıllı Dashboard:** Günlük ciro, bekleyen siparişler ve yoldaki paketlerin anlık özeti.
* **🛒 Gelişmiş POS Ekranı:** Hızlı ürün seçimi, sepette ürün gruplama (örn: *3x Lahmacun*), anlık tutar hesaplama ve detaylı müşteri kaydı.
* **🔄 Sipariş İş Akışı (Workflow):** Siparişleri "Hazırlanıyor ➔ Yolda ➔ Teslim Edildi" adımlarıyla tek tuşla yönetme.
* **📈 Finansal Raporlar:** `Recharts` entegrasyonu ile haftalık ciro analizi ve en çok satan ürünlerin grafiksel dökümü.
* **👥 Müşteri Veritabanı (CRM):** Sadık müşterileri, toplam harcamalarını ve sipariş sıklıklarını otomatik takip eden akıllı liste.
* **🍽️ Menü Yönetimi:** Yeni ürün ekleme, kategorilendirme ve fiyatlandırma.
* **🗑️ Çöp Kutusu:** İptal edilen siparişleri saklama ve istendiğinde geri yükleme yeteneği.
* **⚙️ Dükkan Ayarları:** Tek tuşla dükkanı açma/kapatma, minimum paket tutarı ve "Yoğunluk Modu" belirleme.

### 🛵 Kurye Paneli (Mobil Uyumlu)
* **📱 Koyu Tema (Dark Mode):** Gece sürüşlerinde göz yormayan, başparmakla kullanıma uygun devasa butonlar.
* **📍 Canlı Harita (Yakında):** `Leaflet` ile sipariş adresini ve kuryenin anlık konumunu haritada gösterme.

## 🛠️ Kullanılan Teknolojiler

* **Frontend Framework:** React 18
* **Build Tool:** Vite (Ultra hızlı derleme)
* **Styling:** Tailwind CSS v3 (Tamamen responsive yapı)
* **Routing:** React Router DOM v6
* **Data Visualization:** Recharts
* **Mimari:** Service-Oriented Architecture (Gelecekteki backend entegrasyonu için izole edilmiş `api/` katmanı)

## 📂 Proje Yapısı (Feature-Based)

```text
src/
├── api/             # Backend simülasyonları (Mock Data & Services)
├── components/      # Ortak bileşenler (Butonlar, Inputlar)
├── features/        # Ana iş mantığına göre ayrılmış modüller
│   └── esnaf/       # Esnaf paneline özel bileşenler (Kartlar, Modallar)
├── layouts/         # Sayfa şablonları (Esnaf Sidebar Layout vb.)
├── pages/           # Sayfa görünümleri ve rota bağlayıcıları
│   ├── esnaf/       # Dashboard, POS, Ayarlar sayfaları
│   ├── kurye/       # Mobil kurye sayfaları
│   └── ortak/       # Giriş / Rol seçim ekranı
└── App.jsx          # Ana yönlendirme (Router)
