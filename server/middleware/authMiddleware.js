// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'kuryeapp_gizli_anahtar_2026';

// Token doğrulama middleware
function authGerekli(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli. Lütfen giriş yapın.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const kullanici = db.prepare('SELECT id, ad, soyad, email, rol, aktif FROM kullanicilar WHERE id = ?').get(decoded.id);

        if (!kullanici || !kullanici.aktif) {
            return res.status(401).json({ error: 'Geçersiz veya deaktif kullanıcı.' });
        }

        req.kullanici = kullanici;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
    }
}

// Rol kontrol middleware
function rolGerekli(...roller) {
    return (req, res, next) => {
        if (!req.kullanici) {
            return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
        }
        if (!roller.includes(req.kullanici.rol)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }
        next();
    };
}

module.exports = { authGerekli, rolGerekli, JWT_SECRET };
