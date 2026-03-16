// server/routes/raporlar.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// ==========================================
// GET /api/raporlar/ozet — Özet İstatistikler
// ?donem=gunluk|haftalik|aylik
// ==========================================
router.get('/ozet', (req, res) => {
    const { donem = 'gunluk' } = req.query;

    let tarihFiltre;
    switch (donem) {
        case 'haftalik': tarihFiltre = "datetime('now', '-7 days')"; break;
        case 'aylik': tarihFiltre = "datetime('now', '-30 days')"; break;
        default: tarihFiltre = "datetime('now', 'start of day')";
    }

    try {
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as toplam_siparis,
                COALESCE(SUM(toplam_tutar), 0) as toplam_ciro,
                COALESCE(AVG(toplam_tutar), 0) as ortalama_sepet,
                COALESCE(SUM(CASE WHEN durum = 'Teslim Edildi' THEN 1 ELSE 0 END), 0) as teslim_edilen,
                COALESCE(SUM(CASE WHEN durum = 'İptal' THEN 1 ELSE 0 END), 0) as iptal_edilen,
                COALESCE(SUM(CASE WHEN durum IN ('Yolda', 'Kuryede') THEN 1 ELSE 0 END), 0) as yoldaki
            FROM siparisler 
            WHERE silindi_mi = 0 AND created_at >= ${tarihFiltre}
        `).get();

        const oncekiStats = db.prepare(`
            SELECT COALESCE(SUM(toplam_tutar), 0) as onceki_ciro
            FROM siparisler 
            WHERE silindi_mi = 0 
            AND created_at >= ${tarihFiltre.replace("'now'", "'now', '-" + (donem === 'aylik' ? '60' : donem === 'haftalik' ? '14' : '1') + " days'")}
            AND created_at < ${tarihFiltre}
        `).get();

        const basariOrani = stats.toplam_siparis > 0
            ? ((stats.teslim_edilen / stats.toplam_siparis) * 100).toFixed(1)
            : 0;

        const ciroDegisim = oncekiStats.onceki_ciro > 0
            ? (((stats.toplam_ciro - oncekiStats.onceki_ciro) / oncekiStats.onceki_ciro) * 100).toFixed(1)
            : 0;

        res.json({
            toplamSiparis: stats.toplam_siparis,
            toplamCiro: stats.toplam_ciro,
            ortalamaSeped: stats.ortalama_sepet,
            teslimEdilen: stats.teslim_edilen,
            iptalEdilen: stats.iptal_edilen,
            yoldaki: stats.yoldaki,
            basariOrani: parseFloat(basariOrani),
            ciroDegisim: parseFloat(ciroDegisim)
        });
    } catch (err) {
        console.error('Özet rapor hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/gunluk-ciro — Günlere Göre Ciro
// ?gun=7|30
// ==========================================
router.get('/gunluk-ciro', (req, res) => {
    const { gun = 7 } = req.query;

    try {
        const rows = db.prepare(`
            SELECT 
                DATE(created_at) as tarih,
                COUNT(*) as siparis_sayisi,
                COALESCE(SUM(toplam_tutar), 0) as ciro
            FROM siparisler 
            WHERE silindi_mi = 0 AND created_at >= datetime('now', '-${parseInt(gun)} days')
            GROUP BY DATE(created_at)
            ORDER BY tarih ASC
        `).all();

        // Eksik günleri doldur
        const sonuc = [];
        const bugun = new Date();
        for (let i = parseInt(gun) - 1; i >= 0; i--) {
            const tarih = new Date(bugun);
            tarih.setDate(tarih.getDate() - i);
            const tarihStr = tarih.toISOString().split('T')[0];
            const mevcut = rows.find(r => r.tarih === tarihStr);

            const gunAdi = tarih.toLocaleDateString('tr-TR', { weekday: 'short' });
            sonuc.push({
                tarih: tarihStr,
                gun: gunAdi,
                ciro: mevcut ? mevcut.ciro : 0,
                siparisSayisi: mevcut ? mevcut.siparis_sayisi : 0
            });
        }

        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/en-cok-satanlar — Top 10 Ürün
// ==========================================
router.get('/en-cok-satanlar', (req, res) => {
    const { gun = 30 } = req.query;

    try {
        const rows = db.prepare(`
            SELECT 
                sk.urun_adi as ad,
                SUM(sk.adet) as toplam_adet,
                SUM(sk.adet * sk.birim_fiyat) as toplam_gelir
            FROM siparis_kalemleri sk
            JOIN siparisler s ON sk.siparis_id = s.id
            WHERE s.silindi_mi = 0 AND s.created_at >= datetime('now', '-${parseInt(gun)} days')
            GROUP BY sk.urun_adi
            ORDER BY toplam_adet DESC
            LIMIT 10
        `).all();

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/kategori-dagilimi — Kategoriye Göre Gelir
// ==========================================
router.get('/kategori-dagilimi', (req, res) => {
    const { gun = 30 } = req.query;

    try {
        const rows = db.prepare(`
            SELECT 
                COALESCE(mu.kategori, 'Diğer') as kategori,
                COUNT(DISTINCT s.id) as siparis_sayisi,
                SUM(sk.adet) as toplam_adet,
                SUM(sk.adet * sk.birim_fiyat) as toplam_gelir
            FROM siparis_kalemleri sk
            JOIN siparisler s ON sk.siparis_id = s.id
            LEFT JOIN menu_urunler mu ON sk.urun_adi = mu.ad
            WHERE s.silindi_mi = 0 AND s.created_at >= datetime('now', '-${parseInt(gun)} days')
            GROUP BY COALESCE(mu.kategori, 'Diğer')
            ORDER BY toplam_gelir DESC
        `).all();

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/kurye-performans — Kurye Bazlı İstatistikler
// ==========================================
router.get('/kurye-performans', (req, res) => {
    try {
        const kuryeler = db.prepare(`
            SELECT id, ad, soyad, email, telefon FROM kullanicilar WHERE rol = 'kurye' AND aktif = 1
        `).all();

        const sonuc = kuryeler.map(k => {
            const stats = db.prepare(`
                SELECT 
                    COUNT(*) as toplam_teslimat,
                    SUM(CASE WHEN durum = 'Teslim Edildi' THEN 1 ELSE 0 END) as basarili,
                    AVG(
                        CASE WHEN teslim_zamani IS NOT NULL AND created_at IS NOT NULL 
                        THEN (julianday(teslim_zamani) - julianday(created_at)) * 24 * 60
                        ELSE NULL END
                    ) as ortalama_sure_dk
                FROM siparisler 
                WHERE kurye_id = ? AND silindi_mi = 0
            `).get(k.id);

            return {
                id: k.id,
                ad: k.ad,
                soyad: k.soyad,
                email: k.email,
                telefon: k.telefon,
                toplamTeslimat: stats?.toplam_teslimat || 0,
                basarili: stats?.basarili || 0,
                basariOrani: stats?.toplam_teslimat > 0
                    ? ((stats.basarili / stats.toplam_teslimat) * 100).toFixed(1)
                    : '0',
                ortalamaSure: stats?.ortalama_sure_dk ? Math.round(stats.ortalama_sure_dk) : '-'
            };
        });

        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/musteri-analitik — Müşteri Analizi
// ==========================================
router.get('/musteri-analitik', (req, res) => {
    try {
        const toplamMusteri = db.prepare('SELECT COUNT(*) as sayi FROM musteriler').get().sayi;
        const tekrarMusteri = db.prepare('SELECT COUNT(*) as sayi FROM musteriler WHERE siparis_sayisi > 1').get().sayi;

        const enCokSiparisVerenler = db.prepare(`
            SELECT m.ad, m.soyad, m.telefon, m.siparis_sayisi,
                   COALESCE(SUM(s.toplam_tutar), 0) as toplam_harcama
            FROM musteriler m
            LEFT JOIN siparisler s ON m.id = s.musteri_id AND s.silindi_mi = 0
            GROUP BY m.id
            ORDER BY m.siparis_sayisi DESC
            LIMIT 10
        `).all();

        res.json({
            toplamMusteri,
            tekrarMusteri,
            tekrarOrani: toplamMusteri > 0 ? ((tekrarMusteri / toplamMusteri) * 100).toFixed(1) : 0,
            enCokSiparisVerenler
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/kar-zarar — Kâr/Zarar Analizi
// ==========================================
router.get('/kar-zarar', (req, res) => {
    const { gun = 30 } = req.query;

    try {
        const rows = db.prepare(`
            SELECT 
                sk.urun_adi as ad,
                SUM(sk.adet) as toplam_adet,
                SUM(sk.adet * sk.birim_fiyat) as toplam_satis,
                COALESCE(mu.alis_fiyati, 0) as alis_fiyati,
                SUM(sk.adet * COALESCE(mu.alis_fiyati, 0)) as toplam_maliyet
            FROM siparis_kalemleri sk
            JOIN siparisler s ON sk.siparis_id = s.id
            LEFT JOIN menu_urunler mu ON sk.urun_adi = mu.ad
            WHERE s.silindi_mi = 0 AND s.created_at >= datetime('now', '-${parseInt(gun)} days')
            GROUP BY sk.urun_adi
            ORDER BY (SUM(sk.adet * sk.birim_fiyat) - SUM(sk.adet * COALESCE(mu.alis_fiyati, 0))) DESC
        `).all();

        const toplamSatis = rows.reduce((t, r) => t + r.toplam_satis, 0);
        const toplamMaliyet = rows.reduce((t, r) => t + r.toplam_maliyet, 0);
        const toplamKar = toplamSatis - toplamMaliyet;

        res.json({
            urunler: rows.map(r => ({
                ...r,
                kar: r.toplam_satis - r.toplam_maliyet,
                karMarji: r.toplam_satis > 0
                    ? (((r.toplam_satis - r.toplam_maliyet) / r.toplam_satis) * 100).toFixed(1)
                    : '0'
            })),
            toplamSatis,
            toplamMaliyet,
            toplamKar,
            karMarji: toplamSatis > 0 ? ((toplamKar / toplamSatis) * 100).toFixed(1) : '0'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/csv-export — CSV Dışa Aktarım
// ?tip=siparisler|musteriler
// ==========================================
router.get('/csv-export', (req, res) => {
    const { tip = 'siparisler' } = req.query;

    try {
        let csv = '';

        if (tip === 'siparisler') {
            const rows = db.prepare(`
                SELECT s.id, s.musteri_adi, s.telefon, s.adres, s.durum, 
                       s.toplam_tutar, s.odeme_yontemi, s.created_at, s.teslim_zamani
                FROM siparisler s WHERE s.silindi_mi = 0
                ORDER BY s.created_at DESC
            `).all();

            csv = 'ID,Müşteri,Telefon,Adres,Durum,Tutar,Ödeme,Tarih,Teslim\n';
            rows.forEach(r => {
                csv += `${r.id},"${r.musteri_adi}","${r.telefon}","${r.adres}",${r.durum},${r.toplam_tutar},${r.odeme_yontemi},${r.created_at},${r.teslim_zamani || ''}\n`;
            });
        } else if (tip === 'musteriler') {
            const rows = db.prepare(`
                SELECT id, ad, soyad, telefon, adres, siparis_sayisi, created_at FROM musteriler ORDER BY siparis_sayisi DESC
            `).all();

            csv = 'ID,Ad,Soyad,Telefon,Adres,Sipariş Sayısı,Kayıt Tarihi\n';
            rows.forEach(r => {
                csv += `${r.id},"${r.ad}","${r.soyad}","${r.telefon}","${r.adres}",${r.siparis_sayisi},${r.created_at}\n`;
            });
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${tip}_rapor.csv`);
        // BOM for Turkish chars in Excel
        res.send('\ufeff' + csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/musteri-detay — Gelişmiş Müşteri Analitik
// ==========================================
router.get('/musteri-detay', (req, res) => {
    try {
        // En çok harcayanlar (Top 10)
        const enCokHarcayanlar = db.prepare(`
            SELECT m.id, m.ad, m.soyad, m.telefon, m.siparis_sayisi,
                   COALESCE(SUM(s.toplam_tutar), 0) as toplam_harcama,
                   MAX(s.created_at) as son_siparis,
                   COALESCE(AVG(s.toplam_tutar), 0) as ort_sepet
            FROM musteriler m
            LEFT JOIN siparisler s ON m.id = s.musteri_id AND s.silindi_mi = 0 AND s.durum != 'İptal'
            GROUP BY m.id
            ORDER BY toplam_harcama DESC
            LIMIT 10
        `).all();

        // En sık sipariş verenler (Top 10)
        const enSikVerenler = db.prepare(`
            SELECT m.id, m.ad, m.soyad, m.telefon, m.siparis_sayisi,
                   COALESCE(SUM(s.toplam_tutar), 0) as toplam_harcama,
                   MAX(s.created_at) as son_siparis
            FROM musteriler m
            LEFT JOIN siparisler s ON m.id = s.musteri_id AND s.silindi_mi = 0 AND s.durum != 'İptal'
            GROUP BY m.id
            ORDER BY m.siparis_sayisi DESC
            LIMIT 10
        `).all();

        // Son 7 gün aktif müşteri
        const haftalikAktif = db.prepare(`
            SELECT COUNT(DISTINCT musteri_id) as sayi
            FROM siparisler
            WHERE silindi_mi = 0 AND created_at >= datetime('now', '-7 days')
        `).get().sayi;

        // Son 30 gün günlük müşteri trendi
        const musteriTrend = [];
        const bugun = new Date();
        for (let i = 29; i >= 0; i--) {
            const tarih = new Date(bugun);
            tarih.setDate(tarih.getDate() - i);
            const tarihStr = tarih.toISOString().split('T')[0];
            const row = db.prepare(`
                SELECT COUNT(DISTINCT musteri_id) as musteri_sayisi,
                       COUNT(*) as siparis_sayisi,
                       COALESCE(SUM(toplam_tutar), 0) as ciro
                FROM siparisler
                WHERE silindi_mi = 0 AND DATE(created_at) = ?
            `).get(tarihStr);
            musteriTrend.push({
                tarih: tarihStr,
                gun: tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                musteriSayisi: row?.musteri_sayisi || 0,
                siparisSayisi: row?.siparis_sayisi || 0,
                ciro: row?.ciro || 0
            });
        }

        // Müşteri segmentleri
        const toplamMusteri = db.prepare('SELECT COUNT(*) as s FROM musteriler').get().s;
        const vipMusteri = db.prepare('SELECT COUNT(*) as s FROM musteriler WHERE siparis_sayisi >= 5').get().s;
        const duzenliMusteri = db.prepare('SELECT COUNT(*) as s FROM musteriler WHERE siparis_sayisi >= 2 AND siparis_sayisi < 5').get().s;
        const tekSefer = db.prepare('SELECT COUNT(*) as s FROM musteriler WHERE siparis_sayisi <= 1').get().s;

        // Hafta günlerine göre sipariş dağılımı (0=Pazar, 6=Cumartesi)
        const gunDagilimi = db.prepare(`
            SELECT
                CASE CAST(strftime('%w', created_at) as INTEGER)
                    WHEN 0 THEN 'Pzr' WHEN 1 THEN 'Pzt' WHEN 2 THEN 'Sal'
                    WHEN 3 THEN 'Çar' WHEN 4 THEN 'Per' WHEN 5 THEN 'Cum' WHEN 6 THEN 'Cmt'
                END as gun,
                COUNT(*) as siparis, COUNT(DISTINCT musteri_id) as musteri
            FROM siparisler WHERE silindi_mi = 0 AND created_at >= datetime('now', '-30 days')
            GROUP BY strftime('%w', created_at) ORDER BY CAST(strftime('%w', created_at) as INTEGER)
        `).all();

        // Saat dağılımı
        const saatDagilimi = db.prepare(`
            SELECT CAST(strftime('%H', created_at) as INTEGER) as saat, COUNT(*) as siparis
            FROM siparisler WHERE silindi_mi = 0 AND created_at >= datetime('now', '-30 days')
            GROUP BY saat ORDER BY saat
        `).all();

        // Ort. sipariş tutarı
        const ortTutar = db.prepare(`
            SELECT COALESCE(AVG(toplam_tutar), 0) as ort
            FROM siparisler WHERE silindi_mi = 0 AND durum != 'İptal'
        `).get().ort;

        res.json({
            enCokHarcayanlar,
            enSikVerenler,
            haftalikAktif,
            musteriTrend,
            segment: { toplam: toplamMusteri, vip: vipMusteri, duzenli: duzenliMusteri, tekSefer },
            gunDagilimi,
            saatDagilimi,
            ortTutar: parseFloat(ortTutar.toFixed(2))
        });
    } catch (err) {
        console.error('Müşteri detay rapor hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/raporlar/gun-sonu — Kasa Kapanış Raporu
// ?tarih=YYYY-MM-DD (varsayılan bugün)
// ==========================================
router.get('/gun-sonu', (req, res) => {
    const tarih = req.query.tarih || new Date().toISOString().split('T')[0];
    try {
        // Genel istatistikler
        const genel = db.prepare(`
            SELECT
                COUNT(*) as toplam_siparis,
                COALESCE(SUM(toplam_tutar), 0) as toplam_ciro,
                COALESCE(AVG(toplam_tutar), 0) as ort_sepet,
                COALESCE(SUM(CASE WHEN durum = 'Teslim Edildi' THEN 1 ELSE 0 END), 0) as teslim,
                COALESCE(SUM(CASE WHEN durum = 'İptal' THEN 1 ELSE 0 END), 0) as iptal,
                COALESCE(SUM(CASE WHEN durum = 'Teslim Edildi' THEN toplam_tutar ELSE 0 END), 0) as teslim_ciro,
                COALESCE(SUM(CASE WHEN durum = 'İptal' THEN toplam_tutar ELSE 0 END), 0) as iptal_ciro,
                COALESCE(SUM(indirim_tutari), 0) as toplam_indirim
            FROM siparisler
            WHERE silindi_mi = 0 AND DATE(created_at) = ?
        `).get(tarih);

        // Ödeme yöntemi dağılımı
        const odemeDagilimi = db.prepare(`
            SELECT odeme_yontemi, COUNT(*) as adet, COALESCE(SUM(toplam_tutar), 0) as tutar
            FROM siparisler
            WHERE silindi_mi = 0 AND durum = 'Teslim Edildi' AND DATE(created_at) = ?
            GROUP BY odeme_yontemi ORDER BY tutar DESC
        `).all(tarih);

        // Kurye performansları
        const kuryePerformans = db.prepare(`
            SELECT k.ad || ' ' || k.soyad as kurye_adi,
                COUNT(*) as teslimat,
                COALESCE(SUM(s.toplam_tutar), 0) as toplam
            FROM siparisler s
            JOIN kullanicilar k ON s.kurye_id = k.id
            WHERE s.silindi_mi = 0 AND s.durum = 'Teslim Edildi' AND DATE(s.created_at) = ?
            GROUP BY s.kurye_id ORDER BY teslimat DESC
        `).all(tarih);

        // Saatlik dağılım
        const saatlik = db.prepare(`
            SELECT CAST(strftime('%H', created_at) AS INTEGER) as saat,
                COUNT(*) as adet,
                COALESCE(SUM(toplam_tutar), 0) as tutar
            FROM siparisler
            WHERE silindi_mi = 0 AND DATE(created_at) = ?
            GROUP BY saat ORDER BY saat
        `).all(tarih);

        res.json({
            tarih,
            genel,
            odemeDagilimi,
            kuryePerformans,
            saatlik,
            netCiro: genel.teslim_ciro - genel.toplam_indirim
        });
    } catch (err) {
        console.error('Gün sonu rapor hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

