import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, useMapEvents, CircleMarker } from 'react-leaflet';
import { AuthServisi } from '../../api/authService';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const API = 'http://localhost:3001/api/ayarlar/teslimat-bolgeleri';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({ click: (e) => onMapClick([e.latlng.lat, e.latlng.lng]) });
    return null;
};

const defaultCenter = [41.0082, 28.9784];

const BolgeYonetimi = ({ dukkanKonum }) => {
    const [bolgeler, setBolgeler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [formAcik, setFormAcik] = useState(false);
    
    // Form state
    const [yeniBolge, setYeniBolge] = useState({ ad: '', renk: '#3388ff', min_tutar: '', teslimat_ucreti: '' });
    const [cizimNoktalari, setCizimNoktalari] = useState([]);
    
    // Edit state
    const [duzenleId, setDuzenleId] = useState(null);

    const yukle = async () => {
        setYukleniyor(true);
        try {
            const res = await authFetch(API);
            if (res.ok) setBolgeler(await res.json());
        } catch (e) {
            console.error('Bölgeler yüklenemedi', e);
        }
        setYukleniyor(false);
    };

    useEffect(() => { yukle(); }, []);

    const handleMapClick = (latlng) => {
        if (formAcik || duzenleId) {
            setCizimNoktalari([...cizimNoktalari, latlng]);
        }
    };

    const sonNoktayiSil = () => {
        setCizimNoktalari(p => p.slice(0, -1));
    };

    const cizimiTemizle = () => {
        setCizimNoktalari([]);
    };

    const formIptal = () => {
        setFormAcik(false);
        setDuzenleId(null);
        setYeniBolge({ ad: '', renk: '#3388ff', min_tutar: '', teslimat_ucreti: '' });
        setCizimNoktalari([]);
    };

    const kaydet = async (e) => {
        e.preventDefault();
        if (!yeniBolge.ad.trim()) return alert('Bölge adı zorunludur.');
        if (cizimNoktalari.length < 3) return alert('Bölge haritada en az 3 nokta ile çizilmelidir.');

        const payload = {
            ad: yeniBolge.ad,
            renk: yeniBolge.renk,
            min_tutar: parseFloat(yeniBolge.min_tutar) || 0,
            teslimat_ucreti: parseFloat(yeniBolge.teslimat_ucreti) || 0,
            polygon_json: JSON.stringify(cizimNoktalari)
        };

        try {
            const url = duzenleId ? `${API}/${duzenleId}` : API;
            const res = await authFetch(url, { method: duzenleId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
            if (res.ok) {
                formIptal();
                yukle();
            } else {
                alert('Kaydedilirken hata oluştu.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const duzenleBaslat = (b) => {
        setDuzenleId(b.id);
        setFormAcik(false);
        setYeniBolge({ ad: b.ad, renk: b.renk, min_tutar: b.min_tutar, teslimat_ucreti: b.teslimat_ucreti });
        setCizimNoktalari(JSON.parse(b.polygon_json));
    };

    const sil = async (id, ad) => {
        if (!confirm(`"${ad}" bölgesini silmek istediğinize emin misiniz?`)) return;
        try {
            const res = await authFetch(`${API}/${id}`, { method: 'DELETE' });
            if (res.ok) yukle();
        } catch (e) {
            console.error(e);
        }
    };

    const mapCenter = dukkanKonum?.enlem && dukkanKonum?.boylam ? [dukkanKonum.enlem, dukkanKonum.boylam] : defaultCenter;

    if (yukleniyor) return <div className="py-10 text-center text-sm text-gray-400">Yükleniyor...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="section-title">Teslimat Bölgeleri</h2>
                    <p className="text-xs text-gray-500">Çizilen bölgelere göre minimum sipariş tutarı ve teslimat ücreti belirlenir.</p>
                </div>
                {!formAcik && !duzenleId && (
                    <button onClick={() => setFormAcik(true)} className="btn-primary !py-1.5 !text-xs">+ Yeni Bölge</button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                {/* Sol Taraf: Liste veya Form */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    {(formAcik || duzenleId) ? (
                        <form onSubmit={kaydet} className="card p-4 space-y-3 animate-slide-up border-primary-200">
                            <h3 className="font-semibold text-gray-800 text-sm mb-2">{duzenleId ? 'Bölgeyi Düzenle' : 'Yeni Bölge'}</h3>
                            <div>
                                <label className="label">Bölge Adı</label>
                                <input type="text" className="input-field" value={yeniBolge.ad} onChange={e => setYeniBolge({ ...yeniBolge, ad: e.target.value })} autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="label">Min. Sepet Tutarı (₺)</label>
                                    <input type="number" step="0.5" className="input-field" value={yeniBolge.min_tutar} onChange={e => setYeniBolge({ ...yeniBolge, min_tutar: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Teslimat Ücreti (₺)</label>
                                    <input type="number" step="0.5" className="input-field" value={yeniBolge.teslimat_ucreti} onChange={e => setYeniBolge({ ...yeniBolge, teslimat_ucreti: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="label">Harita Rengi</label>
                                    <div className="flex gap-1 mt-1">
                                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'].map(r => (
                                            <button key={r} type="button" onClick={() => setYeniBolge({ ...yeniBolge, renk: r })}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform ${yeniBolge.renk === r ? 'scale-110 border-gray-600' : 'border-transparent hover:scale-110'}`}
                                                style={{ backgroundColor: r }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
                                <p className="text-[11px] text-gray-500">
                                    {cizimNoktalari.length < 3 ? 'Haritada en az 3 noktaya tıklayarak bölgeyi çizin.' : `${cizimNoktalari.length} nokta seçildi.`}
                                </p>
                                <div className="flex gap-1.5 justify-end">
                                    {cizimNoktalari.length > 0 && <button type="button" onClick={sonNoktayiSil} className="btn-secondary !py-1 !px-2 !text-[11px]">Geri Al</button>}
                                    {cizimNoktalari.length > 0 && <button type="button" onClick={cizimiTemizle} className="btn-secondary !py-1 !px-2 !text-[11px] !text-red-500">Temizle</button>}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={formIptal} className="btn-secondary flex-1">İptal</button>
                                <button type="submit" className="btn-primary flex-1">Kaydet</button>
                            </div>
                        </form>
                    ) : (
                        <div className="card p-0 overflow-hidden divide-y divide-gray-100">
                            {bolgeler.length === 0 ? (
                                <p className="text-sm text-gray-400 p-4 text-center">Henüz bölge eklenmemiş.</p>
                            ) : bolgeler.map(b => (
                                <div key={b.id} className="p-3 hover:bg-gray-50 transition-colors group relative">
                                    <div className="flex items-start gap-2">
                                        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: b.renk }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{b.ad}</p>
                                            <div className="flex gap-2 text-[11px] text-gray-500 mt-0.5">
                                                <span>Min: ₺{b.min_tutar}</span>
                                                <span>Ücret: ₺{b.teslimat_ucreti === 0 ? 'Ücretsiz' : b.teslimat_ucreti}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => duzenleBaslat(b)} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">✎</button>
                                        <button onClick={() => sil(b.id, b.ad)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ Taraf: Harita */}
                <div className="w-full lg:w-2/3 h-[400px] lg:h-[500px] card overflow-hidden p-1 relative z-0">
                    <MapContainer center={mapCenter} zoom={13} className="w-full h-full rounded-lg">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                        <MapClickHandler onMapClick={handleMapClick} />
                        
                        {/* Dükkan İşareti */}
                        {dukkanKonum?.enlem && dukkanKonum?.boylam && (
                            <Marker position={[dukkanKonum.enlem, dukkanKonum.boylam]}>
                                <Tooltip direction="top" permanent className="font-semibold">İşletme</Tooltip>
                            </Marker>
                        )}

                        {/* Kayıtlı Bölgeler */}
                        {bolgeler.map(b => {
                            if (duzenleId === b.id) return null; // Düzenlenen bölgeyi çizerken gizle
                            try {
                                const yapi = JSON.parse(b.polygon_json);
                                return (
                                    <Polygon key={b.id} positions={yapi} pathOptions={{ color: b.renk, fillColor: b.renk, fillOpacity: 0.2 }}>
                                        <Tooltip sticky>{b.ad} (Min: ₺{b.min_tutar})</Tooltip>
                                    </Polygon>
                                );
                            } catch { return null; }
                        })}

                        {/* Aktif Çizim */}
                        {(formAcik || duzenleId) && cizimNoktalari.length > 0 && (
                            <>
                                {cizimNoktalari.length >= 3 && (
                                    <Polygon positions={cizimNoktalari} pathOptions={{ color: yeniBolge.renk, fillColor: yeniBolge.renk, fillOpacity: 0.4 }} />
                                )}
                                {cizimNoktalari.map((pos, i) => (
                                    <CircleMarker key={i} center={pos} radius={4} pathOptions={{ color: '#000', fillColor: '#fff', fillOpacity: 1 }} />
                                ))}
                            </>
                        )}
                    </MapContainer>
                    {(formAcik || duzenleId) && (
                        <div className="absolute top-2 left-12 right-12 z-[400] bg-white/90 backdrop-blur border border-primary-200 text-primary-700 text-xs text-center font-medium py-1.5 px-3 rounded-lg shadow-sm">
                            Haritaya tıklayarak bölge sınırlarını belirleyin
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BolgeYonetimi;
