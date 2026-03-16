// server/routes/kampanyalar.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/kampanyalar — Tüm kampanyaları listele
router.get('/', (req, res) => {
    const kampanyalar = db.prepare('SELECT * FROM kampanyalar ORDER BY created_at DESC').all();
    res.json(kampanyalar);
});

// POST /api/kampanyalar — Yeni kampanya oluştur
router.post('/', (req, res) => {
    const { kod, ad, tip, deger, min_tutar, max_kullanim, baslangic, bitis } = req.body;
    if (!kod || !ad || !deger) return res.status(400).json({ error: 'Kod, ad ve değer zorunlu' });

    try {
        const result = db.prepare(`
            INSERT INTO kampanyalar (kod, ad, tip, deger, min_tutar, max_kullanim, baslangic, bitis)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(kod.toUpperCase(), ad, tip || 'yuzde', deger, min_tutar || 0, max_kullanim || 0, baslangic || null, bitis || null);
        const kampanya = db.prepare('SELECT * FROM kampanyalar WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(kampanya);
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Bu kod zaten kullanılıyor' });
        res.status(500).json({ error: err.message });
    }
});

// POST /api/kampanyalar/dogrula — Kodu doğrula ve indirim hesapla
router.post('/dogrula', (req, res) => {
    const { kod, tutar } = req.body;
    if (!kod) return res.status(400).json({ error: 'Kod gerekli' });

    const k = db.prepare('SELECT * FROM kampanyalar WHERE kod = ? AND aktif = 1').get(kod.toUpperCase());
    if (!k) return res.status(404).json({ error: 'Geçersiz veya süresi dolmuş kod' });

    // Tarih kontrolü
    const simdi = new Date().toISOString();
    if (k.baslangic && simdi < k.baslangic) return res.status(400).json({ error: 'Kampanya henüz başlamadı' });
    if (k.bitis && simdi > k.bitis) return res.status(400).json({ error: 'Kampanya süresi doldu' });

    // Kullanım kontrolü
    if (k.max_kullanim > 0 && k.kullanim_sayisi >= k.max_kullanim) return res.status(400).json({ error: 'Kampanya kullanım limiti doldu' });

    // Min tutar kontrolü
    if (tutar && tutar < k.min_tutar) return res.status(400).json({ error: `Minimum sipariş tutarı: ₺${k.min_tutar}` });

    // İndirim hesapla
    let indirim = 0;
    if (k.tip === 'yuzde') {
        indirim = (tutar || 0) * (k.deger / 100);
    } else {
        indirim = k.deger;
    }
    indirim = Math.min(indirim, tutar || Infinity);

    res.json({ gecerli: true, kampanya: k, indirim: parseFloat(indirim.toFixed(2)) });
});

// PUT /api/kampanyalar/:id — Kampanya güncelle
router.put('/:id', (req, res) => {
    const { ad, tip, deger, min_tutar, max_kullanim, aktif, baslangic, bitis } = req.body;
    try {
        db.prepare(`
            UPDATE kampanyalar SET ad = COALESCE(?, ad), tip = COALESCE(?, tip), deger = COALESCE(?, deger),
            min_tutar = COALESCE(?, min_tutar), max_kullanim = COALESCE(?, max_kullanim),
            aktif = COALESCE(?, aktif), baslangic = ?, bitis = ?
            WHERE id = ?
        `).run(ad, tip, deger, min_tutar, max_kullanim, aktif, baslangic || null, bitis || null, req.params.id);
        const kampanya = db.prepare('SELECT * FROM kampanyalar WHERE id = ?').get(req.params.id);
        res.json(kampanya);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/kampanyalar/:id — Kampanya sil
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM kampanyalar WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;
