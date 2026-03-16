// server/routes/ayarlar.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authGerekli, rolGerekli } = require('../middleware/authMiddleware');

// ==========================================
// GET /api/ayarlar — Esnafın Dükkan Ayarlarını Getir
// ==========================================
router.get('/', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    let ayarlar = db.prepare('SELECT * FROM dukkan_ayarlari WHERE esnaf_id = ?').get(esnafId);

    if (!ayarlar) {
        // İlk kez → varsayılan oluştur
        db.prepare(`
            INSERT INTO dukkan_ayarlari (esnaf_id, dukkan_adi, telefon, adres) 
            VALUES (?, ?, '', '')
        `).run(esnafId, `${req.kullanici.ad}'ın İşletmesi`);
        ayarlar = db.prepare('SELECT * FROM dukkan_ayarlari WHERE esnaf_id = ?').get(esnafId);
    }

    res.json(ayarlar);
});

// ==========================================
// PUT /api/ayarlar — Dükkan Ayarlarını Güncelle
// ==========================================
router.put('/', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    const { dukkan_adi, telefon, adres, enlem, boylam, min_paket_tutar, teslimat_suresi, teslimat_ucreti, yogun_mod, otomatik_yazdir, dukkan_acik, acilis_saati, kapanis_saati, kurye_atama_stratejisi } = req.body;

    // Upsert
    const mevcut = db.prepare('SELECT id FROM dukkan_ayarlari WHERE esnaf_id = ?').get(esnafId);
    if (mevcut) {
        db.prepare(`
            UPDATE dukkan_ayarlari SET 
                dukkan_adi = COALESCE(?, dukkan_adi),
                telefon = COALESCE(?, telefon),
                adres = COALESCE(?, adres),
                enlem = COALESCE(?, enlem),
                boylam = COALESCE(?, boylam),
                min_paket_tutar = COALESCE(?, min_paket_tutar),
                teslimat_suresi = COALESCE(?, teslimat_suresi),
                teslimat_ucreti = COALESCE(?, teslimat_ucreti),
                yogun_mod = COALESCE(?, yogun_mod),
                otomatik_yazdir = COALESCE(?, otomatik_yazdir),
                dukkan_acik = COALESCE(?, dukkan_acik),
                acilis_saati = COALESCE(?, acilis_saati),
                kapanis_saati = COALESCE(?, kapanis_saati),
                kurye_atama_stratejisi = COALESCE(?, kurye_atama_stratejisi),
                updated_at = datetime('now')
            WHERE esnaf_id = ?
        `).run(dukkan_adi, telefon, adres, enlem, boylam, min_paket_tutar, teslimat_suresi, teslimat_ucreti,
            yogun_mod !== undefined ? (yogun_mod ? 1 : 0) : null,
            otomatik_yazdir !== undefined ? (otomatik_yazdir ? 1 : 0) : null,
            dukkan_acik !== undefined ? (dukkan_acik ? 1 : 0) : null,
            acilis_saati, kapanis_saati, kurye_atama_stratejisi,
            esnafId);
    } else {
        db.prepare(`
            INSERT INTO dukkan_ayarlari (esnaf_id, dukkan_adi, telefon, adres, enlem, boylam, min_paket_tutar, teslimat_suresi, yogun_mod, otomatik_yazdir, dukkan_acik)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(esnafId, dukkan_adi || '', telefon || '', adres || '', enlem, boylam, min_paket_tutar || 0, teslimat_suresi || '30-45', yogun_mod ? 1 : 0, otomatik_yazdir ? 1 : 0, dukkan_acik !== false ? 1 : 0);
    }

    const ayarlar = db.prepare('SELECT * FROM dukkan_ayarlari WHERE esnaf_id = ?').get(esnafId);
    res.json(ayarlar);
});

// ==========================================
// GET /api/ayarlar/teslimat-bolgeleri
// ==========================================
router.get('/teslimat-bolgeleri', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    const bolgeler = db.prepare('SELECT * FROM teslimat_bolgeleri WHERE esnaf_id = ? AND aktif = 1 ORDER BY id DESC').all(esnafId);
    res.json(bolgeler);
});

// ==========================================
// POST /api/ayarlar/teslimat-bolgeleri
// ==========================================
router.post('/teslimat-bolgeleri', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    const { ad, renk, min_tutar, teslimat_ucreti, polygon_json } = req.body;

    if (!ad || !polygon_json) return res.status(400).json({ error: 'Ad ve harita koordinatları zorunludur' });

    try {
        const result = db.prepare(`
            INSERT INTO teslimat_bolgeleri (ad, renk, min_tutar, teslimat_ucreti, polygon_json, esnaf_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(ad, renk || '#3388ff', min_tutar || 0, teslimat_ucreti || 0, polygon_json, esnafId);

        const yeniBolge = db.prepare('SELECT * FROM teslimat_bolgeleri WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(yeniBolge);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/ayarlar/teslimat-bolgeleri/:id
// ==========================================
router.put('/teslimat-bolgeleri/:id', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    const bolgeId = req.params.id;
    const { ad, renk, min_tutar, teslimat_ucreti, polygon_json } = req.body;

    const mevcut = db.prepare('SELECT id FROM teslimat_bolgeleri WHERE id = ? AND esnaf_id = ?').get(bolgeId, esnafId);
    if (!mevcut) return res.status(404).json({ error: 'Bölge bulunamadı veya yetkiniz yok' });

    try {
        db.prepare(`
            UPDATE teslimat_bolgeleri SET 
                ad = COALESCE(?, ad),
                renk = COALESCE(?, renk),
                min_tutar = COALESCE(?, min_tutar),
                teslimat_ucreti = COALESCE(?, teslimat_ucreti),
                polygon_json = COALESCE(?, polygon_json)
            WHERE id = ?
        `).run(ad, renk, min_tutar, teslimat_ucreti, polygon_json, bolgeId);

        const guncelBolge = db.prepare('SELECT * FROM teslimat_bolgeleri WHERE id = ?').get(bolgeId);
        res.json(guncelBolge);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DELETE /api/ayarlar/teslimat-bolgeleri/:id
// ==========================================
router.delete('/teslimat-bolgeleri/:id', authGerekli, (req, res) => {
    const esnafId = req.kullanici.id;
    const bolgeId = req.params.id;

    const mevcut = db.prepare('SELECT id FROM teslimat_bolgeleri WHERE id = ? AND esnaf_id = ?').get(bolgeId, esnafId);
    if (!mevcut) return res.status(404).json({ error: 'Bölge bulunamadı veya yetkiniz yok' });

    try {
        db.prepare('UPDATE teslimat_bolgeleri SET aktif = 0 WHERE id = ?').run(bolgeId);
        res.json({ success: true, message: 'Bölge kaldırıldı' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
