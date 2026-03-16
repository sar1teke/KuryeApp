// src/pages/esnaf/Ayarlar.jsx
import { useState, useEffect } from 'react';
import { AuthServisi } from '../../api/authService';
import BolgeYonetimi from './BolgeYonetimi';

const API = 'http://localhost:3001/api/ayarlar';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

const Ayarlar = () => {
    const [yukleniyor, setYukleniyor] = useState(true);
    const [kaydedildi, setKaydedildi] = useState(false);
    const [aktifTab, setAktifTab] = useState('genel');
    const [ayarlar, setAyarlar] = useState({
        dukkan_adi: '', telefon: '', adres: '', min_paket_tutar: 100, teslimat_suresi: '30-45', teslimat_ucreti: 0, yogun_mod: false, otomatik_yazdir: false, enlem: '', boylam: '', dukkan_acik: true, acilis_saati: '09:00', kapanis_saati: '22:00', kurye_atama_stratejisi: 'manuel'
    });

    useEffect(() => {
        const yukle = async () => {
            try {
                const res = await authFetch(API);
                if (res.ok) {
                    const data = await res.json();
                    setAyarlar({
                        dukkan_adi: data.dukkan_adi || '', telefon: data.telefon || '', adres: data.adres || '',
                        min_paket_tutar: data.min_paket_tutar || 100, teslimat_suresi: data.teslimat_suresi || '30-45',
                        teslimat_ucreti: data.teslimat_ucreti || 0,
                        yogun_mod: !!data.yogun_mod, otomatik_yazdir: !!data.otomatik_yazdir, enlem: data.enlem || '', boylam: data.boylam || '',
                        dukkan_acik: data.dukkan_acik !== 0,
                        acilis_saati: data.acilis_saati || '09:00', kapanis_saati: data.kapanis_saati || '22:00',
                        kurye_atama_stratejisi: data.kurye_atama_stratejisi || 'manuel'
                    });
                }
            } catch (e) { console.error(e); }
            setYukleniyor(false);
        };
        yukle();
    }, []);

    const handleChange = (e) => {
        setAyarlar({ ...ayarlar, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    };

    const kaydet = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(API, { method: 'PUT', body: JSON.stringify(ayarlar) });
            if (res.ok) { setKaydedildi(true); setTimeout(() => setKaydedildi(false), 2000); }
        } catch (e) { console.error(e); }
    };

    const konumBul = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (p) => { setAyarlar(a => ({ ...a, enlem: p.coords.latitude, boylam: p.coords.longitude })); },
                () => alert('Konum alınamadı.')
            );
        }
    };

    const dukkanDurumToggle = async () => {
        const yeni = !ayarlar.dukkan_acik;
        setAyarlar(a => ({ ...a, dukkan_acik: yeni }));
        await authFetch(API, { method: 'PUT', body: JSON.stringify({ dukkan_acik: yeni }) });
    };

    if (yukleniyor) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="max-w-2xl space-y-5 pb-10">
            <h1 className="page-title">Ayarlar</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setAktifTab('genel')} 
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${aktifTab === 'genel' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}>
                    Genel Ayarlar
                </button>
                <button 
                    onClick={() => setAktifTab('bolgeler')} 
                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${aktifTab === 'bolgeler' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`}>
                    Teslimat Bölgeleri
                </button>
            </div>

            {aktifTab === 'genel' ? (
                <div className="space-y-5">
                    {/* Status */}
                    <div className={`card p-4 flex justify-between items-center border-l-[3px] ${ayarlar.dukkan_acik ? 'border-l-emerald-500' : 'border-l-red-400'}`}>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{ayarlar.dukkan_acik ? 'Dükkan Açık' : 'Dükkan Kapalı'}</p>
                            <p className="text-xs text-gray-500">{ayarlar.dukkan_acik ? 'Sipariş alınabilir.' : 'Sipariş alınamaz.'}</p>
                        </div>
                        <button onClick={dukkanDurumToggle}
                            className={`btn text-sm ${ayarlar.dukkan_acik ? 'btn-danger' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                            {ayarlar.dukkan_acik ? 'Kapat' : 'Aç'}
                        </button>
                    </div>

                    <form onSubmit={kaydet} className="card p-5 space-y-5">
                {/* Business */}
                <div>
                    <p className="section-title mb-3">İşletme Bilgileri</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">İşletme Adı</label><input type="text" name="dukkan_adi" value={ayarlar.dukkan_adi} onChange={handleChange} className="input-field" /></div>
                        <div><label className="label">Telefon</label><input type="text" name="telefon" value={ayarlar.telefon} onChange={handleChange} className="input-field" /></div>
                    </div>
                </div>

                {/* Location */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <p className="section-title">Konum</p>
                        <button type="button" onClick={konumBul} className="btn-secondary !py-1 !px-2 !text-[11px]">GPS Konum Al</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">Enlem</label><input type="text" name="enlem" value={ayarlar.enlem} onChange={handleChange} className="input-field" placeholder="41.0082" /></div>
                        <div><label className="label">Boylam</label><input type="text" name="boylam" value={ayarlar.boylam} onChange={handleChange} className="input-field" placeholder="28.9784" /></div>
                        <div className="col-span-2"><label className="label">Adres</label><textarea name="adres" value={ayarlar.adres} onChange={handleChange} rows="2" className="input-field !resize-none" /></div>
                    </div>
                </div>

                {/* Teslimat */}
                <div>
                    <p className="section-title mb-3">Teslimat ve Sipariş İşleyişi</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">Min Paket (₺)</label><input type="number" name="min_paket_tutar" value={ayarlar.min_paket_tutar} onChange={handleChange} className="input-field" /></div>
                        <div><label className="label">Teslimat Ücreti (₺)</label><input type="number" name="teslimat_ucreti" value={ayarlar.teslimat_ucreti} onChange={handleChange} className="input-field" placeholder="0" /></div>
                        <div><label className="label">Ort Süre (dk)</label><input type="text" name="teslimat_suresi" value={ayarlar.teslimat_suresi} onChange={handleChange} className="input-field" /></div>
                        <div></div>
                        <div className="col-span-1 flex items-center gap-3 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg">
                            <input type="checkbox" id="yogunMod" name="yogun_mod" checked={ayarlar.yogun_mod} onChange={handleChange} className="w-4 h-4 rounded" />
                            <div><label htmlFor="yogunMod" className="text-sm font-medium text-gray-800 cursor-pointer">Yoğunluk Modu</label><p className="text-[11px] text-gray-500">Müşterilere yoğunluk uyarısı gösterilir.</p></div>
                        </div>
                        <div className="col-span-1 flex items-center gap-3 bg-blue-50 border border-blue-200 px-3 py-2.5 rounded-lg">
                            <input type="checkbox" id="otomatikYazdir" name="otomatik_yazdir" checked={ayarlar.otomatik_yazdir} onChange={handleChange} className="w-4 h-4 rounded text-blue-600" />
                            <div><label htmlFor="otomatikYazdir" className="text-sm font-medium text-blue-800 cursor-pointer">Otomatik Adisyon</label><p className="text-[11px] text-blue-600">Yeni sipariş geldiğinde yazdırılır.</p></div>
                        </div>
                    </div>
                </div>

                {/* Çalışma Saatleri */}
                <div>
                    <p className="section-title mb-3">Çalışma Saatleri</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">Açılış</label><input type="time" name="acilis_saati" value={ayarlar.acilis_saati} onChange={handleChange} className="input-field" /></div>
                        <div><label className="label">Kapanış</label><input type="time" name="kapanis_saati" value={ayarlar.kapanis_saati} onChange={handleChange} className="input-field" /></div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Bu saatler dışında sipariş alınamaz. (İleride otomatik açılıp kapanacak)</p>
                </div>

                {/* Kurye Atama Stratejisi */}
                <div>
                    <p className="section-title mb-3">Kurye Atama</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: 'manuel', label: 'Manuel', desc: 'Her siparişe elle kurye atarsınız' },
                            { key: 'otomatik', label: 'Otomatik', desc: 'En yakın müsait kurye otomatik atanır' },
                            { key: 'sirali', label: 'Sıralı', desc: 'Kuryeler sırayla görev alır' }
                        ].map(s => (
                            <button key={s.key} type="button" onClick={() => setAyarlar({ ...ayarlar, kurye_atama_stratejisi: s.key })}
                                className={`p-3 rounded-lg border text-left transition-colors ${ayarlar.kurye_atama_stratejisi === s.key
                                        ? 'bg-primary-50 border-primary-200'
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }`}>
                                <p className={`text-sm font-medium ${ayarlar.kurye_atama_stratejisi === s.key ? 'text-primary-700' : 'text-gray-800'}`}>{s.label}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-2 border-t border-gray-100">
                    {kaydedildi && <span className="text-emerald-600 text-sm font-medium">Kaydedildi</span>}
                    <button type="submit" className="btn-primary">Kaydet</button>
                </div>
            </form>
            </div>
            ) : (
                <BolgeYonetimi dukkanKonum={{ enlem: ayarlar.enlem, boylam: ayarlar.boylam }} />
            )}
        </div>
    );
};

export default Ayarlar;