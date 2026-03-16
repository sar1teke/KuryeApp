// server/routes/pos.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authGerekli, rolGerekli } = require('../middleware/authMiddleware');

// ==========================================
// MİMARİ NOTU:
// Bu route, dış POS sistemlerinin veya masaüstü 
// yazılımının (Örn: Adisyon programı) KuryeApp'a 
// bağlanıp yeni siparişleri çekmesi içindir.
// Güvenlik: Esnaf yetkisi (veya özel POS API Key) gerektirir.
// ==========================================

// ==========================================
// GET /api/pos/siparisler/yeni
// POS'a henüz aktarılmamış "Alındı" veya "Hazırlanıyor" 
// durumundaki aktif siparişleri getirir.
// ==========================================
router.get('/siparisler/yeni', authGerekli, rolGerekli('esnaf'), (req, res) => {
    const esnafId = req.kullanici.id; // İleride birden fazla esnaf desteklenecekse
    
    try {
        // Şu anki mimaride tüm siparişleri getirir (Tek dükkan varsayımı)
        const siparisler = db.prepare(`
            SELECT s.*,
            (SELECT json_group_array(
                json_object(
                    'urun_adi', sk.urun_adi, 
                    'adet', sk.adet, 
                    'birim_fiyat', sk.birim_fiyat
                )
            ) FROM siparis_kalemleri sk WHERE sk.siparis_id = s.id) as icerik_detay
            FROM siparisler s
            WHERE s.silindi_mi = 0 
            AND s.pos_aktarildi = 0 
            AND (s.durum = 'Alındı' OR s.durum = 'Hazırlanıyor')
            ORDER BY s.id ASC
        `).all();

        // İçerik JSON'larını parse et
        const formatli = siparisler.map(s => ({
            ...s,
            icerik: s.icerik_detay ? JSON.parse(s.icerik_detay) : []
        }));

        res.json(formatli);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/pos/siparisler/:id/onayla
// POS programı siparişi kendi veritabanına kaydettiğinde
// ve/veya yazdırdığında bu endpointi çağırarak 
// KuryeApp tarafında siparişi "Aktarıldı" olarak işaretler.
// ==========================================
router.put('/siparisler/:id/onayla', authGerekli, rolGerekli('esnaf'), (req, res) => {
    const siparisId = req.params.id;

    try {
        const result = db.prepare(`
            UPDATE siparisler 
            SET pos_aktarildi = 1, updated_at = datetime('now')
            WHERE id = ? AND pos_aktarildi = 0
        `).run(siparisId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Sipariş bulunamadı veya zaten aktarılmış' });
        }

        res.json({ success: true, message: 'POS onayı alındı' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
