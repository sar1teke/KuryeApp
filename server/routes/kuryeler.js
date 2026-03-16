// server/routes/kuryeler.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');

// ==========================================
// GET /api/kuryeler — Kurye Listesi (Hibrit)
// ?tip=ozel|genel|tumu  &  ?esnaf_id=X
// ==========================================
router.get('/', (req, res) => {
    const { tip = 'tumu', esnaf_id } = req.query;

    try {
        let where = "rol = 'kurye'";
        const params = [];

        if (tip === 'ozel' && esnaf_id) {
            where += " AND kurye_tipi = 'ozel' AND esnaf_id = ?";
            params.push(esnaf_id);
        } else if (tip === 'genel') {
            where += " AND kurye_tipi = 'genel'";
        }
        // tip === 'tumu' → tüm kuryeler (filtre yok)

        const kuryeler = db.prepare(`
            SELECT id, ad, soyad, email, telefon, aktif, kurye_tipi, kurye_durumu, esnaf_id, created_at
            FROM kullanicilar WHERE ${where}
            ORDER BY kurye_tipi ASC, created_at DESC
        `).all(...params);

        // Her kurye için performans istatistikleri
        const sonuc = kuryeler.map(k => {
            const stats = db.prepare(`
                SELECT 
                    COUNT(*) as toplam_gorev,
                    SUM(CASE WHEN durum = 'Teslim Edildi' THEN 1 ELSE 0 END) as teslim_edilen,
                    SUM(CASE WHEN durum IN ('Yolda', 'Kuryede') THEN 1 ELSE 0 END) as aktif_gorev,
                    AVG(
                        CASE WHEN teslim_zamani IS NOT NULL AND created_at IS NOT NULL 
                        THEN (julianday(teslim_zamani) - julianday(created_at)) * 24 * 60
                        ELSE NULL END
                    ) as ort_sure_dk
                FROM siparisler WHERE kurye_id = ? AND silindi_mi = 0
            `).get(k.id);

            const bugunStats = db.prepare(`
                SELECT COUNT(*) as bugun_teslimat
                FROM siparisler 
                WHERE kurye_id = ? AND silindi_mi = 0 
                AND durum = 'Teslim Edildi'
                AND created_at >= datetime('now', 'start of day')
            `).get(k.id);

            return {
                ...k,
                toplamGorev: stats?.toplam_gorev || 0,
                teslimEdilen: stats?.teslim_edilen || 0,
                aktifGorev: stats?.aktif_gorev || 0,
                ortSureDk: stats?.ort_sure_dk ? Math.round(stats.ort_sure_dk) : null,
                bugunTeslimat: bugunStats?.bugun_teslimat || 0,
                basariOrani: stats?.toplam_gorev > 0
                    ? ((stats.teslim_edilen / stats.toplam_gorev) * 100).toFixed(1)
                    : '0'
            };
        });

        res.json(sonuc);
    } catch (err) {
        console.error('Kurye listesi hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/kuryeler/musait — Müsait Kuryeler
// Sipariş atamada kullanılır
// ==========================================
router.get('/musait', (req, res) => {
    const { esnaf_id } = req.query;

    try {
        // Önce esnafın özel kuryeleri, sonra genel havuz
        const kuryeler = db.prepare(`
            SELECT id, ad, soyad, telefon, kurye_tipi, kurye_durumu,
                   (SELECT COUNT(*) FROM siparisler WHERE kurye_id = kullanicilar.id AND durum IN ('Yolda', 'Kuryede') AND silindi_mi = 0) as aktif_gorev
            FROM kullanicilar 
            WHERE rol = 'kurye' AND aktif = 1 AND kurye_durumu = 'aktif'
            AND (
                (kurye_tipi = 'ozel' AND esnaf_id = ?)
                OR kurye_tipi = 'genel'
            )
            ORDER BY kurye_tipi ASC, aktif_gorev ASC
        `).all(esnaf_id || 0);

        res.json(kuryeler);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/kuryeler/:id — Kurye Detay + İstatistik
// ==========================================
router.get('/:id', (req, res) => {
    try {
        const kurye = db.prepare(`
            SELECT id, ad, soyad, email, telefon, aktif, kurye_tipi, kurye_durumu, esnaf_id, created_at
            FROM kullanicilar WHERE id = ? AND rol = 'kurye'
        `).get(req.params.id);

        if (!kurye) return res.status(404).json({ error: 'Kurye bulunamadı' });

        const sonSiparisler = db.prepare(`
            SELECT id, musteri_adi, adres, durum, toplam_tutar, kurye_kaynagi, created_at, teslim_zamani
            FROM siparisler WHERE kurye_id = ? AND silindi_mi = 0
            ORDER BY created_at DESC LIMIT 20
        `).all(req.params.id);

        const haftalikStats = db.prepare(`
            SELECT 
                DATE(created_at) as tarih,
                COUNT(*) as teslimat
            FROM siparisler 
            WHERE kurye_id = ? AND silindi_mi = 0 AND durum = 'Teslim Edildi'
            AND created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY tarih ASC
        `).all(req.params.id);

        res.json({ kurye, sonSiparisler, haftalikStats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// POST /api/kuryeler — Yeni Kurye Ekle (Hibrit)
// body: { ad, soyad, email, sifre, telefon, kurye_tipi, esnaf_id }
// ==========================================
router.post('/', (req, res) => {
    const { ad, soyad, email, sifre, telefon, kurye_tipi = 'genel', esnaf_id = null } = req.body;

    if (!ad || !email || !sifre) {
        return res.status(400).json({ error: 'Ad, email ve şifre zorunludur.' });
    }

    if (kurye_tipi === 'ozel' && !esnaf_id) {
        return res.status(400).json({ error: 'Özel kurye için esnaf_id zorunludur.' });
    }

    try {
        const mevcut = db.prepare('SELECT id FROM kullanicilar WHERE email = ?').get(email);
        if (mevcut) return res.status(409).json({ error: 'Bu email zaten kayıtlı.' });

        const hash = bcrypt.hashSync(sifre, 10);
        const result = db.prepare(`
            INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, rol, telefon, kurye_tipi, esnaf_id)
            VALUES (?, ?, ?, ?, 'kurye', ?, ?, ?)
        `).run(ad, soyad || '', email, hash, telefon || '', kurye_tipi, kurye_tipi === 'ozel' ? esnaf_id : null);

        const kurye = db.prepare(`
            SELECT id, ad, soyad, email, telefon, aktif, kurye_tipi, kurye_durumu, esnaf_id, created_at 
            FROM kullanicilar WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(kurye);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/kuryeler/:id — Kurye Bilgi Güncelle
// ==========================================
router.put('/:id', (req, res) => {
    const { ad, soyad, telefon, aktif } = req.body;

    try {
        db.prepare(`
            UPDATE kullanicilar SET 
                ad = COALESCE(?, ad),
                soyad = COALESCE(?, soyad),
                telefon = COALESCE(?, telefon),
                aktif = COALESCE(?, aktif),
                updated_at = datetime('now')
            WHERE id = ? AND rol = 'kurye'
        `).run(ad, soyad, telefon, aktif !== undefined ? (aktif ? 1 : 0) : null, req.params.id);

        const kurye = db.prepare(`
            SELECT id, ad, soyad, email, telefon, aktif, kurye_tipi, kurye_durumu, esnaf_id 
            FROM kullanicilar WHERE id = ?
        `).get(req.params.id);

        res.json(kurye);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/kuryeler/:id/durum — Çalışma Durumu Güncelle
// body: { kurye_durumu: 'aktif' | 'mola' | 'cevrimdisi' }
// ==========================================
router.put('/:id/durum', (req, res) => {
    const { kurye_durumu } = req.body;
    const gecerliDurumlar = ['aktif', 'mola', 'cevrimdisi'];

    if (!gecerliDurumlar.includes(kurye_durumu)) {
        return res.status(400).json({ error: 'Geçersiz durum. aktif, mola veya cevrimdisi olmalı.' });
    }

    try {
        db.prepare(`
            UPDATE kullanicilar SET kurye_durumu = ?, updated_at = datetime('now')
            WHERE id = ? AND rol = 'kurye'
        `).run(kurye_durumu, req.params.id);

        const kurye = db.prepare(`
            SELECT id, ad, soyad, kurye_durumu, kurye_tipi FROM kullanicilar WHERE id = ?
        `).get(req.params.id);

        res.json(kurye);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// DELETE /api/kuryeler/:id — Kurye Deaktif Et
// ==========================================
router.delete('/:id', (req, res) => {
    try {
        db.prepare("UPDATE kullanicilar SET aktif = 0, updated_at = datetime('now') WHERE id = ? AND rol = 'kurye'")
            .run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/kuryeler/profil/ben — Kuryenin Kendi Profili
// ==========================================
router.get('/profil/ben', (req, res) => {
    const kurye = db.prepare(`
        SELECT id, ad, soyad, email, telefon, plaka, arac, iban, kurye_durumu, kurye_tipi, aktif, created_at
        FROM kullanicilar WHERE id = ? AND rol = 'kurye'
    `).get(req.kullanici.id);
    if (!kurye) return res.status(404).json({ error: 'Kurye profili bulunamadı' });
    res.json(kurye);
});

// ==========================================
// PUT /api/kuryeler/profil/ben — Kuryenin Kendi Profilini Güncelle
// ==========================================
router.put('/profil/ben', (req, res) => {
    const { ad, soyad, telefon, plaka, arac, iban } = req.body;
    db.prepare(`
        UPDATE kullanicilar SET
            ad = COALESCE(?, ad), soyad = COALESCE(?, soyad),
            telefon = COALESCE(?, telefon), plaka = COALESCE(?, plaka),
            arac = COALESCE(?, arac), iban = COALESCE(?, iban),
            updated_at = datetime('now')
        WHERE id = ? AND rol = 'kurye'
    `).run(ad, soyad, telefon, plaka, arac, iban, req.kullanici.id);

    const kurye = db.prepare(`
        SELECT id, ad, soyad, email, telefon, plaka, arac, iban, kurye_durumu, kurye_tipi
        FROM kullanicilar WHERE id = ?
    `).get(req.kullanici.id);
    res.json(kurye);
});

// ==========================================
// PUT /api/kuryeler/profil/durum — Kuryenin Kendi Durumunu Değiştir
// ==========================================
router.put('/profil/durum', (req, res) => {
    const { kurye_durumu } = req.body;
    if (!['aktif', 'mola', 'cevrimdisi'].includes(kurye_durumu)) {
        return res.status(400).json({ error: 'Geçersiz durum.' });
    }
    db.prepare("UPDATE kullanicilar SET kurye_durumu = ?, updated_at = datetime('now') WHERE id = ? AND rol = 'kurye'")
        .run(kurye_durumu, req.kullanici.id);

    const kurye = db.prepare('SELECT id, ad, soyad, kurye_durumu FROM kullanicilar WHERE id = ?').get(req.kullanici.id);

    // Socket ile esnafa bildir
    const io = req.app.get('io');
    if (io) io.emit('kurye_durum_degisti', kurye);

    res.json(kurye);
});

module.exports = router;

