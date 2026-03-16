// server/routes/siparisler.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');
const { bildirimOlustur } = require('./bildirimler');

// ==========================================
// GET /api/siparisler?durum=Hazırlanıyor&aktif=true&arama=...&tarihBas=...&tarihBit=...
// Siparişleri Listele (Gelişmiş Filtreleme)
// ==========================================
router.get('/', (req, res) => {
    const { durum, aktif, arama, tarihBas, tarihBit, durumlar } = req.query;

    let sql = `
    SELECT s.*, m.ad as musteri_ad, m.soyad as musteri_soyad, m.telefon as musteri_telefon
    FROM siparisler s
    LEFT JOIN musteriler m ON s.musteri_id = m.id
  `;
    const params = [];
    const conditions = [];

    // aktif=true → silindi_mi=0, aktif=false → silindi_mi=1
    if (aktif === 'false') {
        conditions.push('s.silindi_mi = 1');
    } else {
        conditions.push('s.silindi_mi = 0');
    }

    // Tekli durum filtresi
    if (durum) {
        conditions.push('s.durum = ?');
        params.push(durum);
    }

    // Çoklu durum filtresi (durumlar=Hazır,Yolda,Kuryede)
    if (durumlar) {
        const durumListesi = durumlar.split(',').map(d => d.trim());
        const placeholders = durumListesi.map(() => '?').join(',');
        conditions.push(`s.durum IN (${placeholders})`);
        params.push(...durumListesi);
    }

    // Arama (müşteri adı, telefon, adres)
    if (arama) {
        conditions.push('(s.musteri_adi LIKE ? OR s.telefon LIKE ? OR s.adres LIKE ?)');
        const aramaParam = `%${arama}%`;
        params.push(aramaParam, aramaParam, aramaParam);
    }

    // Tarih aralığı
    if (tarihBas) {
        conditions.push('s.created_at >= ?');
        params.push(tarihBas);
    }
    if (tarihBit) {
        conditions.push('s.created_at <= ?');
        params.push(tarihBit);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY s.created_at DESC';

    const siparisler = db.prepare(sql).all(...params);

    // Her siparişe kalemlerini ekle
    const kalemStmt = db.prepare('SELECT * FROM siparis_kalemleri WHERE siparis_id = ?');
    const sonuc = siparisler.map(s => ({
        ...s,
        id: s.id,
        musteriAdi: s.musteri_adi,
        telefon: s.musteri_telefon || s.telefon,
        adres: s.adres,
        lat: s.lat,
        lng: s.lng,
        tutar: s.toplam_tutar,
        durum: s.durum,
        odemeYontemi: s.odeme_yontemi || 'Nakit',
        tarih: s.created_at,
        silindiMi: s.silindi_mi === 1,
        icerik: kalemStmt.all(s.id).map(k => `${k.adet}x ${k.urun_adi}`),
        kalemler: kalemStmt.all(s.id)
    }));

    res.json(sonuc);
});

// ==========================================
// GET /api/siparisler/:id — Tekil Sipariş Detay + Timeline
// ==========================================
router.get('/:id', (req, res) => {
    const siparis = db.prepare(`
        SELECT s.*, m.ad as musteri_ad, m.soyad as musteri_soyad, m.telefon as musteri_telefon
        FROM siparisler s
        LEFT JOIN musteriler m ON s.musteri_id = m.id
        WHERE s.id = ?
    `).get(req.params.id);

    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const kalemler = db.prepare('SELECT * FROM siparis_kalemleri WHERE siparis_id = ?').all(siparis.id);
    const gecmis = db.prepare('SELECT * FROM siparis_gecmisi WHERE siparis_id = ? ORDER BY created_at ASC').all(siparis.id);

    res.json({
        ...siparis,
        musteriAdi: siparis.musteri_adi,
        telefon: siparis.musteri_telefon || siparis.telefon,
        tutar: siparis.toplam_tutar,
        odemeYontemi: siparis.odeme_yontemi || 'Nakit',
        tarih: siparis.created_at,
        silindiMi: siparis.silindi_mi === 1,
        icerik: kalemler.map(k => `${k.adet}x ${k.urun_adi}`),
        kalemler,
        gecmis // Durum değişikliği timeline'ı
    });
});

// ==========================================
// POST /api/siparisler — Yeni Sipariş Oluştur
// ==========================================
router.post('/', (req, res) => {
    const { musteriAdi, telefon, adres, lat, lng, tutar, icerik, notlar, odemeYontemi, indirim_kodu, indirim_tutari, zamanlanmis_tarih, zamanlanmis_saat } = req.body;

    if (!musteriAdi) return res.status(400).json({ error: 'Müşteri adı zorunlu' });

    try {
        // 1. Müşteriyi bul veya oluştur
        let musteriId = null;
        const adParcalari = musteriAdi.trim().split(' ');
        const ad = adParcalari[0];
        const soyad = adParcalari.slice(1).join(' ');

        if (telefon) {
            const mevcutMusteri = db.prepare('SELECT id FROM musteriler WHERE telefon = ?').get(telefon);
            if (mevcutMusteri) {
                musteriId = mevcutMusteri.id;
                db.prepare(`
                    UPDATE musteriler SET adres = COALESCE(?, adres), lat = COALESCE(?, lat), 
                    lng = COALESCE(?, lng), siparis_sayisi = siparis_sayisi + 1, updated_at = datetime('now')
                    WHERE id = ?
                `).run(adres, lat, lng, musteriId);
            } else {
                const result = db.prepare(`
                    INSERT INTO musteriler (ad, soyad, telefon, adres, lat, lng, siparis_sayisi) 
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `).run(ad, soyad, telefon, adres || '', lat || null, lng || null);
                musteriId = result.lastInsertRowid;
            }
        } else {
            const result = db.prepare(`
                INSERT INTO musteriler (ad, soyad, adres, lat, lng, siparis_sayisi) 
                VALUES (?, ?, ?, ?, ?, 1)
            `).run(ad, soyad, adres || '', lat || null, lng || null);
            musteriId = result.lastInsertRowid;
        }

        // 2. Siparişi oluştur
        const siparisResult = db.prepare(`
            INSERT INTO siparisler (musteri_id, musteri_adi, telefon, adres, lat, lng, toplam_tutar, notlar, odeme_yontemi, durum, indirim_kodu, indirim_tutari, zamanlanmis_tarih, zamanlanmis_saat) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Alındı', ?, ?, ?, ?)
        `).run(
            musteriId, musteriAdi, telefon || '', adres || '', lat || null, lng || null, tutar || 0, notlar || '', odemeYontemi || 'Nakit', 
            indirim_kodu || null, indirim_tutari || 0, zamanlanmis_tarih || null, zamanlanmis_saat || null
        );

        const siparisId = siparisResult.lastInsertRowid;

        // 3. Kalemleri ekle ve stok düş
        if (icerik && Array.isArray(icerik)) {
            const kalemEkle = db.prepare(`
                INSERT INTO siparis_kalemleri (siparis_id, urun_adi, adet, birim_fiyat) VALUES (?, ?, ?, ?)
            `);
            const urunBul = db.prepare('SELECT id, stok_miktari FROM menu_urunler WHERE ad = ?');
            const stokDus = db.prepare('UPDATE menu_urunler SET stok_miktari = stok_miktari - ? WHERE id = ?');

            for (const item of icerik) {
                let uAd = '';
                let uAdet = 1;
                let uFiyat = 0;

                if (typeof item === 'string') {
                    const match = item.match(/^(\d+)x\s+(.+)$/);
                    if (match) {
                        uAd = match[2];
                        uAdet = parseInt(match[1]);
                    } else {
                        uAd = item;
                    }
                } else if (typeof item === 'object') {
                    uAd = item.urun_adi || item.ad;
                    uAdet = item.adet || 1;
                    uFiyat = item.birim_fiyat || item.fiyat || 0;
                }

                kalemEkle.run(siparisId, uAd, uAdet, uFiyat);

                // Stok Kontrol ve Düşme (Özellik 4)
                const gercekUrun = urunBul.get(uAd);
                if (gercekUrun && gercekUrun.stok_miktari >= 0) {
                    if (gercekUrun.stok_miktari < uAdet) {
                        // İşlemi manuel rollback yapıp hata fırlatalım
                        db.prepare('DELETE FROM siparisler WHERE id = ?').run(siparisId);
                        db.prepare('DELETE FROM siparis_kalemleri WHERE siparis_id = ?').run(siparisId);
                        throw new Error(`${uAd} stokta yetersiz. Kalan stok: ${gercekUrun.stok_miktari}`);
                    }
                    stokDus.run(uAdet, gercekUrun.id);
                }
            }
        }

        // 4. Sipariş geçmişine ilk kayıt (Alındı)
        db.prepare(`
            INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_ad)
            VALUES (?, 'Alındı', 'Sipariş oluşturuldu', 'Sistem')
        `).run(siparisId);

        // 5. Oluşturulan siparişi döndür
        const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ?').get(siparisId);
        const kalemler = db.prepare('SELECT * FROM siparis_kalemleri WHERE siparis_id = ?').all(siparisId);

        const newOrder = {
            ...siparis,
            musteriAdi: siparis.musteri_adi,
            telefon: siparis.telefon,
            tutar: siparis.toplam_tutar,
            odemeYontemi: siparis.odeme_yontemi,
            tarih: siparis.created_at,
            silindiMi: false,
            icerik: kalemler.map(k => `${k.adet}x ${k.urun_adi}`),
            kalemler
        };

        const io = req.app.get('io');
        if (io) {
            // Esnafın ayarlarını getirip otomatik yazdırma kontrolü yapmak için
            // (Şimdilik tek esnaf mantığı üzerinden tablodan ilk kaydı alıyoruz, 
            // çoklu esnaf mimarisinde session'dan/dükkandan çekilmeli)
            const dukkanAyari = db.prepare('SELECT otomatik_yazdir FROM dukkan_ayarlari LIMIT 1').get() || { otomatik_yazdir: 0 };
            
            io.emit('yeni_siparis', {
                ...newOrder,
                otomatikYazdirTetikle: !!dukkanAyari.otomatik_yazdir
            });
        }

        // In-app bildirim: Kuryelere yeni sipariş bildirimi
        const bildirimId = bildirimOlustur('yeni_siparis', 'Yeni Sipariş', `${musteriAdi} - ₺${tutar || 0}`, 'kurye', siparisId);
        if (io) {
            io.emit('bildirim_yeni', { id: bildirimId, tip: 'yeni_siparis', baslik: 'Yeni Sipariş', mesaj: `${musteriAdi} - ₺${tutar || 0}`, hedef_rol: 'kurye', siparis_id: siparisId, okundu: 0, created_at: new Date().toISOString() });
        }

        res.status(201).json(newOrder);

    } catch (err) {
        console.error('Sipariş oluşturma hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// PUT /api/siparisler/:id/durum — Durum Güncelle + Timeline Kaydı
// ==========================================
router.put('/:id/durum', (req, res) => {
    const { durum, not } = req.body;
    if (!durum) return res.status(400).json({ error: 'Durum zorunlu' });

    // Geçerli durumlar kontrolü
    const gecerliDurumlar = ['Alındı', 'Hazırlanıyor', 'Hazır', 'Kuryede', 'Yolda', 'Teslim Edildi', 'İptal'];
    if (!gecerliDurumlar.includes(durum)) {
        return res.status(400).json({ error: 'Geçersiz durum değeri.' });
    }

    const extras = {};
    if (durum === 'Teslim Edildi') extras.teslim_zamani = new Date().toISOString();

    db.prepare(`
        UPDATE siparisler SET durum = ?, teslim_zamani = COALESCE(?, teslim_zamani), updated_at = datetime('now') WHERE id = ?
    `).run(durum, extras.teslim_zamani || null, req.params.id);

    // Sipariş geçmişine kayıt (Timeline)
    const degistiren = req.kullanici ? `${req.kullanici.ad} ${req.kullanici.soyad}` : 'Sistem';
    const degistirenId = req.kullanici ? req.kullanici.id : null;

    db.prepare(`
        INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_id, degistiren_ad)
        VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, durum, not || '', degistirenId, degistiren);

    const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ?').get(req.params.id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const updatedOrder = {
        ...siparis,
        musteriAdi: siparis.musteri_adi,
        tutar: siparis.toplam_tutar,
        odemeYontemi: siparis.odeme_yontemi
    };

    const io = req.app.get('io');
    if (io) {
        io.emit('siparis_durum_degisti', updatedOrder);
    }

    // In-app bildirim oluştur
    const bildirimBaslik = `Sipariş #${siparis.id} — ${durum}`;
    const bildirimMesaj = `${siparis.musteri_adi} siparişi: ${durum}`;
    const hedefRol = ['Yolda', 'Teslim Edildi'].includes(durum) ? 'esnaf' : ['Hazır'].includes(durum) ? 'kurye' : 'hepsi';
    const bildirimId = bildirimOlustur('siparis_durum', bildirimBaslik, bildirimMesaj, hedefRol, siparis.id);
    if (io) {
        io.emit('bildirim_yeni', { id: bildirimId, tip: 'siparis_durum', baslik: bildirimBaslik, mesaj: bildirimMesaj, hedef_rol: hedefRol, siparis_id: siparis.id, okundu: 0, created_at: new Date().toISOString() });
    }

    // WhatsApp bildirim (asenkron, hata durumunu engelleme)
    if (siparis.telefon && ['Hazırlanıyor', 'Hazır', 'Yolda', 'Teslim Edildi', 'İptal'].includes(durum)) {
        (async () => {
            try {
                const fetch = globalThis.fetch || require('node-fetch');
                await fetch(`http://localhost:3001/api/bildirimler/whatsapp-gonder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ siparis_id: siparis.id, durum })
                });
            } catch (e) { console.log('WhatsApp bildirim hatası (önemsiz):', e.message); }
        })();
    }

    res.json(updatedOrder);
});

// ==========================================
// PUT /api/siparisler/:id/kurye-ata — Kurye Kendini Siparişe Ata
// ==========================================
router.put('/:id/kurye-ata', (req, res) => {
    const kuryeId = req.kullanici.id;
    const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ? AND silindi_mi = 0').get(req.params.id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    if (siparis.kurye_id && siparis.kurye_id !== kuryeId) return res.status(400).json({ error: 'Bu sipariş başka bir kuryeye atanmış.' });

    db.prepare(`
        UPDATE siparisler SET kurye_id = ?, durum = 'Yolda', updated_at = datetime('now') WHERE id = ?
    `).run(kuryeId, req.params.id);

    // Timeline
    db.prepare(`
        INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_id, degistiren_ad)
        VALUES (?, 'Yolda', 'Kurye görevi aldı', ?, ?)
    `).run(req.params.id, kuryeId, `${req.kullanici.ad} ${req.kullanici.soyad}`);

    const updated = db.prepare('SELECT * FROM siparisler WHERE id = ?').get(req.params.id);
    const updatedOrder = { ...updated, musteriAdi: updated.musteri_adi, tutar: updated.toplam_tutar, odemeYontemi: updated.odeme_yontemi };

    const io = req.app.get('io');
    if (io) {
        io.emit('siparis_durum_degisti', updatedOrder);
        io.emit('bildirim_yeni', { tip: 'kurye_atandi', baslik: `Kurye Atandı #${updated.id}`, mesaj: `${req.kullanici.ad} görevi aldı`, hedef_rol: 'esnaf', siparis_id: updated.id, okundu: 0, created_at: new Date().toISOString() });
    }

    // In-app bildirim
    const { bildirimOlustur } = require('./bildirimler');
    bildirimOlustur('kurye_atandi', `Kurye Atandı #${updated.id}`, `${req.kullanici.ad} görevi aldı`, 'esnaf', updated.id);

    res.json(updatedOrder);
});

// ==========================================
// PUT /api/siparisler/:id/esnaf-kurye-ata — Esnaf Siparişe Kurye Atar
// ==========================================
router.put('/:id/esnaf-kurye-ata', (req, res) => {
    const { kurye_id } = req.body;
    if (!kurye_id) return res.status(400).json({ error: 'Kurye ID zorunlu' });

    const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ? AND silindi_mi = 0').get(req.params.id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const kurye = db.prepare("SELECT id, ad, soyad FROM kullanicilar WHERE id = ? AND rol = 'kurye'").get(kurye_id);
    if (!kurye) return res.status(404).json({ error: 'Kurye bulunamadı' });

    db.prepare("UPDATE siparisler SET kurye_id = ?, updated_at = datetime('now') WHERE id = ?").run(kurye_id, req.params.id);

    // Timeline
    const degistiren = req.kullanici ? `${req.kullanici.ad} ${req.kullanici.soyad}` : 'Sistem';
    db.prepare(`INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_id, degistiren_ad) VALUES (?, ?, ?, ?, ?)`)
        .run(req.params.id, siparis.durum, `Kurye atandı: ${kurye.ad} ${kurye.soyad}`, req.kullanici?.id, degistiren);

    const io = req.app.get('io');
    if (io) {
        io.emit('siparis_durum_degisti', { id: siparis.id, durum: siparis.durum, kurye_id });
        io.emit('bildirim_yeni', { tip: 'kurye_atandi', baslik: `Görev Atandı #${siparis.id}`, mesaj: `${siparis.musteri_adi} teslimatı size atandı`, hedef_rol: 'kurye', siparis_id: siparis.id, okundu: 0, created_at: new Date().toISOString() });
    }

    const { bildirimOlustur } = require('./bildirimler');
    bildirimOlustur('kurye_atandi', `Görev Atandı #${siparis.id}`, `${siparis.musteri_adi} teslimatı`, 'kurye', siparis.id);

    res.json({ success: true, kurye });
});

// ==========================================
// PUT /api/siparisler/:id/iptal — Sipariş İptal Et (Nedenli)
// ==========================================
router.put('/:id/iptal', (req, res) => {
    const { neden } = req.body;
    const siparis = db.prepare('SELECT * FROM siparisler WHERE id = ? AND silindi_mi = 0').get(req.params.id);
    if (!siparis) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    db.prepare("UPDATE siparisler SET durum = 'İptal', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    const degistiren = req.kullanici ? `${req.kullanici.ad} ${req.kullanici.soyad}` : 'Sistem';
    db.prepare(`INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_id, degistiren_ad) VALUES (?, 'İptal', ?, ?, ?)`)
        .run(req.params.id, neden || 'İptal edildi', req.kullanici?.id, degistiren);

    const io = req.app.get('io');
    if (io) io.emit('siparis_durum_degisti', { id: siparis.id, durum: 'İptal' });

    const { bildirimOlustur } = require('./bildirimler');
    bildirimOlustur('siparis_iptal', `Sipariş İptal #${siparis.id}`, neden || 'İptal edildi', 'esnaf', siparis.id);

    res.json({ success: true });
});

// ==========================================
// DELETE /api/siparisler/:id (Soft Delete)
// ==========================================
router.delete('/:id', (req, res) => {
    db.prepare("UPDATE siparisler SET silindi_mi = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    // Timeline kaydı
    const degistiren = req.kullanici ? `${req.kullanici.ad} ${req.kullanici.soyad}` : 'Sistem';
    db.prepare(`
        INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_ad)
        VALUES (?, 'Silindi', 'Sipariş silindi', ?)
    `).run(req.params.id, degistiren);

    const io = req.app.get('io');
    if (io) io.emit('siparis_silindi', { id: req.params.id });

    res.json({ success: true });
});

// ==========================================
// PUT /api/siparisler/:id/geri-yukle
// ==========================================
router.put('/:id/geri-yukle', (req, res) => {
    db.prepare("UPDATE siparisler SET silindi_mi = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    const io = req.app.get('io');
    if (io) io.emit('siparis_geri_yuklendi', { id: req.params.id });

    res.json({ success: true });
});

// ==========================================
// PUT /api/siparisler/:id/kurye-ata
// Siparişe kurye ata (özel veya genel havuzdan)
// body: { kurye_id, kurye_kaynagi: 'ozel'|'genel' }
// ==========================================
router.put('/:id/kurye-ata', (req, res) => {
    const { kurye_id, kurye_kaynagi = 'genel' } = req.body;
    const siparisId = req.params.id;

    if (!kurye_id) {
        return res.status(400).json({ error: 'kurye_id zorunludur.' });
    }

    try {
        // Kuryenin var olduğunu ve aktif olduğunu kontrol et
        const kurye = db.prepare("SELECT id, ad, soyad, kurye_tipi, kurye_durumu FROM kullanicilar WHERE id = ? AND rol = 'kurye' AND aktif = 1")
            .get(kurye_id);

        if (!kurye) return res.status(404).json({ error: 'Kurye bulunamadı veya aktif değil.' });

        // Siparişi güncelle
        db.prepare(`
            UPDATE siparisler SET 
                kurye_id = ?, 
                kurye_kaynagi = ?,
                durum = 'Kuryede',
                updated_at = datetime('now')
            WHERE id = ?
        `).run(kurye_id, kurye_kaynagi, siparisId);

        // Timeline kaydı
        const degistiren = req.kullanici ? `${req.kullanici.ad} ${req.kullanici.soyad}` : 'Sistem';
        db.prepare(`
            INSERT INTO siparis_gecmisi (siparis_id, durum, not_text, degistiren_ad)
            VALUES (?, 'Kuryede', ?, ?)
        `).run(siparisId, `Kurye atandı: ${kurye.ad} ${kurye.soyad} (${kurye_kaynagi})`, degistiren);

        const io = req.app.get('io');
        if (io) {
            io.emit('siparis_guncellendi', { id: siparisId, durum: 'Kuryede', kurye_id });
            io.emit('kurye_atandi', { siparis_id: siparisId, kurye_id, kurye_kaynagi });
        }

        res.json({ success: true, kurye: { id: kurye.id, ad: kurye.ad, soyad: kurye.soyad } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

