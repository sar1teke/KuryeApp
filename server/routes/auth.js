// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authGerekli, JWT_SECRET } = require('../middleware/authMiddleware');

// ==========================================
// POST /api/auth/register — Yeni Kullanıcı Kaydı
// ==========================================
router.post('/register', (req, res) => {
    const { ad, soyad, email, sifre, rol, telefon } = req.body;

    if (!ad || !email || !sifre) {
        return res.status(400).json({ error: 'Ad, email ve şifre zorunludur.' });
    }

    if (sifre.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const gecerliRoller = ['esnaf', 'kurye', 'admin'];
    const kullaniciRol = gecerliRoller.includes(rol) ? rol : 'kurye';

    try {
        // Email kontrolü
        const mevcut = db.prepare('SELECT id FROM kullanicilar WHERE email = ?').get(email);
        if (mevcut) {
            return res.status(409).json({ error: 'Bu email adresi zaten kayıtlı.' });
        }

        const sifreHash = bcrypt.hashSync(sifre, 10);

        const result = db.prepare(`
            INSERT INTO kullanicilar (ad, soyad, email, sifre_hash, rol, telefon)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(ad, soyad || '', email, sifreHash, kullaniciRol, telefon || '');

        const kullanici = db.prepare('SELECT id, ad, soyad, email, rol FROM kullanicilar WHERE id = ?').get(result.lastInsertRowid);

        const token = jwt.sign({ id: kullanici.id, rol: kullanici.rol }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, kullanici });
    } catch (err) {
        console.error('Kayıt hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// POST /api/auth/login — Giriş Yap
// ==========================================
router.post('/login', (req, res) => {
    const { email, sifre } = req.body;

    if (!email || !sifre) {
        return res.status(400).json({ error: 'Email ve şifre zorunludur.' });
    }

    try {
        const kullanici = db.prepare('SELECT * FROM kullanicilar WHERE email = ?').get(email);
        if (!kullanici) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        if (!kullanici.aktif) {
            return res.status(403).json({ error: 'Hesabınız deaktif edilmiş.' });
        }

        const sifreGecerli = bcrypt.compareSync(sifre, kullanici.sifre_hash);
        if (!sifreGecerli) {
            return res.status(401).json({ error: 'Email veya şifre hatalı.' });
        }

        const token = jwt.sign({ id: kullanici.id, rol: kullanici.rol }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            kullanici: {
                id: kullanici.id,
                ad: kullanici.ad,
                soyad: kullanici.soyad,
                email: kullanici.email,
                rol: kullanici.rol
            }
        });
    } catch (err) {
        console.error('Giriş hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// GET /api/auth/me — Mevcut Kullanıcı Bilgisi
// ==========================================
router.get('/me', authGerekli, (req, res) => {
    res.json({ kullanici: req.kullanici });
});

module.exports = router;
