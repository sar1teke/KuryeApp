// server/routes/menu.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/menu — Tüm menüyü listele (varyant + ekstra dahil)
router.get('/', (req, res) => {
    const menu = db.prepare('SELECT * FROM menu_urunler WHERE aktif = 1 ORDER BY kategori, ad').all();
    // Her ürüne varyant ve ekstra ekle
    const sonuc = menu.map(u => ({
        ...u,
        varyantlar: db.prepare('SELECT * FROM urun_varyantlar WHERE urun_id = ? ORDER BY sira').all(u.id),
        ekstralar: db.prepare('SELECT * FROM urun_ekstralar WHERE urun_id = ? ORDER BY sira').all(u.id),
    }));
    res.json(sonuc);
});

// GET /api/menu/kategoriler — Benzersiz kategorileri listele
router.get('/kategoriler', (req, res) => {
    const rows = db.prepare('SELECT DISTINCT kategori FROM menu_urunler WHERE aktif = 1 ORDER BY kategori').all();
    res.json(rows.map(r => r.kategori));
});

// POST /api/menu — Yeni ürün ekle
router.post('/', (req, res) => {
    const { ad, fiyat, kategori, alis_fiyati, stok_miktari, varyantlar, ekstralar } = req.body;
    if (!ad || !fiyat) return res.status(400).json({ error: 'Ad ve fiyat zorunlu' });

    const result = db.prepare(
        'INSERT INTO menu_urunler (ad, fiyat, kategori, alis_fiyati, stok_miktari) VALUES (?, ?, ?, ?, ?)'
    ).run(ad, fiyat, kategori || 'Genel', alis_fiyati || null, stok_miktari !== undefined ? stok_miktari : -1);
    const urunId = result.lastInsertRowid;

    // Varyantları kaydet
    if (varyantlar && varyantlar.length > 0) {
        const vStmt = db.prepare('INSERT INTO urun_varyantlar (urun_id, ad, fiyat_fark, sira) VALUES (?, ?, ?, ?)');
        varyantlar.forEach((v, i) => vStmt.run(urunId, v.ad, v.fiyat_fark || 0, i));
    }
    // Ekstraları kaydet
    if (ekstralar && ekstralar.length > 0) {
        const eStmt = db.prepare('INSERT INTO urun_ekstralar (urun_id, ad, fiyat, sira) VALUES (?, ?, ?, ?)');
        ekstralar.forEach((e, i) => eStmt.run(urunId, e.ad, e.fiyat || 0, i));
    }

    const urun = db.prepare('SELECT * FROM menu_urunler WHERE id = ?').get(urunId);
    urun.varyantlar = db.prepare('SELECT * FROM urun_varyantlar WHERE urun_id = ?').all(urunId);
    urun.ekstralar = db.prepare('SELECT * FROM urun_ekstralar WHERE urun_id = ?').all(urunId);
    res.status(201).json(urun);
});

// PUT /api/menu/:id — Ürün güncelle (varyant/ekstra dahil)
router.put('/:id', (req, res) => {
    const { ad, fiyat, kategori, alis_fiyati, stok_miktari, varyantlar, ekstralar } = req.body;
    const urunId = req.params.id;

    try {
        db.prepare(`
      UPDATE menu_urunler SET 
        ad = COALESCE(?, ad), 
        fiyat = COALESCE(?, fiyat), 
        kategori = COALESCE(?, kategori),
        alis_fiyati = ?,
        stok_miktari = COALESCE(?, stok_miktari)
      WHERE id = ? AND aktif = 1
    `).run(ad, fiyat, kategori, alis_fiyati !== undefined ? alis_fiyati : null, stok_miktari, urunId);

        // Varyantları güncelle (sil + yeniden ekle)
        if (varyantlar !== undefined) {
            db.prepare('DELETE FROM urun_varyantlar WHERE urun_id = ?').run(urunId);
            if (varyantlar.length > 0) {
                const vStmt = db.prepare('INSERT INTO urun_varyantlar (urun_id, ad, fiyat_fark, sira) VALUES (?, ?, ?, ?)');
                varyantlar.forEach((v, i) => vStmt.run(urunId, v.ad, v.fiyat_fark || 0, i));
            }
        }
        // Ekstraları güncelle
        if (ekstralar !== undefined) {
            db.prepare('DELETE FROM urun_ekstralar WHERE urun_id = ?').run(urunId);
            if (ekstralar.length > 0) {
                const eStmt = db.prepare('INSERT INTO urun_ekstralar (urun_id, ad, fiyat, sira) VALUES (?, ?, ?, ?)');
                ekstralar.forEach((e, i) => eStmt.run(urunId, e.ad, e.fiyat || 0, i));
            }
        }

        const urun = db.prepare('SELECT * FROM menu_urunler WHERE id = ?').get(urunId);
        if (!urun) return res.status(404).json({ error: 'Ürün bulunamadı' });
        urun.varyantlar = db.prepare('SELECT * FROM urun_varyantlar WHERE urun_id = ?').all(urunId);
        urun.ekstralar = db.prepare('SELECT * FROM urun_ekstralar WHERE urun_id = ?').all(urunId);
        res.json(urun);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/menu/:id — Ürün sil (soft)
router.delete('/:id', (req, res) => {
    db.prepare('UPDATE menu_urunler SET aktif = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
