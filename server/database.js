// server/database.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'kurye.db');
const db = new Database(dbPath);

// WAL modu (daha iyi performans)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==========================================
// TABLO OLUŞTUR
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    soyad TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    sifre_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'kurye',
    telefon TEXT DEFAULT '',
    aktif INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS musteriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    soyad TEXT DEFAULT '',
    telefon TEXT UNIQUE,
    adres TEXT DEFAULT '',
    lat REAL DEFAULT NULL,
    lng REAL DEFAULT NULL,
    siparis_sayisi INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_urunler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    fiyat REAL NOT NULL,
    kategori TEXT DEFAULT 'Genel',
    aktif INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS siparisler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    musteri_id INTEGER,
    musteri_adi TEXT NOT NULL,
    telefon TEXT DEFAULT '',
    adres TEXT DEFAULT '',
    lat REAL DEFAULT NULL,
    lng REAL DEFAULT NULL,
    durum TEXT DEFAULT 'Alındı',
    toplam_tutar REAL DEFAULT 0,
    odeme_yontemi TEXT DEFAULT 'Nakit',
    notlar TEXT DEFAULT '',
    kurye_notu TEXT DEFAULT '',
    kurye_id INTEGER DEFAULT NULL,
    silindi_mi INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    teslim_zamani TEXT DEFAULT NULL,
    FOREIGN KEY (musteri_id) REFERENCES musteriler(id)
  );

  CREATE TABLE IF NOT EXISTS siparis_kalemleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_id INTEGER NOT NULL,
    urun_id INTEGER DEFAULT NULL,
    urun_adi TEXT NOT NULL,
    adet INTEGER DEFAULT 1,
    birim_fiyat REAL DEFAULT 0,
    FOREIGN KEY (siparis_id) REFERENCES siparisler(id) ON DELETE CASCADE,
    FOREIGN KEY (urun_id) REFERENCES menu_urunler(id)
  );

  CREATE TABLE IF NOT EXISTS siparis_gecmisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_id INTEGER NOT NULL,
    durum TEXT NOT NULL,
    not_text TEXT DEFAULT '',
    degistiren_id INTEGER DEFAULT NULL,
    degistiren_ad TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (siparis_id) REFERENCES siparisler(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bildirimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tip TEXT NOT NULL,
    baslik TEXT NOT NULL,
    mesaj TEXT NOT NULL,
    hedef_rol TEXT DEFAULT 'esnaf',
    siparis_id INTEGER DEFAULT NULL,
    okundu INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS musteri_takip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    aktif INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (siparis_id) REFERENCES siparisler(id)
  );

  CREATE TABLE IF NOT EXISTS urun_varyantlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    fiyat_fark REAL DEFAULT 0,
    sira INTEGER DEFAULT 0,
    FOREIGN KEY (urun_id) REFERENCES menu_urunler(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS urun_ekstralar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    fiyat REAL DEFAULT 0,
    sira INTEGER DEFAULT 0,
    FOREIGN KEY (urun_id) REFERENCES menu_urunler(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS kampanyalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT UNIQUE NOT NULL,
    ad TEXT NOT NULL,
    tip TEXT NOT NULL DEFAULT 'yuzde',
    deger REAL NOT NULL DEFAULT 0,
    min_tutar REAL DEFAULT 0,
    max_kullanim INTEGER DEFAULT 0,
    kullanim_sayisi INTEGER DEFAULT 0,
    aktif INTEGER DEFAULT 1,
    baslangic TEXT DEFAULT NULL,
    bitis TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ==========================================
// MIGRATION: alis_fiyati kolonu ekle
// ==========================================
try {
  db.exec('ALTER TABLE menu_urunler ADD COLUMN alis_fiyati REAL DEFAULT NULL');
} catch (e) { /* Kolon zaten var */ }

// MIGRATION: odeme_yontemi kolonu ekle
try {
  db.exec("ALTER TABLE siparisler ADD COLUMN odeme_yontemi TEXT DEFAULT 'Nakit'");
} catch (e) { /* Kolon zaten var */ }

// ==========================================
// MIGRATION: Hibrit Kurye Mimarisi
// ==========================================
// kullanicilar → esnaf_id (özel kuryeler için bağlı esnaf)
try {
  db.exec('ALTER TABLE kullanicilar ADD COLUMN esnaf_id INTEGER DEFAULT NULL');
} catch (e) { /* Kolon zaten var */ }

// kullanicilar → kurye_tipi ('ozel' = esnafa bağlı, 'genel' = platform havuzu)
try {
  db.exec("ALTER TABLE kullanicilar ADD COLUMN kurye_tipi TEXT DEFAULT 'genel'");
} catch (e) { /* Kolon zaten var */ }

// kullanicilar → kurye_durumu ('aktif', 'mola', 'cevrimdisi')
try {
  db.exec("ALTER TABLE kullanicilar ADD COLUMN kurye_durumu TEXT DEFAULT 'cevrimdisi'");
} catch (e) { /* Kolon zaten var */ }

// siparisler → kurye_kaynagi ('ozel' veya 'genel')
try {
  db.exec('ALTER TABLE siparisler ADD COLUMN kurye_kaynagi TEXT DEFAULT NULL');
} catch (e) { /* Kolon zaten var */ }

// ==========================================
// MIGRATION: Kurye Profil Alanları
// ==========================================
try { db.exec("ALTER TABLE kullanicilar ADD COLUMN plaka TEXT DEFAULT ''"); } catch (e) { }
try { db.exec("ALTER TABLE kullanicilar ADD COLUMN arac TEXT DEFAULT ''"); } catch (e) { }
try { db.exec("ALTER TABLE kullanicilar ADD COLUMN iban TEXT DEFAULT ''"); } catch (e) { }

// ==========================================
// MIGRATION: Dükkan Ayarları Tablosu
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS dukkan_ayarlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    esnaf_id INTEGER NOT NULL,
    dukkan_adi TEXT DEFAULT '',
    telefon TEXT DEFAULT '',
    adres TEXT DEFAULT '',
    enlem REAL DEFAULT NULL,
    boylam REAL DEFAULT NULL,
    min_paket_tutar REAL DEFAULT 0,
    teslimat_suresi TEXT DEFAULT '30-45',
    teslimat_ucreti REAL DEFAULT 0,
    yogun_mod INTEGER DEFAULT 0,
    dukkan_acik INTEGER DEFAULT 1,
    acilis_saati TEXT DEFAULT '09:00',
    kapanis_saati TEXT DEFAULT '22:00',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (esnaf_id) REFERENCES kullanicilar(id)
  );
`);

// Migration: çalışma saatleri + teslimat ücreti + kurye atama
try { db.exec("ALTER TABLE dukkan_ayarlari ADD COLUMN acilis_saati TEXT DEFAULT '09:00'"); } catch (e) { }
try { db.exec("ALTER TABLE dukkan_ayarlari ADD COLUMN kapanis_saati TEXT DEFAULT '22:00'"); } catch (e) { }
try { db.exec("ALTER TABLE dukkan_ayarlari ADD COLUMN teslimat_ucreti REAL DEFAULT 0"); } catch (e) { }
try { db.exec("ALTER TABLE dukkan_ayarlari ADD COLUMN kurye_atama_stratejisi TEXT DEFAULT 'manuel'"); } catch (e) { }

// Migration: sipariş indirim alanları
try { db.exec("ALTER TABLE siparisler ADD COLUMN indirim_kodu TEXT DEFAULT NULL"); } catch (e) { }
try { db.exec("ALTER TABLE siparisler ADD COLUMN indirim_tutari REAL DEFAULT 0"); } catch (e) { }

// Migration: Özellik 4 - Stok Takibi
try { db.exec("ALTER TABLE menu_urunler ADD COLUMN stok_miktari INTEGER DEFAULT -1"); } catch (e) { }

// Migration: Özellik 5 - İleri Tarihli Sipariş
try { db.exec("ALTER TABLE siparisler ADD COLUMN zamanlanmis_tarih TEXT DEFAULT NULL"); } catch (e) { }
try { db.exec("ALTER TABLE siparisler ADD COLUMN zamanlanmis_saat TEXT DEFAULT NULL"); } catch (e) { }

// Migration: Özellik 6 - Teslimat Bölge Yönetimi
db.exec(`
  CREATE TABLE IF NOT EXISTS teslimat_bolgeleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    renk TEXT DEFAULT '#3388ff',
    min_tutar REAL DEFAULT 0,
    teslimat_ucreti REAL DEFAULT 0,
    polygon_json TEXT NOT NULL,
    esnaf_id INTEGER DEFAULT NULL,
    aktif INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: Özellik 7 - POS Entegrasyonu ve Otomatik Yazdırma
try { db.exec("ALTER TABLE siparisler ADD COLUMN pos_aktarildi INTEGER DEFAULT 0"); } catch (e) { }
try { db.exec("ALTER TABLE dukkan_ayarlari ADD COLUMN otomatik_yazdir INTEGER DEFAULT 0"); } catch (e) { }

// ==========================================
// BAŞLANGIÇ VERİSİ (Eğer tablolar boşsa)
// ==========================================

const menuSayisi = db.prepare('SELECT COUNT(*) as sayi FROM menu_urunler').get().sayi;
if (menuSayisi === 0) {
  const menuEkle = db.prepare('INSERT INTO menu_urunler (ad, fiyat, kategori, alis_fiyati) VALUES (?, ?, ?, ?)');
  const menuItems = [
    ['Mercimek Çorbası', 60, 'Çorbalar', 25],
    ['Ezogelin Çorbası', 60, 'Çorbalar', 22],
    ['Kelle Paça', 120, 'Çorbalar', 55],
    ['Adana Dürüm', 180, 'Dürümler', 85],
    ['Urfa Dürüm', 170, 'Dürümler', 80],
    ['Tavuk Döner Dürüm', 120, 'Dürümler', 50],
    ['İskender Kebap', 280, 'Kebaplar', 140],
    ['Beyti Sarma', 300, 'Kebaplar', 150],
    ['Ayran (Yayık)', 25, 'İçecekler', 8],
    ['Kola (330ml)', 40, 'İçecekler', 15],
    ['Şalgam Suyu', 25, 'İçecekler', 7],
    ['Künefe', 150, 'Tatlılar', 65],
    ['Fıstıklı Katmer', 200, 'Tatlılar', 90],
    ['Sütlaç', 80, 'Tatlılar', 30],
  ];
  const insertMany = db.transaction((items) => {
    for (const item of items) menuEkle.run(...item);
  });
  insertMany(menuItems);
  console.log('📦 Menü verileri yüklendi.');
}

// ==========================================
// VARSAYILAN KULLANICILAR (İlk çalıştırmada)
// ==========================================
const kullaniciSayisi = db.prepare('SELECT COUNT(*) as sayi FROM kullanicilar').get().sayi;
if (kullaniciSayisi === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('123456', 10);

  db.prepare(`INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, rol) VALUES (?, ?, ?, ?, ?)`)
    .run('Admin', 'Restoran', 'admin@kuryeapp.com', hash, 'esnaf');
  db.prepare(`INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, rol) VALUES (?, ?, ?, ?, ?)`)
    .run('Kurye', 'Test', 'kurye@kuryeapp.com', hash, 'kurye');

  console.log('👤 Varsayılan kullanıcılar oluşturuldu (şifre: 123456)');
}

module.exports = db;
