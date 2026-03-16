const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const port = 3001;

// Socket.io Kurulumu
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log('📡 Yeni Socket Bağlantısı:', socket.id);

    // Kurye konum bildirimi
    socket.on('kurye_konum_guncelle', (data) => {
        // Tüm esnaf panellerine kuryenin son konumunu ilet
        io.emit('kurye_canli_konum', data);
    });

    socket.on('disconnect', () => {
        console.log('📡 Socket Koptu:', socket.id);
    });
});

app.use(cors());
app.use(express.json());

// Veritabanını başlat
const db = require('./database');
console.log('✅ SQLite veritabanı başlatıldı.');

// API Route'ları
const { authGerekli } = require('./middleware/authMiddleware');
const musteriRouter = require('./routes/musteriler');
const siparisRouter = require('./routes/siparisler');
const menuRouter = require('./routes/menu');
const authRouter = require('./routes/auth');
const raporRouter = require('./routes/raporlar');
const kuryeRouter = require('./routes/kuryeler');
const bildirimRouter = require('./routes/bildirimler');
const ayarlarRouter = require('./routes/ayarlar');
const kampanyaRouter = require('./routes/kampanyalar');
const posRouter = require('./routes/pos');

// Public route'lar
app.use('/api/auth', authRouter);
app.use('/api/bildirimler', bildirimRouter);

// Auth gerektiren route'lar
app.use('/api/musteriler', authGerekli, musteriRouter);
app.use('/api/siparisler', authGerekli, siparisRouter);
app.use('/api/menu', authGerekli, menuRouter);
app.use('/api/raporlar', authGerekli, raporRouter);
app.use('/api/kuryeler', authGerekli, kuryeRouter);
app.use('/api/ayarlar', ayarlarRouter); // kendi içinde authGerekli var
app.use('/api/kampanyalar', authGerekli, kampanyaRouter);
app.use('/api/pos', posRouter); // kendi içinde authGerekli ve rolGerekli var
// WhatsApp Client Başlat
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

let qrCodeData = null;
let isReady = false;

client.on('qr', (qr) => {
    console.log('QR Kodu Alındı:', qr.substring(0, 20) + '...');
    qrCodeData = qr;
    isReady = false;
});

client.on('ready', () => {
    console.log('WhatsApp Bağlantısı Hazır!');
    qrCodeData = null;
    isReady = true;
    app.set('whatsappClient', client);
});

client.on('latam', (msg) => {
    // Sadece loglama, demo için değil.
    // console.log("Canlı: ", msg.id);
});

client.initialize();

// Helper: URL'den koordinat çıkarma (Basit Regex)
const parseCoordinatesFromUrl = (url) => {
    // google.com/maps?q=lat,lng
    const regex = /q=([-\d.]+),([-\d.]+)/;
    const match = url.match(regex);
    if (match) return { latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) };
    return null;
}

// 2. Konum Getir (Gelişmiş - Geçmiş Taramalı)
app.get('/api/location/:phone', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp bağlı değil.' });

    try {
        let rawPhone = req.params.phone.replace(/\D/g, ''); // Sadece rakamlar

        // Numara Normalizasyonu (Türkiye Odaklı)
        // 0555 -> 90555
        if (rawPhone.startsWith('0')) rawPhone = rawPhone.substring(1);
        if (rawPhone.length === 10) rawPhone = '90' + rawPhone;

        const chatId = `${rawPhone}@c.us`;
        console.log(`🔍 Arama Başlatıldı: ${req.params.phone} -> ${chatId}`);

        // Chat'i bulmaya çalış
        let chat;
        try {
            chat = await client.getChatById(chatId);
        } catch (e) {
            console.log("Chat ID ile bulunamadı, numara kontrol ediliyor...");
        }

        if (!chat) {
            // Belki numara rehberde kayıtlı değildir, direkt check edelim
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                console.log("❌ Numara WhatsApp'ta kayıtlı değil.");
                return res.status(404).json({ error: 'Bu numara WhatsApp kullanmıyor.' });
            }
            // Kayıtlıysa ama chat nesnesi yoksa (hiç mesajlaşılmamışsa)
            try {
                chat = await client.getChatById(chatId);
            } catch (e) {
                return res.status(404).json({ error: 'Sohbet başlatılamadı.' });
            }
        }

        console.log("💬 Sohbet bulundu, mesajlar taranıyor...");

        // Son 100 mesajı çek (Daha geriye gitmek performansı etkileyebilir)
        const messages = await chat.fetchMessages({ limit: 100 });

        // Sondan başa doğru tara
        let foundLocation = null;

        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];

            // 1. Tip: Doğrudan Konum Mesajı
            if (msg.type === 'location' || (msg.location && msg.location.latitude)) {
                foundLocation = {
                    latitude: msg.location.latitude,
                    longitude: msg.location.longitude,
                    address: msg.location.description || msg.body || 'Konum Mesajı',
                    timestamp: msg.timestamp,
                    type: 'native'
                };
                break;
            }

            // 2. Tip: Link İçeren Mesaj (Google Maps Linki)
            // Örn: "Şuradayım: https://maps.google.com/?q=..."
            if (msg.body.includes('maps.google.com') || msg.body.includes('goo.gl')) {
                // Basit koordinat çıkarma deneyelim
                const coords = parseCoordinatesFromUrl(msg.body);
                if (coords) {
                    foundLocation = {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        address: msg.body, // Linkin tamamını adres gibi gösterelim
                        timestamp: msg.timestamp,
                        type: 'link'
                    };
                    break;
                }
            }
        }

        if (foundLocation) {
            console.log("✅ KONUM BULUNDU:", foundLocation);
            res.json(foundLocation);
        } else {
            console.log("⚠️ Son 100 mesajda konum bulunamadı.");
            res.status(404).json({ error: 'Son 100 mesajda konum bulunamadı.' });
        }

    } catch (error) {
        console.error("Hata:", error);
        res.status(500).json({ error: error.message });
    }
});

// 1. Durum Kontrolü
app.get('/api/status', (req, res) => {
    res.json({ isReady, qr: qrCodeData });
});

// 3. QR Kod Görseli
app.get('/api/qr-image', async (req, res) => {
    if (!qrCodeData) return res.status(404).send('QR kodu yok.');
    try {
        const img = await qrcode.toDataURL(qrCodeData);
        res.send(`<img src="${img}" />`);
    } catch (err) {
        res.status(500).send('QR hatası');
    }
});

server.listen(port, () => {
    console.log(`Backend sunucusu http://localhost:${port} adresinde çalışıyor`);
});
