// src/pages/esnaf/Kampanyalar.jsx
import { useState, useEffect } from 'react';
import { AuthServisi } from '../../api/authService';

const API = 'http://localhost:3001/api/kampanyalar';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } }).then(r => r.json());

const Kampanyalar = () => {
    const [kampanyalar, setKampanyalar] = useState([]);
    const [formAcik, setFormAcik] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [form, setForm] = useState({ kod: '', ad: '', tip: 'yuzde', deger: '', min_tutar: '', max_kullanim: '', baslangic: '', bitis: '' });

    useEffect(() => { veriGetir(); }, []);
    const veriGetir = async () => { setYukleniyor(true); setKampanyalar(await authFetch(API)); setYukleniyor(false); };

    const kaydet = async () => {
        if (!form.kod.trim() || !form.ad.trim() || !form.deger) return alert('Kod, ad ve değer zorunlu!');
        const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader() }, body: JSON.stringify({ ...form, deger: parseFloat(form.deger), min_tutar: parseFloat(form.min_tutar) || 0, max_kullanim: parseInt(form.max_kullanim) || 0 }) });
        if (res.ok) { setForm({ kod: '', ad: '', tip: 'yuzde', deger: '', min_tutar: '', max_kullanim: '', baslangic: '', bitis: '' }); setFormAcik(false); veriGetir(); }
        else { const err = await res.json(); alert(err.error || 'Hata!'); }
    };

    const durumDegistir = async (id, aktif) => {
        await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader() }, body: JSON.stringify({ aktif: aktif ? 0 : 1 }) });
        veriGetir();
    };

    const sil = async (id) => {
        if (!confirm('Kampanya silinsin mi?')) return;
        await fetch(`${API}/${id}`, { method: 'DELETE', headers: AuthServisi.getAuthHeader() });
        veriGetir();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="page-title">Kampanyalar</h1>
                    <p className="page-subtitle">{kampanyalar.length} kampanya</p>
                </div>
                <button onClick={() => setFormAcik(!formAcik)} className="btn-primary">{formAcik ? 'Kapat' : '+ Yeni Kampanya'}</button>
            </div>

            {formAcik && (
                <div className="card p-5 animate-slide-up space-y-3">
                    <p className="section-title mb-2">Yeni Kampanya</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                            <label className="label">Kod *</label>
                            <input type="text" placeholder="HOSGELDIN" className="input-field !uppercase" value={form.kod} onChange={e => setForm({ ...form, kod: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Kampanya Adı *</label>
                            <input type="text" placeholder="İlk Sipariş İndirimi" className="input-field" value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">İndirim Tipi</label>
                            <select className="input-field" value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })}>
                                <option value="yuzde">Yüzde (%)</option>
                                <option value="tutar">Sabit Tutar (₺)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Değer * {form.tip === 'yuzde' ? '(%)' : '(₺)'}</label>
                            <input type="number" placeholder={form.tip === 'yuzde' ? '10' : '25'} className="input-field" value={form.deger} onChange={e => setForm({ ...form, deger: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Min. Sepet (₺)</label>
                            <input type="number" placeholder="0" className="input-field" value={form.min_tutar} onChange={e => setForm({ ...form, min_tutar: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Maks. Kullanım</label>
                            <input type="number" placeholder="0 = sınırsız" className="input-field" value={form.max_kullanim} onChange={e => setForm({ ...form, max_kullanim: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Başlangıç</label>
                            <input type="date" className="input-field" value={form.baslangic} onChange={e => setForm({ ...form, baslangic: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Bitiş</label>
                            <input type="date" className="input-field" value={form.bitis} onChange={e => setForm({ ...form, bitis: e.target.value })} />
                        </div>
                    </div>
                    <button onClick={kaydet} className="btn-primary mt-2">Kampanya Oluştur</button>
                </div>
            )}

            {yukleniyor ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : kampanyalar.length === 0 ? (
                <div className="card p-16 text-center">
                    <div className="text-4xl mb-3 opacity-30">🏷️</div>
                    <p className="text-gray-500 text-sm font-medium">Henüz kampanya yok</p>
                    <p className="text-gray-400 text-xs mt-1">Müşterilerinize özel indirim kodları oluşturun</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {kampanyalar.map(k => (
                        <div key={k.id} className={`card p-4 ${!k.aktif ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-bold text-sm text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{k.kod}</span>
                                        <span className={`badge ${k.aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{k.aktif ? 'Aktif' : 'Pasif'}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">{k.ad}</p>
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                        <span>{k.tip === 'yuzde' ? `%${k.deger} indirim` : `₺${k.deger} indirim`}</span>
                                        {k.min_tutar > 0 && <span>Min: ₺{k.min_tutar}</span>}
                                        {k.max_kullanim > 0 && <span>Limit: {k.kullanim_sayisi}/{k.max_kullanim}</span>}
                                        {k.baslangic && <span>📅 {new Date(k.baslangic).toLocaleDateString('tr-TR')}</span>}
                                        {k.bitis && <span>→ {new Date(k.bitis).toLocaleDateString('tr-TR')}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => durumDegistir(k.id, k.aktif)} className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors ${k.aktif ? 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
                                        {k.aktif ? 'Durdur' : 'Aktif Et'}
                                    </button>
                                    <button onClick={() => sil(k.id)} className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Kampanyalar;
