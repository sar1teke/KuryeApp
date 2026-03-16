const http = require('http');

const orders = [
    {
        musteriAdi: "Deniz Yıldız",
        telefon: "05559998877",
        adres: "Çamlık Parkı Girişi, Denizli Merkez q=37.7550,29.0910",
        lat: 37.7550,
        lng: 29.0910,
        tutar: 250,
        icerik: ["2x Hamburger", "1x Kola"],
        notlar: "Hızlı gelsin"
    },
    {
        musteriAdi: "Caner Kara",
        telefon: "05443332211",
        adres: "Teras Park AVM, Yenişehir, Denizli q=37.7650,29.0490",
        lat: 37.7650,
        lng: 29.0490,
        tutar: 420,
        icerik: ["1x Karışık Pizza", "2x Ayran"],
        notlar: "Zile basmayın"
    }
];

orders.forEach(order => {
    const data = JSON.stringify(order);
    const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/siparisler',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => console.log('Sipariş Eklendi:', responseBody));
    });
    req.write(data);
    req.end();
});
