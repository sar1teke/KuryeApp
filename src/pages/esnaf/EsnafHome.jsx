import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SiparisServisi } from '../../api/siparisService';
import { AuthServisi } from '../../api/authService';
import SiparisKart from '../../features/esnaf/SiparisKart';
import SiparisDetayModal from '../../features/esnaf/SiparisDetayModal';
import IstatistikKartlari from '../../features/esnaf/IstatistikKartlari';
import { adisyonYazdir } from '../../utils/printService';

const API = 'http://localhost:3001/api';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

const DURUM_TABS = [
  { key: 'hepsi', label: 'Tümü' },
  { key: 'Alındı', label: 'Alındı' },
  { key: 'Hazırlanıyor', label: 'Hazırlanıyor' },
  { key: 'Hazır', label: 'Hazır' },
  { key: 'Yolda', label: 'Yolda' },
  { key: 'Teslim Edildi', label: 'Teslim' },
];

const EsnafHome = () => {
  const [tumSiparisler, setTumSiparisler] = useState([]);
  const [seciliSiparis, setSeciliSiparis] = useState(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [musaitKuryeler, setMusaitKuryeler] = useState([]);
  const [iptalModal, setIptalModal] = useState(null);
  const [iptalNeden, setIptalNeden] = useState('');
  const sonSiparisSayisi = useRef(0);
  const sesRef = useRef(null);

  useEffect(() => {
    veriGetir();
    kuryeListesiGetir();
    import('socket.io-client').then(({ io }) => {
      const socket = io('http://localhost:3001');
      socket.on('yeni_siparis', (siparis) => { 
        yeniSiparisSesi(); 
        veriGetir(); 
        
        // Otomatik yazdırma ayarı açıksa adisyon çıkar
        if (siparis && siparis.otomatikYazdirTetikle) {
          adisyonYazdir(siparis);
        }
      });
      socket.on('siparis_durum_degisti', () => veriGetir());
      socket.on('siparis_silindi', () => veriGetir());
      socket.on('siparis_geri_yuklendi', () => veriGetir());
      return () => socket.disconnect();
    });
  }, []);

  const veriGetir = async () => {
    const data = await SiparisServisi.getSiparisler(true);
    // Yeni sipariş sesi kontrolü
    if (sonSiparisSayisi.current > 0 && data.length > sonSiparisSayisi.current) {
      yeniSiparisSesi();
    }
    sonSiparisSayisi.current = data.length;
    setTumSiparisler(data);
  };

  const kuryeListesiGetir = async () => {
    try {
      const res = await authFetch(`${API}/kuryeler`);
      if (res.ok) {
        const data = await res.json();
        setMusaitKuryeler((data || []).filter(k => k.kurye_durumu === 'aktif' || k.aktif));
      }
    } catch (e) { console.error(e); }
  };

  const yeniSiparisSesi = () => {
    try {
      if (!sesRef.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        sesRef.current = ctx;
      }
      const ctx = sesRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.3;
      o.start(); o.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine'; o2.frequency.value = 1100;
        g2.gain.value = 0.3;
        o2.start(); o2.stop(ctx.currentTime + 0.2);
      }, 180);
    } catch (e) { /* ses desteği yoksa sessiz kal */ }
  };

  const durumDegistir = async (id, yeniDurum) => {
    setTumSiparisler(prev => prev.map(s => s.id === id ? { ...s, durum: yeniDurum } : s));
    await SiparisServisi.durumGuncelle(id, yeniDurum);
  };

  const iptalEt = async () => {
    if (!iptalModal) return;
    await SiparisServisi.siparisIptalEt(iptalModal, iptalNeden || 'Belirtilmedi');
    setIptalModal(null); setIptalNeden('');
    veriGetir();
  };

  const kuryeAta = async (siparisId, kuryeId) => {
    await SiparisServisi.esnafKuryeAta(siparisId, kuryeId);
    veriGetir();
  };

  // Filtreleme
  const filtrelenmis = tumSiparisler.filter(s => {
    if (durumFiltre !== 'hepsi' && s.durum !== durumFiltre) return false;
    if (aramaMetni) {
      const q = aramaMetni.toLowerCase();
      return (
        (s.musteriAdi || '').toLowerCase().includes(q) ||
        (s.telefon || '').includes(q) ||
        (s.adres || '').toLowerCase().includes(q) ||
        String(s.id).includes(q)
      );
    }
    return true;
  });

  // Her durum için sayım
  const durumSayilari = {};
  tumSiparisler.forEach(s => { durumSayilari[s.durum] = (durumSayilari[s.durum] || 0) + 1; });

  return (
    <div className="pb-10">
      <IstatistikKartlari siparisler={tumSiparisler} />

      {/* Search + Filters */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Sipariş, müşteri, telefon ara..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)}
              className="input-field !pl-9 !py-2" />
          </div>
          <div className="flex gap-2">
            <Link to="/esnaf/yeni-siparis">
              <button className="btn-primary !py-2">+ Yeni Sipariş</button>
            </Link>
          </div>
        </div>

        {/* Durum Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {DURUM_TABS.map(t => {
            const count = t.key === 'hepsi' ? tumSiparisler.length : (durumSayilari[t.key] || 0);
            return (
              <button key={t.key} onClick={() => setDurumFiltre(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${durumFiltre === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t.label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Grid */}
      {filtrelenmis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p className="text-sm">{aramaMetni ? 'Arama sonucu bulunamadı.' : 'Bu kriterlere uygun sipariş yok.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrelenmis.map(siparis => (
            <SiparisKart
              key={siparis.id}
              siparis={siparis}
              onDetayTikla={() => setSeciliSiparis(siparis)}
              onDurumDegistir={durumDegistir}
              onIptal={(id) => setIptalModal(id)}
              onKuryeAta={kuryeAta}
              musaitKuryeler={musaitKuryeler}
            />
          ))}
        </div>
      )}

      {/* İptal Modal */}
      {iptalModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-modal w-full max-w-sm border border-gray-200 animate-slide-up">
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Sipariş İptal</h3>
              <p className="text-xs text-gray-500 mb-4">Sipariş #{iptalModal} iptal edilecek. Lütfen bir neden belirtin.</p>
              <div className="space-y-2 mb-4">
                {['Müşteri vazgeçti', 'Stok yetersiz', 'Teslimat alanı dışı', 'Mükerrer sipariş', 'Diğer'].map(n => (
                  <button key={n} onClick={() => setIptalNeden(n)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${iptalNeden === n ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'}`}>
                    {n}
                  </button>
                ))}
              </div>
              {iptalNeden === 'Diğer' && (
                <textarea placeholder="İptal nedenini yazın..." value={iptalNeden === 'Diğer' ? '' : iptalNeden}
                  onChange={e => setIptalNeden(e.target.value || 'Diğer')}
                  className="input-field !resize-none mb-4" rows="2" />
              )}
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button onClick={() => { setIptalModal(null); setIptalNeden(''); }} className="btn-secondary flex-1">Vazgeç</button>
              <button onClick={iptalEt} disabled={!iptalNeden}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">İptal Et</button>
            </div>
          </div>
        </div>
      )}

      {seciliSiparis && <SiparisDetayModal siparis={seciliSiparis} kapat={() => setSeciliSiparis(null)} />}
    </div>
  );
};

export default EsnafHome;