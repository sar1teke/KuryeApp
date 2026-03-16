// server/routes/musteriler.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// ==========================================
// GET /api/musteriler
// Tüm Müşterileri Listele
// ==========================================
router.get('/', (req, res) => {
    const musteriler = db.prepare(`
    SELECT m.*, 
           COALESCE(SUM(CASE WHEN s.durum != 'İptal' AND s.silindi_mi = 0 THEN s.toplam_tutar ELSE 0 END), 0) as toplam_harcama,
           MAX(s.created_at) as son_siparis_tarihi
    FROM musteriler m
    LEFT JOIN siparisler s ON m.id = s.musteri_id
    GROUP BY m.id
    ORDER BY m.updated_at DESC
  `).all();
    res.json(musteriler);
});

// ==========================================
// GET /api/musteriler/ara?q=Ahmet
// Müşteri arama (Auto-Suggest)
// ==========================================
router.get('/ara', (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);

    const stmt = db.prepare(`
    SELECT id, ad, soyad, telefon, adres, lat, lng, siparis_sayisi
    FROM musteriler
    WHERE ad LIKE ? OR soyad LIKE ? OR telefon LIKE ?
    ORDER BY siparis_sayisi DESC
    LIMIT 10
  `);

    const arama = `%${q}%`;
    const sonuclar = stmt.all(arama, arama, arama);
    res.json(sonuclar);
});

// ==========================================
// GET /api/musteriler/:id
// Müşteri Detayı
// ==========================================
router.get('/:id', (req, res) => {
    const musteri = db.prepare('SELECT * FROM musteriler WHERE id = ?').get(req.params.id);
    if (!musteri) return res.status(404).json({ error: 'Müşteri bulunamadı' });
    res.json(musteri);
});

// ==========================================
// POST /api/musteriler
// Yeni Müşteri Ekle
// ==========================================
router.post('/', (req, res) => {
    const { ad, soyad, telefon, adres, lat, lng } = req.body;
    if (!ad) return res.status(400).json({ error: 'Ad zorunlu' });

    try {
        // Telefon zaten varsa güncelle
        if (telefon) {
            const mevcut = db.prepare('SELECT id FROM musteriler WHERE telefon = ?').get(telefon);
            if (mevcut) {
                db.prepare(`
          UPDATE musteriler SET ad = ?, soyad = ?, adres = COALESCE(?, adres), 
          lat = COALESCE(?, lat), lng = COALESCE(?, lng), updated_at = datetime('now')
          WHERE id = ?
        `).run(ad, soyad || '', adres, lat, lng, mevcut.id);

                const guncellenmis = db.prepare('SELECT * FROM musteriler WHERE id = ?').get(mevcut.id);
                return res.json(guncellenmis);
            }
        }

        const result = db.prepare(`
      INSERT INTO musteriler (ad, soyad, telefon, adres, lat, lng) VALUES (?, ?, ?, ?, ?, ?)
    `).run(ad, soyad || '', telefon || '', adres || '', lat || null, lng || null);

        const yeni = db.prepare('SELECT * FROM musteriler WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(yeni);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/musteriler/:id
// Müşteri Güncelle
// ==========================================
router.put('/:id', (req, res) => {
    const { ad, soyad, telefon, adres, lat, lng } = req.body;

    try {
        db.prepare(`
      UPDATE musteriler SET 
        ad = COALESCE(?, ad), soyad = COALESCE(?, soyad), 
        telefon = COALESCE(?, telefon), adres = COALESCE(?, adres),
        lat = COALESCE(?, lat), lng = COALESCE(?, lng),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(ad, soyad, telefon, adres, lat, lng, req.params.id);

        const guncellenmis = db.prepare('SELECT * FROM musteriler WHERE id = ?').get(req.params.id);
        if (!guncellenmis) return res.status(404).json({ error: 'Müşteri bulunamadı' });
        res.json(guncellenmis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DELETE /api/musteriler/:id
// Müşteri Sil
// ==========================================
router.delete('/:id', (req, res) => {
    try {
        const musteri = db.prepare('SELECT * FROM musteriler WHERE id = ?').get(req.params.id);
        if (!musteri) return res.status(404).json({ error: 'Müşteri bulunamadı' });

        // Siparişlerdeki referansı null yap
        db.prepare('UPDATE siparisler SET musteri_id = NULL WHERE musteri_id = ?').run(req.params.id);
        // Müşteriyi sil
        db.prepare('DELETE FROM musteriler WHERE id = ?').run(req.params.id);

        res.json({ success: true, message: `${musteri.ad} ${musteri.soyad || ''} silindi.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

