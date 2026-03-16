// server/routes/bildirimler.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');

// ==========================================
// WhatsApp Bildirim Mesaj Şablonları
// ==========================================
const MESAJ_SABLONLARI = {
    'Hazırlanıyor': (siparis) => `🍳 Merhaba ${siparis.musteri_adi}! #${siparis.id} numaralı siparişiniz hazırlanmaya başlandı.`,
    'Hazır': (siparis) => `✅ ${siparis.musteri_adi}, siparişiniz hazır! Kurye en kısa sürede teslimata çıkacak.`,
    'Yolda': (siparis, token) => `🚚 Siparişiniz yola çıktı! Kurye konumunu canlı takip edin:\n${getBaseUrl()}/takip/${token}`,
    'Teslim Edildi': (siparis) => `📦 Siparişiniz teslim edildi! Afiyet olsun. Bizi tercih ettiğiniz için teşekkürler!`,
    'İptal': (siparis) => `❌ Üzgünüz, #${siparis.id} numaralı siparişiniz iptal edildi. Detaylar için bizi arayabilirsiniz.`,
};

function getBaseUrl() {
    return 'http://localhost:5173';
}

// ==========================================
// GET /api/bildirimler — Bildirim Listesi
// ==========================================
router.get('/', (req, res) => {
    const { rol = 'esnaf', limit = 50 } = req.query;
    const bildirimler = db.prepare(`
    SELECT * FROM bildirimler 
    WHERE hedef_rol = ? OR hedef_rol = 'hepsi'
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(rol, parseInt(limit));
    res.json(bildirimler);
});

// ==========================================
// GET /api/bildirimler/okunmamis — Okunmamış Sayısı
// ==========================================
router.get('/okunmamis', (req, res) => {
    const { rol = 'esnaf' } = req.query;
    const result = db.prepare(`
    SELECT COUNT(*) as sayi FROM bildirimler 
    WHERE okundu = 0 AND (hedef_rol = ? OR hedef_rol = 'hepsi')
  `).get(rol);
    res.json({ sayi: result.sayi });
});

// ==========================================
// PUT /api/bildirimler/:id/okundu — Tek Bildirim Okundu
// ==========================================
router.put('/:id/okundu', (req, res) => {
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// ==========================================
// PUT /api/bildirimler/toplu-okundu — Tümü Okundu
// ==========================================
router.put('/toplu-okundu', (req, res) => {
    const { rol = 'esnaf' } = req.body;
    db.prepare(`
    UPDATE bildirimler SET okundu = 1 
    WHERE okundu = 0 AND (hedef_rol = ? OR hedef_rol = 'hepsi')
  `).run(rol);
    res.json({ ok: true });
});

// ==========================================
// POST /api/bildirimler/whatsapp-gonder — WhatsApp Mesajı
// ==========================================
router.post('/whatsapp-gonder', async (req, res) => {
    const { siparis_id, durum } = req.body;
    if (!siparis_id || !durum) return res.status(400).json({ error: 'siparis_id ve durum zorunlu' });

    const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ?').get(siparis_id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    if (!siparis.telefon) return res.status(400).json({ error: 'Müşteri telefon numarası yok' });

    // Takip token oluştur (Yolda durumunda)
    let token = null;
    if (durum === 'Yolda') {
        const existing = db.prepare('SELECT token FROM musteri_takip WHERE siparis_id = ? AND aktif = 1').get(siparis_id);
        if (existing) {
            token = existing.token;
        } else {
            token = crypto.randomBytes(16).toString('hex');
            db.prepare('INSERT INTO musteri_takip (siparis_id, token) VALUES (?, ?)').run(siparis_id, token);
        }
    }

    // Mesaj oluştur
    const sablonFn = MESAJ_SABLONLARI[durum];
    if (!sablonFn) return res.json({ ok: true, mesaj: 'Bu durum için şablon yok' });
    const mesaj = sablonFn(siparis, token);

    // WhatsApp Client ile gönder
    const client = req.app.get('whatsappClient');
    if (!client) return res.json({ ok: false, mesaj: 'WhatsApp bağlı değil', whatsappGonderildi: false });

    try {
        let phone = siparis.telefon.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        if (phone.length === 10) phone = '90' + phone;
        const chatId = `${phone}@c.us`;

        const isRegistered = await client.isRegisteredUser(chatId);
        if (isRegistered) {
            await client.sendMessage(chatId, mesaj);
            res.json({ ok: true, whatsappGonderildi: true, mesaj });
        } else {
            res.json({ ok: true, whatsappGonderildi: false, mesaj: 'Numara WhatsApp kayıtlı değil' });
        }
    } catch (err) {
        console.error('WhatsApp gönderim hatası:', err);
        res.json({ ok: true, whatsappGonderildi: false, mesaj: err.message });
    }
});

// ==========================================
// GET /api/bildirimler/takip/:token — Public Sipariş Takip
// ==========================================
router.get('/takip/:token', (req, res) => {
    const takip = db.prepare('SELECT * FROM musteri_takip WHERE token = ? AND aktif = 1').get(req.params.token);
    if (!takip) return res.status(404).json({ error: 'Takip linki geçersiz veya süresi dolmuş' });

    const siparis = db.prepare(`
    SELECT s.*, m.ad as musteri_ad, m.soyad as musteri_soyad
    FROM siparisler s LEFT JOIN musteriler m ON s.musteri_id = m.id
    WHERE s.id = ?
  `).get(takip.siparis_id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const gecmis = db.prepare('SELECT * FROM siparis_gecmisi WHERE siparis_id = ? ORDER BY created_at ASC').all(takip.siparis_id);
    const kalemler = db.prepare('SELECT * FROM siparis_kalemleri WHERE siparis_id = ?').all(takip.siparis_id);

    res.json({
        id: siparis.id,
        musteriAdi: siparis.musteri_adi,
        durum: siparis.durum,
        adres: siparis.adres,
        tutar: siparis.toplam_tutar,
        odemeYontemi: siparis.odeme_yontemi,
        tarih: siparis.created_at,
        kalemler: kalemler.map(k => ({ ad: k.urun_adi, adet: k.adet, fiyat: k.birim_fiyat })),
        gecmis: gecmis.map(g => ({ durum: g.durum, tarih: g.created_at, not: g.not_text })),
    });
});

// ==========================================
// HELPER: Bildirim Oluştur (diğer route'lardan çağrılabilir)
// ==========================================
function bildirimOlustur(tip, baslik, mesaj, hedefRol = 'esnaf', siparisId = null) {
    const result = db.prepare(`
    INSERT INTO bildirimler (tip, baslik, mesaj, hedef_rol, siparis_id) VALUES (?, ?, ?, ?, ?)
  `).run(tip, baslik, mesaj, hedefRol, siparisId);
    return result.lastInsertRowid;
}

module.exports = router;
module.exports.bildirimOlustur = bildirimOlustur;
module.exports.MESAJ_SABLONLARI = MESAJ_SABLONLARI;
