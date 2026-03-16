import { useState, useEffect } from 'react';
import ProfilTab from './tabs/ProfilTab';
import HaritaTab from './tabs/HaritaTab';
import SiparisTab from './tabs/SiparisTab';
import BildirimMerkezi from '../../components/BildirimMerkezi';
import { AuthServisi } from '../../api/authService';

const KuryeHome = () => {
  const [aktifTab, setAktifTab] = useState('siparis');
  const [dukkanKonum, setDukkanKonum] = useState(null);
  const [kuryeKonum, setKuryeKonum] = useState(null);
  const [gpsHata, setGpsHata] = useState(null);
  const [odakSiparis, setOdakSiparis] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const DUKKAN_LAT = 37.7997, DUKKAN_LNG = 29.0197;
    const k = localStorage.getItem('dukkan_ayarlari');
    if (k) { const a = JSON.parse(k); setDukkanKonum(a.enlem && a.boylam ? { lat: parseFloat(a.enlem), lng: parseFloat(a.boylam) } : { lat: DUKKAN_LAT, lng: DUKKAN_LNG }); }
    else setDukkanKonum({ lat: DUKKAN_LAT, lng: DUKKAN_LNG });

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (p) => { setKuryeKonum({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsHata(null); },
        () => { setGpsHata("GPS Kapalı"); setKuryeKonum({ lat: 37.7749, lng: 29.0875 }); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else { setKuryeKonum({ lat: 37.7749, lng: 29.0875 }); setGpsHata("Desteklenmiyor"); }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  useEffect(() => { let s; import('socket.io-client').then(({ io }) => { s = io('http://localhost:3001'); setSocket(s); }); return () => { if (s) s.disconnect(); }; }, []);

  useEffect(() => {
    if (!kuryeKonum || !socket) return;
    const k = AuthServisi.getKullanici();
    socket.emit('kurye_konum_guncelle', { kuryeId: k?.id || 'kurye_1', ad: k?.ad || 'Kurye', soyad: k?.soyad || '', lat: kuryeKonum.lat, lng: kuryeKonum.lng, sonGuncelleme: new Date().toISOString() });
  }, [kuryeKonum?.lat, kuryeKonum?.lng, socket]);

  const mesafeHesapla = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const haritaAc = (adres, tip) => {
    let origin = kuryeKonum ? `origin=${kuryeKonum.lat},${kuryeKonum.lng}` : '';
    let dest;
    if (tip === 'dukkan' && dukkanKonum) dest = `destination=${dukkanKonum.lat},${dukkanKonum.lng}`;
    else { const m = adres.match(/q=([-\d.]+),([-\d.]+)/); dest = `destination=${m ? `${m[1]},${m[2]}` : encodeURIComponent(adres)}`; }
    window.open(`https://www.google.com/maps/dir/?api=1&${origin}&${dest}&travelmode=driving`, '_blank');
  };

  const dahiliRotaAc = (s) => { setOdakSiparis(s); setAktifTab('harita'); };

  const tabs = [
    { id: 'siparis', label: 'Görevler', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { id: 'harita', label: 'Harita', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg> },
    { id: 'profil', label: 'Profil', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fb] font-['Inter',sans-serif] overflow-hidden relative">
      {/* Top Bar */}
      <div className="px-5 py-3.5 bg-white border-b border-gray-100 z-20 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900 tracking-tight">KuryeApp</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {gpsHata ? (
              <span className="text-[10px] font-medium text-red-500">{gpsHata}</span>
            ) : kuryeKonum ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-gray-400">GPS Aktif</span></>
            ) : (
              <span className="text-[10px] text-gray-400 animate-pulse">Konum aranıyor...</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Durum badge removed — managed in ProfilTab via DB */}
          <BildirimMerkezi rol="kurye" />
          <button onClick={() => setAktifTab('profil')} className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
            {(() => { const k = AuthServisi.getKullanici(); return (k?.ad?.charAt(0) || 'K') + (k?.soyad?.charAt(0) || ''); })()}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 relative z-0">
        {aktifTab === 'siparis' && <SiparisTab kuryeKonum={kuryeKonum} dukkanKonum={dukkanKonum} mesafeHesapla={mesafeHesapla} haritaAc={haritaAc} dahiliRotaAc={dahiliRotaAc} />}
        <div className={`h-full w-full ${aktifTab === 'harita' ? 'block' : 'hidden'}`}>
          <HaritaTab kuryeKonum={kuryeKonum} dukkanKonum={dukkanKonum} odakSiparis={odakSiparis} haritaKapat={() => setAktifTab('siparis')} aktifTab={aktifTab} />
        </div>
        {aktifTab === 'profil' && <ProfilTab />}
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-5 left-0 right-0 z-40 flex justify-center px-6 pointer-events-none">
        <div className="bg-white border border-gray-200 shadow-card rounded-2xl px-2 py-1.5 flex items-center gap-1 pointer-events-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAktifTab(t.id)}
              className={`flex flex-col items-center px-5 py-2 rounded-xl transition-colors ${aktifTab === t.id ? 'bg-primary-50 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}>
              {t.icon}
              <span className="text-[10px] font-medium mt-0.5">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KuryeHome;