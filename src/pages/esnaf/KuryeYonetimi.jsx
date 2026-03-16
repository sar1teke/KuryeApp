// src/pages/esnaf/KuryeYonetimi.jsx
import { useState, useEffect } from 'react';
import { AuthServisi } from '../../api/authService';

const API = 'http://localhost:3001/api/kuryeler';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

const DURUM = { aktif: { l: 'Aktif', c: 'bg-emerald-50 text-emerald-700' }, mola: { l: 'Mola', c: 'bg-amber-50 text-amber-700' }, cevrimdisi: { l: 'Çevrimdışı', c: 'bg-gray-100 text-gray-500' } };

const KuryeYonetimi = () => {
    const [sekme, setSekme] = useState('kendi');
    const [kuryeler, setKuryeler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [formAcik, setFormAcik] = useState(false);
    const [detayVeri, setDetayVeri] = useState(null);
    const [yeniKurye, setYeniKurye] = useState({ ad: '', soyad: '', email: '', sifre: '', telefon: '' });
    const [hata, setHata] = useState('');

    const kullanici = AuthServisi.getKullanici();
    const esnafId = kullanici?.id;

    useEffect(() => { veriGetir(); }, [sekme]);

    const veriGetir = async () => {
        setYukleniyor(true);
        try {
            const tip = sekme === 'kendi' ? 'ozel' : 'genel';
            const url = sekme === 'kendi' ? `${API}?tip=${tip}&esnaf_id=${esnafId}` : `${API}?tip=${tip}`;
            const data = await (await authFetch(url)).json();
            setKuryeler(data);
        } catch (err) { console.error(err); }
        setYukleniyor(false);
    };

    const kuryeEkle = async (e) => {
        e.preventDefault(); setHata('');
        if (!yeniKurye.ad || !yeniKurye.email || !yeniKurye.sifre) { setHata('Ad, email ve şifre zorunludur.'); return; }
        try {
            const res = await authFetch(API, { method: 'POST', body: JSON.stringify({ ...yeniKurye, kurye_tipi: sekme === 'kendi' ? 'ozel' : 'genel', esnaf_id: sekme === 'kendi' ? esnafId : null }) });
            if (!res.ok) { setHata((await res.json()).error); return; }
            setYeniKurye({ ad: '', soyad: '', email: '', sifre: '', telefon: '' }); setFormAcik(false); veriGetir();
        } catch (err) { setHata(err.message); }
    };

    const durumDegistir = async (id, aktif) => { await authFetch(`${API}/${id}`, { method: 'PUT', body: JSON.stringify({ aktif }) }); veriGetir(); };
    const calismaDurumuDegistir = async (id, d) => { await authFetch(`${API}/${id}/durum`, { method: 'PUT', body: JSON.stringify({ kurye_durumu: d }) }); veriGetir(); };
    const kuryeDetayAc = async (id) => { const data = await (await authFetch(`${API}/${id}`)).json(); setDetayVeri(data); };

    return (
        <div className="space-y-5 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="page-title">Kurye Yönetimi</h1>
                    <p className="page-subtitle">{kuryeler.length} kurye kayıtlı</p>
                </div>
                <button onClick={() => { setFormAcik(!formAcik); setHata(''); }} className="btn-primary">
                    + {sekme === 'kendi' ? 'Özel Kurye' : 'Genel Kurye'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {[{ k: 'kendi', l: 'Kendi Kuryelerim' }, { k: 'genel', l: 'Genel Havuz' }].map(s => (
                    <button key={s.k} onClick={() => { setSekme(s.k); setFormAcik(false); }}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${sekme === s.k ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{s.l}</button>
                ))}
            </div>

            {/* Form */}
            {formAcik && (
                <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Yeni Kurye</h3>
                    {hata && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{hata}</div>}
                    <form onSubmit={kuryeEkle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input type="text" placeholder="Ad *" value={yeniKurye.ad} onChange={e => setYeniKurye({ ...yeniKurye, ad: e.target.value })} className="input-field" required />
                        <input type="text" placeholder="Soyad" value={yeniKurye.soyad} onChange={e => setYeniKurye({ ...yeniKurye, soyad: e.target.value })} className="input-field" />
                        <input type="email" placeholder="Email *" value={yeniKurye.email} onChange={e => setYeniKurye({ ...yeniKurye, email: e.target.value })} className="input-field" required />
                        <input type="password" placeholder="Şifre *" value={yeniKurye.sifre} onChange={e => setYeniKurye({ ...yeniKurye, sifre: e.target.value })} className="input-field" required minLength={6} />
                        <input type="tel" placeholder="Telefon" value={yeniKurye.telefon} onChange={e => setYeniKurye({ ...yeniKurye, telefon: e.target.value })} className="input-field" />
                        <div className="flex gap-2">
                            <button type="submit" className="btn-primary flex-1">Kaydet</button>
                            <button type="button" onClick={() => setFormAcik(false)} className="btn-secondary">İptal</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            {yukleniyor ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : kuryeler.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                    <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <p className="text-sm">Kurye bulunamadı.</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100 bg-gray-50">
                            <th className="table-header px-4 py-3">Kurye</th>
                            <th className="table-header px-4 py-3 text-center">Tip</th>
                            <th className="table-header px-4 py-3 text-center">Durum</th>
                            <th className="table-header px-4 py-3 text-center">Bugün</th>
                            <th className="table-header px-4 py-3 text-center">Toplam</th>
                            <th className="table-header px-4 py-3 text-center">Başarı</th>
                            <th className="table-header px-4 py-3 text-right">İşlem</th>
                        </tr></thead>
                        <tbody>
                            {kuryeler.map(k => {
                                const d = DURUM[k.kurye_durumu] || DURUM.cevrimdisi;
                                return (
                                    <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-600">
                                                    {k.ad?.charAt(0)}{k.soyad?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{k.ad} {k.soyad}</p>
                                                    <p className="text-[11px] text-gray-400">{k.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="badge bg-gray-100 text-gray-600">{k.kurye_tipi === 'ozel' ? 'Özel' : 'Genel'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {k.kurye_tipi === 'ozel' ? (
                                                <select value={k.kurye_durumu || 'cevrimdisi'} onChange={e => calismaDurumuDegistir(k.id, e.target.value)}
                                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white">
                                                    <option value="aktif">Aktif</option>
                                                    <option value="mola">Mola</option>
                                                    <option value="cevrimdisi">Çevrimdışı</option>
                                                </select>
                                            ) : (
                                                <span className={`${(DURUM[k.kurye_durumu] || DURUM.cevrimdisi).c} px-2 py-0.5 rounded text-[10px] font-medium`}>
                                                    {(DURUM[k.kurye_durumu] || DURUM.cevrimdisi).l}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-gray-800">{k.bugunTeslimat}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{k.toplamGorev}</td>
                                        <td className="px-4 py-3 text-center"><span className="badge bg-gray-100 text-gray-700">%{k.basariOrani}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => kuryeDetayAc(k.id)} className="btn-secondary !py-1 !px-2 !text-[11px]">Detay</button>
                                                {k.kurye_tipi === 'ozel' && (
                                                    <button onClick={() => durumDegistir(k.id, !k.aktif)}
                                                        className={`btn !py-1 !px-2 !text-[11px] ${k.aktif ? 'btn-danger' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                                                        {k.aktif ? 'Pasif' : 'Aktif'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal */}
            {detayVeri && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-modal w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-200 animate-slide-up">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">{detayVeri.kurye.ad} {detayVeri.kurye.soyad}</h3>
                                <p className="text-xs text-gray-400">{detayVeri.kurye.email}</p>
                            </div>
                            <button onClick={() => setDetayVeri(null)} className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <p className="section-title mb-2">Son Teslimatlar</p>
                            {detayVeri.sonSiparisler.length === 0 ? <p className="text-sm text-gray-400">Kayıt yok.</p> : (
                                <div className="space-y-1.5">
                                    {detayVeri.sonSiparisler.map(s => (
                                        <div key={s.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm">
                                            <div className="flex items-center gap-2"><span className="font-medium text-gray-800">#{s.id}</span><span className="text-gray-500">{s.musteri_adi}</span></div>
                                            <div className="flex items-center gap-2"><span className="badge bg-gray-100 text-gray-600">{s.durum}</span><span className="font-semibold text-gray-800">₺{s.toplam_tutar}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100"><button onClick={() => setDetayVeri(null)} className="btn-secondary w-full">Kapat</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KuryeYonetimi;
