import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthServisi } from '../../../api/authService';

const API = 'http://localhost:3001/api/kuryeler';
const SIPARIS_API = 'http://localhost:3001/api/siparisler';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

const ProfilTab = () => {
    const [profil, setProfil] = useState(null);
    const [durum, setDurum] = useState('cevrimdisi');
    const [duzenleModu, setDuzenleModu] = useState(false);
    const [duzenleData, setDuzenleData] = useState({});
    const [istatistikler, setIstatistikler] = useState({ bugunTeslimat: 0, bugunKazanc: 0, haftaTeslimat: 0, haftaKazanc: 0, ayTeslimat: 0, ayKazanc: 0, toplamTeslimat: 0, toplamKazanc: 0, ortSure: 0 });
    const [istatistikSekme, setIstatistikSekme] = useState('bugun');
    const [yukleniyor, setYukleniyor] = useState(true);
    const [sonTeslimatlar, setSonTeslimatlar] = useState([]);

    useEffect(() => { profilYukle(); istatistikleriYukle(); }, []);

    const profilYukle = async () => {
        try {
            const res = await authFetch(`${API}/profil/ben`);
            if (res.ok) {
                const data = await res.json();
                setProfil(data);
                setDurum(data.kurye_durumu || 'cevrimdisi');
            } else {
                const k = AuthServisi.getKullanici();
                if (k) setProfil({ ...k, plaka: '', arac: '', iban: '', telefon: '' });
            }
        } catch (e) {
            const k = AuthServisi.getKullanici();
            if (k) setProfil({ ...k, plaka: '', arac: '', iban: '', telefon: '' });
        }
        setYukleniyor(false);
    };

    const istatistikleriYukle = async () => {
        try {
            const kuryeId = AuthServisi.getKullanici()?.id;
            const res = await authFetch(`${SIPARIS_API}?aktif=true`);
            if (!res.ok) return;
            const s = await res.json();
            const t = s.filter(s => s.durum === 'Teslim Edildi' && s.kurye_id == kuryeId);
            const bugun = new Date().toISOString().split('T')[0];
            const haftaOnce = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            const ayBasi = new Date().toISOString().slice(0, 7);
            const bt = t.filter(s => s.tarih?.startsWith(bugun));
            const ht = t.filter(s => s.tarih >= haftaOnce);
            const at = t.filter(s => s.tarih?.startsWith(ayBasi));

            // Ort. teslimat süresi hesapla
            let toplamSure = 0, sureSayisi = 0;
            t.forEach(s => {
                if (s.teslim_zamani && s.tarih) {
                    const dk = (new Date(s.teslim_zamani) - new Date(s.tarih)) / 60000;
                    if (dk > 0 && dk < 180) { toplamSure += dk; sureSayisi++; }
                }
            });
            const ortSure = sureSayisi > 0 ? Math.round(toplamSure / sureSayisi) : 0;

            setIstatistikler({
                bugunTeslimat: bt.length, bugunKazanc: bt.reduce((a, s) => a + (s.tutar || 0), 0),
                haftaTeslimat: ht.length, haftaKazanc: ht.reduce((a, s) => a + (s.tutar || 0), 0),
                ayTeslimat: at.length, ayKazanc: at.reduce((a, s) => a + (s.tutar || 0), 0),
                toplamTeslimat: t.length, toplamKazanc: t.reduce((a, s) => a + (s.tutar || 0), 0),
                ortSure,
            });

            // Son 5 teslimat
            setSonTeslimatlar(t.sort((a, b) => new Date(b.teslim_zamani || b.tarih) - new Date(a.teslim_zamani || a.tarih)).slice(0, 5));
        } catch (e) { console.error('İstatistik yükleme hatası:', e); }
    };

    const durumDegistir = async (yeniDurum) => {
        try {
            await authFetch(`${API}/profil/durum`, { method: 'PUT', body: JSON.stringify({ kurye_durumu: yeniDurum }) });
            setDurum(yeniDurum);
        } catch (e) { console.error(e); }
    };

    const profilKaydet = async () => {
        try {
            const res = await authFetch(`${API}/profil/ben`, { method: 'PUT', body: JSON.stringify(duzenleData) });
            if (res.ok) {
                const data = await res.json();
                setProfil(data);
                setDuzenleModu(false);
            }
        } catch (e) { console.error(e); }
    };

    const duzenleBaslat = () => { setDuzenleData({ ...profil }); setDuzenleModu(true); };

    if (yukleniyor || !profil) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

    const initials = (profil.ad?.charAt(0) || '') + (profil.soyad?.charAt(0) || '');
    const toplam = istatistikler.toplamTeslimat;
    const performans = toplam >= 50 ? { l: 'Altın', e: '🥇', c: 'text-amber-600 bg-amber-50 border-amber-200' } : toplam >= 10 ? { l: 'Gümüş', e: '🥈', c: 'text-gray-600 bg-gray-50 border-gray-200' } : { l: 'Bronz', e: '🥉', c: 'text-orange-600 bg-orange-50 border-orange-200' };

    const sekmeler = {
        bugun: { label: 'Bugün', teslimat: istatistikler.bugunTeslimat, kazanc: istatistikler.bugunKazanc },
        hafta: { label: 'Hafta', teslimat: istatistikler.haftaTeslimat, kazanc: istatistikler.haftaKazanc },
        ay: { label: 'Ay', teslimat: istatistikler.ayTeslimat, kazanc: istatistikler.ayKazanc },
        toplam: { label: 'Toplam', teslimat: istatistikler.toplamTeslimat, kazanc: istatistikler.toplamKazanc },
    };
    const aktifSekme = sekmeler[istatistikSekme];

    return (
        <div className="space-y-3 pt-1 pb-6">
            {/* Profile Card */}
            <div className="card overflow-hidden">
                <div className="h-14 bg-primary-600 relative">
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
                        <div className="w-14 h-14 bg-white rounded-xl border-2 border-white shadow-sm flex items-center justify-center text-lg font-semibold text-primary-700">{initials}</div>
                    </div>
                </div>
                <div className="pt-10 pb-4 px-5 text-center">
                    <h2 className="text-base font-semibold text-gray-900">{profil.ad} {profil.soyad}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{profil.plaka || '—'} · {profil.arac || '—'}</p>
                    {/* Performance Badge */}
                    <div className="flex justify-center mt-2">
                        <span className={`text-[11px] font-medium px-3 py-1 rounded-full border ${performans.c}`}>{performans.e} {performans.l} Kurye · {toplam} teslimat</span>
                    </div>
                    <div className="flex justify-center gap-1.5 mt-3">
                        {[
                            { k: 'aktif', l: 'Aktif', c: 'emerald' },
                            { k: 'mola', l: 'Mola', c: 'amber' },
                            { k: 'cevrimdisi', l: 'Çevrimdışı', c: 'gray' },
                        ].map(d => (
                            <button key={d.k} onClick={() => durumDegistir(d.k)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${durum === d.k
                                    ? `bg-${d.c}-50 text-${d.c}-700 border-${d.c}-200`
                                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                                {d.l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="card overflow-hidden">
                <div className="flex border-b border-gray-100">
                    {Object.entries(sekmeler).map(([k, v]) => (
                        <button key={k} onClick={() => setIstatistikSekme(k)}
                            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors ${istatistikSekme === k ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/30' : 'text-gray-400'}`}>
                            {v.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="text-center py-4">
                        <p className="text-2xl font-bold text-gray-900">{aktifSekme.teslimat}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Teslimat</p>
                    </div>
                    <div className="text-center py-4">
                        <p className="text-2xl font-bold text-emerald-600">₺{aktifSekme.kazanc.toFixed(0)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Kazanç</p>
                    </div>
                    <div className="text-center py-4">
                        <p className="text-2xl font-bold text-blue-600">{istatistikler.ortSure || '—'}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Ort. dk</p>
                    </div>
                </div>
            </div>

            {/* Son 5 Teslimat */}
            {sonTeslimatlar.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="section-title !mb-0">Son Teslimatlar</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {sonTeslimatlar.map(s => (
                            <div key={s.id} className="flex justify-between items-center px-4 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{s.musteriAdi || '—'}</p>
                                        <p className="text-[10px] text-gray-400">{s.teslim_zamani ? new Date(s.teslim_zamani).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">₺{(s.tutar || 0).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile Details */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <p className="section-title !mb-0">Profil Bilgileri</p>
                    {!duzenleModu && <button onClick={duzenleBaslat} className="text-primary-600 text-[11px] font-medium hover:bg-primary-50 px-2 py-1 rounded transition-colors">Düzenle</button>}
                </div>
                {duzenleModu ? (
                    <div className="p-4 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="label">Ad</label><input type="text" className="input-field" value={duzenleData.ad || ''} onChange={e => setDuzenleData({ ...duzenleData, ad: e.target.value })} /></div>
                            <div><label className="label">Soyad</label><input type="text" className="input-field" value={duzenleData.soyad || ''} onChange={e => setDuzenleData({ ...duzenleData, soyad: e.target.value })} /></div>
                        </div>
                        <div><label className="label">Telefon</label><input type="tel" className="input-field" value={duzenleData.telefon || ''} onChange={e => setDuzenleData({ ...duzenleData, telefon: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="label">Plaka</label><input type="text" className="input-field" value={duzenleData.plaka || ''} onChange={e => setDuzenleData({ ...duzenleData, plaka: e.target.value })} /></div>
                            <div><label className="label">Araç</label><input type="text" className="input-field" value={duzenleData.arac || ''} onChange={e => setDuzenleData({ ...duzenleData, arac: e.target.value })} /></div>
                        </div>
                        <div><label className="label">IBAN</label><input type="text" className="input-field" placeholder="TR..." value={duzenleData.iban || ''} onChange={e => setDuzenleData({ ...duzenleData, iban: e.target.value })} /></div>
                        <div className="flex gap-2 pt-1">
                            <button onClick={profilKaydet} className="btn-primary flex-1">Kaydet</button>
                            <button onClick={() => setDuzenleModu(false)} className="btn-secondary flex-1">İptal</button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {[
                            { l: 'Telefon', v: profil.telefon || '—' },
                            { l: 'Araç', v: `${profil.arac || '—'} · ${profil.plaka || '—'}` },
                            { l: 'IBAN', v: profil.iban || 'Girilmedi' },
                            { l: 'Email', v: profil.email || '—' },
                        ].map((r, i) => (
                            <div key={i} className="flex justify-between px-4 py-3">
                                <span className="text-xs text-gray-500">{r.l}</span>
                                <span className="text-sm font-medium text-gray-800">{r.v}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Logout */}
            <Link to="/">
                <button onClick={() => AuthServisi.logout()} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-100">Çıkış Yap</button>
            </Link>
        </div>
    );
};

export default ProfilTab;
