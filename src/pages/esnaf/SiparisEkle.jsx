// src/pages/esnaf/SiparisEkle.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuServisi } from '../../api/menuService';
import { SiparisServisi } from '../../api/siparisService';
import { MusteriServisi } from '../../api/musteriService';
import { AuthServisi } from '../../api/authService';

const SiparisEkle = () => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [seciliKategori, setSeciliKategori] = useState("Tümü");
  const [sepet, setSepet] = useState([]);
  const [musteriBilgi, setMusteriBilgi] = useState({ ad: '', soyad: '', adres: '', telefon: '' });
  const [musteriOneriler, setMusteriOneriler] = useState([]);
  const [oneriGoster, setOneriGoster] = useState(false);
  const [seciliMusteri, setSeciliMusteri] = useState(null);
  const aramaTimeout = useRef(null);
  const [odemeYontemi, setOdemeYontemi] = useState('Nakit');
  const [whatsappModalAcik, setWhatsappModalAcik] = useState(false);
  const [simulasyonAdim, setSimulasyonAdim] = useState("");
  const [indirimKodu, setIndirimKodu] = useState('');
  const [indirimTutari, setIndirimTutari] = useState(0);
  const [indirimMesaj, setIndirimMesaj] = useState({ text: '', ok: false });
  const [teslimatTipi, setTeslimatTipi] = useState('Hemen');
  const [zamanlanmisTarih, setZamanlanmisTarih] = useState('');
  const [zamanlanmisSaat, setZamanlanmisSaat] = useState('');
  
  // Teslimat Bölgeleri State
  const [teslimatBolgeleri, setTeslimatBolgeleri] = useState([]);
  const [bolgeUcreti, setBolgeUcreti] = useState(0);
  const [bolgeMinTutar, setBolgeMinTutar] = useState(0);
  const [uygunBolgeAdi, setUygunBolgeAdi] = useState('');
  const [uygunBolgeYok, setUygunBolgeYok] = useState(false);

  const kategoriler = ["Tümü", ...new Set(menu.map(m => m.kategori))];

  useEffect(() => { 
    MenuServisi.getMenu().then(setMenu); 
    fetch('http://localhost:3001/api/ayarlar/teslimat-bolgeleri', { headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader() } })
      .then(res => res.json())
      .then(setTeslimatBolgeleri)
      .catch(console.error);
  }, []);

  const isPointInPolygon = (point, vs) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    if (musteriBilgi.lat && musteriBilgi.lng && teslimatBolgeleri.length > 0) {
      const pt = [parseFloat(musteriBilgi.lat), parseFloat(musteriBilgi.lng)];
      let found = null;
      for (const b of teslimatBolgeleri) {
        try {
          const poly = JSON.parse(b.polygon_json);
          if (isPointInPolygon(pt, poly)) { found = b; break; }
        } catch {}
      }
      if (found) {
        setBolgeUcreti(found.teslimat_ucreti || 0);
        setBolgeMinTutar(found.min_tutar || 0);
        setUygunBolgeAdi(found.ad);
        setUygunBolgeYok(false);
      } else {
        setBolgeUcreti(0); setBolgeMinTutar(0); setUygunBolgeAdi(''); setUygunBolgeYok(true);
      }
    } else {
        setBolgeUcreti(0); setBolgeMinTutar(0); setUygunBolgeAdi(''); setUygunBolgeYok(false);
    }
  }, [musteriBilgi.lat, musteriBilgi.lng, teslimatBolgeleri]);

  const sepeteEkle = (urun) => {
    if (urun.stok_miktari === 0) return alert('Bu ürün tükendi!');
    const var_ = sepet.find(i => i.id === urun.id);
    const eklenecekAdet = var_ ? var_.adet + 1 : 1;
    if (urun.stok_miktari > 0 && eklenecekAdet > urun.stok_miktari) {
      return alert(`Stokta sadece ${urun.stok_miktari} adet var!`);
    }
    if (var_) setSepet(sepet.map(i => i.id === urun.id ? { ...i, adet: i.adet + 1 } : i));
    else setSepet([...sepet, { ...urun, adet: 1 }]);
  };

  const adetAzalt = (id) => {
    const u = sepet.find(i => i.id === id);
    if (!u) return;
    if (u.adet > 1) setSepet(sepet.map(i => i.id === id ? { ...i, adet: i.adet - 1 } : i));
    else setSepet(sepet.filter(i => i.id !== id));
  };

  const whatsappKonumCek = async () => {
    if (!musteriBilgi.telefon) { alert("Lütfen önce telefon giriniz!"); return; }
    setWhatsappModalAcik(true); setSimulasyonAdim("Bağlanılıyor...");
    try {
      const status = await (await fetch('http://localhost:3001/api/status')).json();
      if (!status.isReady) { setSimulasyonAdim("WhatsApp bağlı değil!"); return; }
      setSimulasyonAdim(`${musteriBilgi.telefon} konumu bekleniyor...`);
      const res = await fetch(`http://localhost:3001/api/location/${musteriBilgi.telefon}`);
      if (res.ok) {
        const data = await res.json();
        setSimulasyonAdim("Konum bulundu!");
        setTimeout(() => {
          setWhatsappModalAcik(false);
          const link = `https://maps.google.com/?q=${data.latitude},${data.longitude}`;
          setMusteriBilgi(p => ({ ...p, adres: data.address ? `${data.address} (${link})` : `${data.latitude}, ${data.longitude} (${link})` }));
        }, 1000);
      } else { setSimulasyonAdim("Konum bulunamadı."); setTimeout(() => setWhatsappModalAcik(false), 3000); }
    } catch { setSimulasyonAdim("Sunucuya bağlanılamadı."); setTimeout(() => setWhatsappModalAcik(false), 3000); }
  };

  const araToplam = sepet.reduce((t, u) => t + (u.fiyat * u.adet), 0);
  const toplamTutar = Math.max(0, araToplam - indirimTutari) + bolgeUcreti;

  const indirimDogrula = async () => {
    if (!indirimKodu.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/kampanyalar/dogrula', { method: 'POST', headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader() }, body: JSON.stringify({ kod: indirimKodu, tutar: araToplam }) });
      const data = await res.json();
      if (res.ok && data.gecerli) { setIndirimTutari(data.indirim); setIndirimMesaj({ text: `${data.kampanya.ad}: -₺${data.indirim.toFixed(2)}`, ok: true }); }
      else { setIndirimTutari(0); setIndirimMesaj({ text: data.error || 'Geçersiz kod', ok: false }); }
    } catch { setIndirimTutari(0); setIndirimMesaj({ text: 'Sunucu hatası', ok: false }); }
  };

  const indirimKaldir = () => { setIndirimKodu(''); setIndirimTutari(0); setIndirimMesaj({ text: '', ok: false }); };

  const musteriAramaYap = (deger) => {
    setMusteriBilgi(p => ({ ...p, ad: deger })); setSeciliMusteri(null);
    if (aramaTimeout.current) clearTimeout(aramaTimeout.current);
    if (deger.length < 2) { setMusteriOneriler([]); setOneriGoster(false); return; }
    aramaTimeout.current = setTimeout(async () => {
      const s = await MusteriServisi.musteriAra(deger);
      setMusteriOneriler(s); setOneriGoster(s.length > 0);
    }, 300);
  };

  const musteriSec = (m) => {
    setMusteriBilgi({ ad: m.soyad ? `${m.ad} ${m.soyad}` : m.ad, soyad: m.soyad || '', telefon: m.telefon || '', adres: m.adres || '' });
    setSeciliMusteri(m); setOneriGoster(false); setMusteriOneriler([]);
  };

  const siparisiTamamla = async () => {
    if (sepet.length === 0) return alert("Sepet boş!");
    if (!musteriBilgi.ad || !musteriBilgi.adres) return alert("Müşteri bilgileri eksik!");
    if (teslimatTipi === 'Ileri' && (!zamanlanmisTarih || !zamanlanmisSaat)) return alert('Lütfen teslimat tarihini ve saatini seçin!');
    if (uygunBolgeYok) return alert("Müşteri konumu hiçbir sipariş bölgesi içinde değil!");
    if (bolgeMinTutar > 0 && araToplam < bolgeMinTutar) return alert(`Bu bölge için minimum sepet tutarı ₺${bolgeMinTutar} olmalıdır!`);
    
    await SiparisServisi.siparisEkle({ 
        musteriAdi: musteriBilgi.ad, adres: musteriBilgi.adres, telefon: musteriBilgi.telefon, tutar: toplamTutar, 
        icerik: sepet.map(u => `${u.adet}x ${u.ad}`), odemeYontemi, 
        indirim_kodu: indirimMesaj.ok ? indirimKodu : null, indirim_tutari: indirimTutari,
        zamanlanmis_tarih: teslimatTipi === 'Ileri' ? zamanlanmisTarih : null,
        zamanlanmis_saat: teslimatTipi === 'Ileri' ? zamanlanmisSaat : null
    });
    alert("Sipariş oluşturuldu!"); navigate('/esnaf');
  };

  const gosterilecek = seciliKategori === "Tümü" ? menu : menu.filter(u => u.kategori === seciliKategori);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-4 overflow-hidden relative">
      {/* WhatsApp Modal */}
      {whatsappModalAcik && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in">
          <div className="card p-6 flex flex-col items-center gap-3 max-w-sm w-full">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-sm font-semibold text-gray-800">Konum Getiriliyor</h3>
            <p className="text-xs text-gray-500 text-center">{simulasyonAdim}</p>
          </div>
        </div>
      )}

      {/* LEFT: Menu */}
      <div className="flex-[2] flex flex-col card overflow-hidden">
        <div className="flex gap-1.5 p-3 border-b border-gray-100 overflow-x-auto bg-gray-50">
          {kategoriler.map(k => (
            <button key={k} onClick={() => setSeciliKategori(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${seciliKategori === k ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{k}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 bg-[#f8f9fb]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {gosterilecek.map(urun => (
              <button key={urun.id} onClick={() => sepeteEkle(urun)} disabled={urun.stok_miktari === 0}
                className={`card !shadow-xs p-3 text-left transition-all flex flex-col justify-between h-24 select-none relative ${urun.stok_miktari === 0 ? 'opacity-60 cursor-not-allowed grayscale-[50%]' : 'hover:border-primary-300 hover:shadow-md active:scale-[0.98]'}`}>
                <div className="flex justify-between items-start gap-1">
                  <span className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">{urun.ad}</span>
                  {urun.stok_miktari > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded whitespace-nowrap">Stok: {urun.stok_miktari}</span>}
                </div>
                <div className="flex justify-between items-end mt-1">
                  {urun.stok_miktari === 0 ? <span className="text-[11px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Tükendi</span> : <div />}
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">₺{urun.fiyat}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-800">Adisyon</h2>
          <span className="badge bg-gray-100 text-gray-600">{sepet.reduce((a, i) => a + i.adet, 0)} ürün</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50">
          {sepet.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              <span className="text-xs">Sepet boş</span>
            </div>
          ) : sepet.map(urun => (
            <div key={urun.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded text-xs min-w-[32px] text-center">{urun.adet}x</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{urun.ad}</p>
                  <p className="text-[11px] text-gray-400">₺{urun.fiyat} × {urun.adet} = ₺{(urun.fiyat * urun.adet).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => adetAzalt(urun.id)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition text-sm">−</button>
            </div>
          ))}
        </div>

        {/* Customer & Submit */}
        <div className="p-4 bg-white space-y-3 border-t border-gray-100">
          <p className="section-title">Müşteri</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input type="text" placeholder="Müşteri Adı" value={musteriBilgi.ad} onChange={e => musteriAramaYap(e.target.value)}
                onFocus={() => musteriOneriler.length > 0 && setOneriGoster(true)}
                onBlur={() => setTimeout(() => setOneriGoster(false), 200)}
                className={`input-field ${seciliMusteri ? '!border-emerald-400 !bg-emerald-50' : ''}`} />
              {oneriGoster && musteriOneriler.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-50 max-h-40 overflow-y-auto">
                  {musteriOneriler.map(m => (
                    <button key={m.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => musteriSec(m)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-800">{m.ad} {m.soyad}</span>
                      <span className="text-[11px] text-gray-400">{m.siparis_sayisi || 0} sipariş</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="tel" placeholder="Telefon" value={musteriBilgi.telefon} onChange={e => setMusteriBilgi({ ...musteriBilgi, telefon: e.target.value })} className="input-field" />
          </div>
          <div className="relative">
            <textarea placeholder="Adres" rows="2" value={musteriBilgi.adres} onChange={e => setMusteriBilgi({ ...musteriBilgi, adres: e.target.value })}
              className="input-field !resize-none pr-20" />
            <button type="button" onClick={whatsappKonumCek} className="absolute right-2 top-2 text-xs font-medium text-primary-600 hover:bg-primary-50 px-2 py-1 rounded transition">Konum Çek</button>
          </div>

          {/* Teslimat Tipi */}
          <div>
            <p className="section-title mb-1.5">Teslimat Zamanı</p>
            <div className="flex gap-1.5 mb-2">
              <button type="button" onClick={() => setTeslimatTipi('Hemen')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${teslimatTipi === 'Hemen' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>Hemen</button>
              <button type="button" onClick={() => setTeslimatTipi('Ileri')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${teslimatTipi === 'Ileri' ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>İleri Tarihli</button>
            </div>
            {teslimatTipi === 'Ileri' && (
              <div className="flex gap-2 animate-fade-in">
                <input type="date" className="input-field !text-xs !py-1.5" value={zamanlanmisTarih} onChange={e => setZamanlanmisTarih(e.target.value)} />
                <input type="time" className="input-field !text-xs !py-1.5" value={zamanlanmisSaat} onChange={e => setZamanlanmisSaat(e.target.value)} />
              </div>
            )}
          </div>

          {/* Payment */}
          <div>
            <p className="section-title mb-1.5">Ödeme</p>
            <div className="flex gap-1.5 flex-wrap">
              {['Nakit', 'Kart', 'Havale', 'Online', 'Açık Hesap'].map(y => (
                <button key={y} type="button" onClick={() => setOdemeYontemi(y)}
                  className={`flex-1 min-w-[60px] py-2 rounded-lg text-xs font-medium border transition-colors ${odemeYontemi === y ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{y}</button>
              ))}
            </div>
          </div>

          {/* İndirim Kodu */}
          <div>
            <p className="section-title mb-1.5">İndirim Kodu</p>
            <div className="flex gap-1.5">
              <input type="text" placeholder="Kod girin..." className="input-field flex-1 !uppercase !text-xs" value={indirimKodu} onChange={e => setIndirimKodu(e.target.value)} disabled={indirimMesaj.ok} />
              {indirimMesaj.ok ? (
                <button onClick={indirimKaldir} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium bg-red-50 hover:bg-red-100 transition-colors">Kaldır</button>
              ) : (
                <button onClick={indirimDogrula} className="px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 text-xs font-medium bg-primary-50 hover:bg-primary-100 transition-colors">Uygula</button>
              )}
            </div>
            {indirimMesaj.text && (
              <p className={`text-[11px] mt-1 font-medium ${indirimMesaj.ok ? 'text-emerald-600' : 'text-red-500'}`}>{indirimMesaj.ok ? '✓' : '✗'} {indirimMesaj.text}</p>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-gray-100">
            {uygunBolgeAdi && (
              <div className="flex justify-between items-center bg-blue-50/50 p-1.5 rounded text-xs mb-1 border border-blue-100/50">
                <span className="text-blue-700 font-medium tracking-tight">📍 {uygunBolgeAdi}</span>
                <span className="text-blue-600 opacity-90">Min: ₺{bolgeMinTutar}</span>
              </div>
            )}
            {uygunBolgeYok && (
              <div className="bg-red-50 text-red-600 p-1.5 rounded text-[11px] font-medium mb-1 text-center border border-red-100 shadow-sm shadow-red-500/10">
                Uyarı: Konum hizmet bölgeleri dışında!
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Ara Toplam</span>
              <span className="text-sm text-gray-600">₺{araToplam.toFixed(2)}</span>
            </div>
            {indirimTutari > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-600">İndirim</span>
                <span className="text-sm text-emerald-600 font-medium">-₺{indirimTutari.toFixed(2)}</span>
              </div>
            )}
            {bolgeUcreti > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Teslimat Ücreti</span>
                <span className="text-sm text-gray-600">₺{bolgeUcreti.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-medium text-gray-700">Toplam</span>
              <span className="text-xl font-bold text-gray-900">₺{toplamTutar.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={siparisiTamamla} className="btn-primary w-full !py-2.5">Siparişi Onayla</button>
        </div>
      </div>
    </div>
  );
};

export default SiparisEkle;