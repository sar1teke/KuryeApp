// src/features/esnaf/IstatistikKartlari.jsx
const IstatistikKartlari = ({ siparisler }) => {
  const bugun = new Date().toISOString().slice(0, 10);
  const bugunkuSiparisler = siparisler.filter(s => s.tarih && s.tarih.startsWith(bugun));
  const ciro = bugunkuSiparisler.filter(s => s.durum !== 'İptal').reduce((t, s) => t + (s.tutar || 0), 0);
  const bekleyen = siparisler.filter(s => ['Alındı', 'Hazırlanıyor'].includes(s.durum)).length;
  const yolda = siparisler.filter(s => ['Yolda', 'Kuryede', 'Hazır'].includes(s.durum)).length;
  const teslim = siparisler.filter(s => s.durum === 'Teslim Edildi' && s.tarih?.startsWith(bugun)).length;
  const iptal = siparisler.filter(s => s.durum === 'İptal' && s.tarih?.startsWith(bugun)).length;

  // Ort teslimat süresi (dakika)
  const teslimler = bugunkuSiparisler.filter(s => s.durum === 'Teslim Edildi' && s.teslim_zamani);
  let ortTeslimat = '-';
  if (teslimler.length > 0) {
    const toplam = teslimler.reduce((t, s) => {
      const fark = new Date(s.teslim_zamani).getTime() - new Date(s.tarih).getTime();
      return t + (fark > 0 ? fark / 60000 : 0);
    }, 0);
    ortTeslimat = `${Math.round(toplam / teslimler.length)}dk`;
  }

  // Ort sepet
  const ortSepet = bugunkuSiparisler.length > 0 ? ciro / bugunkuSiparisler.filter(s => s.durum !== 'İptal').length : 0;

  const kartlar = [
    { baslik: 'Günlük Ciro', deger: `₺${ciro.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`, renk: 'border-l-emerald-500', alt: `${bugunkuSiparisler.length} sipariş`, ikon: '💰' },
    { baslik: 'Ort. Sepet', deger: `₺${ortSepet.toFixed(0)}`, renk: 'border-l-blue-500', alt: `${teslim} teslim`, ikon: '🛒' },
    { baslik: 'Bekleyen', deger: bekleyen, renk: bekleyen > 0 ? 'border-l-amber-500' : 'border-l-gray-300', alt: 'mutfakta', ikon: '⏳' },
    { baslik: 'Yolda', deger: yolda, renk: 'border-l-violet-500', alt: 'aktif teslimat', ikon: '🚀' },
    { baslik: 'Ort. Teslimat', deger: ortTeslimat, renk: 'border-l-cyan-500', alt: 'süre', ikon: '⏱️' },
    { baslik: 'İptal', deger: iptal, renk: iptal > 0 ? 'border-l-red-400' : 'border-l-gray-300', alt: 'bugün', ikon: '❌' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {kartlar.map((k, i) => (
        <div key={i} className={`card border-l-[3px] ${k.renk} p-4`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-gray-500 font-medium">{k.baslik}</p>
            <span className="text-sm">{k.ikon}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{k.deger}</p>
          {k.alt && <p className="text-[10px] text-gray-400 mt-0.5">{k.alt}</p>}
        </div>
      ))}
    </div>
  );
};

export default IstatistikKartlari;