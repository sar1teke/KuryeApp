import { useState, useEffect } from 'react';
import { SiparisServisi } from '../../../api/siparisService';
import { AuthServisi } from '../../../api/authService';
import { io } from 'socket.io-client';

const odemeBadgeClass = {
    'Nakit': 'bg-gray-100 text-gray-600',
    'Kart': 'bg-blue-50 text-blue-600',
    'Havale': 'bg-cyan-50 text-cyan-600',
    'Online': 'bg-violet-50 text-violet-600',
    'Açık Hesap': 'bg-amber-50 text-amber-600',
};

const SiparisTab = ({ kuryeKonum, dukkanKonum, mesafeHesapla, haritaAc, dahiliRotaAc }) => {
    const [bekleyenler, setBekleyenler] = useState([]);
    const [aktifGorevler, setAktifGorevler] = useState([]);
    const [tamamlananlar, setTamamlananlar] = useState([]);
    const [bugunTeslim, setBugunTeslim] = useState(0);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [gunlukKazanc, setGunlukKazanc] = useState(0);
    const [yeniSiparisPopup, setYeniSiparisPopup] = useState(null);
    const [calismaSuresi, setCalismaSuresi] = useState('');
    const [sekme, setSekme] = useState('aktif');
    const [acikDetay, setAcikDetay] = useState(null);

    const kullanici = AuthServisi.getKullanici();
    const profil = kullanici || { ad: 'Kurye', soyad: '' };
    const kuryeId = kullanici?.id;
    const [baslangicSaati] = useState(() => { const k = sessionStorage.getItem('kurye_baslangic'); if (k) return parseInt(k); const s = Date.now(); sessionStorage.setItem('kurye_baslangic', s.toString()); return s; });

    useEffect(() => {
        veriGetir();
        const socket = io('http://localhost:3001');
        socket.on('yeni_siparis', () => veriGetir());
        socket.on('siparis_durum_degisti', (u) => { veriGetir(); if (u?.durum === 'Hazır') { setYeniSiparisPopup(u); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } });
        socket.on('siparis_silindi', () => veriGetir());
        socket.on('siparis_geri_yuklendi', () => veriGetir());
        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => { const f = Date.now() - baslangicSaati; setCalismaSuresi(`${Math.floor(f / 3600000)}s ${Math.floor((f % 3600000) / 60000)}d`); }, 1000);
        return () => clearInterval(timer);
    }, [baslangicSaati]);

    const veriGetir = async () => {
        const t = await SiparisServisi.getSiparisler(true);
        setBekleyenler(t.filter(s => (s.durum === 'Hazırlanıyor' || s.durum === 'Hazır') && (!s.kurye_id || s.kurye_id == kuryeId)));
        setAktifGorevler(t.filter(s => s.durum === 'Yolda' && s.kurye_id == kuryeId));
        const bugun = new Date().toISOString().split('T')[0];
        const bt = t.filter(s => s.durum === 'Teslim Edildi' && s.kurye_id == kuryeId && s.tarih?.startsWith(bugun));
        setBugunTeslim(bt.length); setGunlukKazanc(bt.reduce((a, s) => a + (s.tutar || 0), 0));
        setTamamlananlar(bt.sort((a, b) => new Date(b.teslim_zamani || b.tarih) - new Date(a.teslim_zamani || a.tarih)));
        setYukleniyor(false);
    };

    const goreviUstlen = async (id) => { await SiparisServisi.kuryeAtaSiparis(id); veriGetir(); };
    const teslimEt = async (id) => { if (confirm('Teslimatı tamamladın mı?')) { await SiparisServisi.durumGuncelle(id, 'Teslim Edildi'); veriGetir(); } };

    const saat = new Date().getHours();
    const selamlama = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';

    return (
        <div className="space-y-4 pt-1">
            {/* Summary Card */}
            <div className="card p-4">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="text-xs text-gray-400">{selamlama}</p>
                        <h2 className="text-base font-semibold text-gray-900 mt-0.5">{profil.ad} {profil.soyad}</h2>
                    </div>
                </div>
                <div className="bg-[#f8f9fb] rounded-xl p-3 mb-3">
                    <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wider mb-0.5">Bugünkü Kazanç</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-gray-900">₺{gunlukKazanc.toFixed(0)}</span>
                        {bugunTeslim > 0 && <span className="text-xs text-emerald-600 font-medium mb-0.5">{bugunTeslim} teslimat</span>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { v: aktifGorevler.length, l: 'Taşınan' },
                        { v: calismaSuresi || '0s', l: 'Çalışma' },
                        { v: bekleyenler.length, l: 'Bekleyen' },
                    ].map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-center">
                            <p className="text-sm font-semibold text-gray-800">{s.v}</p>
                            <p className="text-[10px] text-gray-400">{s.l}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {[
                    { k: 'aktif', l: `Aktif (${aktifGorevler.length})` },
                    { k: 'bekleyen', l: `Bekleyen (${bekleyenler.length})` },
                    { k: 'tamamlanan', l: `Teslim (${tamamlananlar.length})` },
                ].map(t => (
                    <button key={t.k} onClick={() => setSekme(t.k)}
                        className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${sekme === t.k ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'}`}>{t.l}</button>
                ))}
            </div>

            {/* AKTİF GÖREVLER */}
            {sekme === 'aktif' && (
                aktifGorevler.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-3xl mb-2 opacity-30">🚀</p>
                        <p className="text-sm text-gray-400">Aktif teslimat yok</p>
                        <p className="text-[11px] text-gray-300 mt-1">Bekleyen siparişlerden görev alabilirsin</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {aktifGorevler.map(s => {
                            const odeme = s.odemeYontemi || s.odeme_yontemi || 'Nakit';
                            return (
                                <div key={s.id} className="card border-l-[3px] border-l-primary-500 p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-800">{s.musteriAdi || 'Müşteri'}</p>
                                                {s.telefon && (
                                                    <a href={`tel:${s.telefon}`} onClick={e => e.stopPropagation()} className="w-5 h-5 bg-emerald-50 rounded flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400">#{s.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-gray-800">₺{s.tutar || 0}</span>
                                            <div className="mt-0.5"><span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${odemeBadgeClass[odeme] || 'bg-gray-100 text-gray-500'}`}>{odeme}</span></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">{s.adres || 'Adres yok'}</p>

                                    {/* Detay Toggle */}
                                    {acikDetay === s.id && (
                                        <div className="bg-gray-50 rounded-lg p-2.5 mb-2 space-y-0.5 animate-slide-up">
                                            {(s.icerik || []).map((u, i) => <p key={i} className="text-xs text-gray-600">• {u}</p>)}
                                        </div>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setAcikDetay(acikDetay === s.id ? null : s.id); }} className="text-[10px] text-primary-600 font-medium mb-2">
                                        {acikDetay === s.id ? '▲ Gizle' : `▼ ${(s.icerik || []).length} ürün`}
                                    </button>

                                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                                        <button onClick={() => dahiliRotaAc(s)} className="btn-secondary flex-1 !py-2 !text-[11px] flex items-center justify-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                                            Harita
                                        </button>
                                        <button onClick={() => haritaAc(s.adres, 'musteri')} className="btn-secondary flex-1 !py-2 !text-[11px]">G-Maps</button>
                                        <button onClick={() => teslimEt(s.id)} className="btn-primary flex-1 !py-2 !text-[11px] flex items-center justify-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                            Teslim Et
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* BEKLEYEN */}
            {sekme === 'bekleyen' && (
                bekleyenler.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <p className="text-sm text-gray-400">{yukleniyor ? 'Yükleniyor...' : 'Bekleyen paket yok.'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {bekleyenler.map(s => {
                            const mesafe = kuryeKonum && dukkanKonum ? mesafeHesapla(kuryeKonum.lat, kuryeKonum.lng, dukkanKonum.lat, dukkanKonum.lng) : null;
                            const odeme = s.odemeYontemi || s.odeme_yontemi || 'Nakit';
                            return (
                                <div key={s.id} className="card p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-800">{s.musteriAdi || 'Müşteri'}</p>
                                                {s.telefon && (
                                                    <a href={`tel:${s.telefon}`} className="w-5 h-5 bg-emerald-50 rounded flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400">#{s.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="badge bg-emerald-50 text-emerald-600">₺{s.tutar || 0}</span>
                                            <div className="mt-1"><span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${odemeBadgeClass[odeme] || 'bg-gray-100 text-gray-500'}`}>{odeme}</span></div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 mb-3 text-sm">
                                        <div><span className="text-[10px] text-gray-400 uppercase font-medium block">Adres</span><span className="text-gray-700 text-xs">{s.adres || '—'}</span></div>
                                        <div><span className="text-[10px] text-gray-400 uppercase font-medium block">İçerik</span><span className="text-gray-700 text-xs">{Array.isArray(s.icerik) ? s.icerik.join(', ') : (s.icerik || '—')}</span></div>
                                        {mesafe && <div><span className="text-[10px] text-gray-400 uppercase font-medium block">Uzaklık</span><span className="text-xs text-amber-600 font-medium">Dükkana {mesafe} km</span></div>}
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                                        <button onClick={() => dahiliRotaAc(s)} className="w-10 h-10 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                                        </button>
                                        <button onClick={() => haritaAc(s.adres, 'musteri')} className="w-10 h-10 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                        </button>
                                        <button onClick={() => goreviUstlen(s.id)} className="btn-primary flex-1 !py-2.5 !rounded-lg flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                                            Görevi Al
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* TAMAMLANAN */}
            {sekme === 'tamamlanan' && (
                tamamlananlar.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-3xl mb-2 opacity-30">📦</p>
                        <p className="text-sm text-gray-400">Bugün henüz teslimat yok</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tamamlananlar.map(s => {
                            const teslimSaat = s.teslim_zamani ? new Date(s.teslim_zamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : (s.tarih ? new Date(s.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—');
                            const odeme = s.odemeYontemi || s.odeme_yontemi || 'Nakit';
                            return (
                                <div key={s.id} className="card p-4 opacity-80">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-800">{s.musteriAdi || 'Müşteri'}</p>
                                            <p className="text-[11px] text-gray-400">#{s.id} · {teslimSaat}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-emerald-600">₺{s.tutar || 0}</span>
                                            <div className="mt-0.5"><span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${odemeBadgeClass[odeme] || 'bg-gray-100 text-gray-500'}`}>{odeme}</span></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 truncate">{s.adres || '—'}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="w-4 h-4 bg-emerald-100 rounded flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                        </span>
                                        <span className="text-[11px] text-emerald-600 font-medium">Teslim Edildi</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* New Order Popup */}
            {yeniSiparisPopup && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/30">
                    <div className="card w-full max-w-sm p-5 flex flex-col items-center text-center animate-slide-up">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Yeni Sipariş Hazır</h2>
                        <p className="text-sm text-gray-500 mb-4"><span className="font-medium text-gray-800">{yeniSiparisPopup.musteriAdi}</span> için teslimat</p>
                        <div className="bg-gray-50 rounded-xl p-3 w-full mb-4 space-y-2 text-left">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Adres</span><span className="text-gray-800 font-medium truncate max-w-[150px]">{yeniSiparisPopup.adres || '—'}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Tutar</span><span className="text-gray-900 font-bold">₺{yeniSiparisPopup.tutar || 0}</span></div>
                        </div>
                        <div className="flex w-full gap-2">
                            <button onClick={() => setYeniSiparisPopup(null)} className="btn-secondary flex-1">Reddet</button>
                            <button onClick={() => { goreviUstlen(yeniSiparisPopup.id); setYeniSiparisPopup(null); }} className="btn-primary flex-1">Kabul Et</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiparisTab;
