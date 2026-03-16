import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createDotIcon = (color, size = 14) => L.divIcon({
    className: '',
    html: `<div style="background:${color};border:2px solid white;border-radius:50%;width:${size}px;height:${size}px;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
});

const ikonKurye = createDotIcon('#4f6ef7', 16);
const ikonDukkan = createDotIcon('#f59e0b', 14);
const ikonMusteri = createDotIcon('#ef4444', 14);

const FitBounds = ({ bounds, panelAcik, odakSiparisId, recenterCounter }) => {
    const map = useMap();
    useEffect(() => {
        if (!bounds || bounds.length === 0) return;
        const t = setTimeout(() => {
            if (bounds.length > 1) map.fitBounds(bounds, { paddingBottomRight: [0, panelAcik ? 320 : 100], padding: [50, 50], maxZoom: 16 });
            else map.setView(bounds[0], 15);
        }, 100);
        return () => clearTimeout(t);
    }, [odakSiparisId, recenterCounter]);
    return null;
};

const MapResizeTrigger = ({ aktifTab }) => {
    const map = useMap();
    useEffect(() => { if (aktifTab === 'harita') setTimeout(() => map.invalidateSize(), 50); }, [aktifTab, map]);
    return null;
};

async function osrmRota(start, end) {
    try {
        const r = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`)).json();
        if (r.code !== 'Ok' || !r.routes?.length) return null;
        return { coords: r.routes[0].geometry.coordinates.map(c => [c[1], c[0]]), km: (r.routes[0].distance / 1000).toFixed(1), dk: Math.ceil(r.routes[0].duration / 60) };
    } catch { return null; }
}

export default function HaritaTab({ kuryeKonum, dukkanKonum, odakSiparis, haritaKapat, aktifTab }) {
    const [leg1, setLeg1] = useState(null);
    const [leg2, setLeg2] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recenterCounter, setRecenterCounter] = useState(0);
    const [panelAcik, setPanelAcik] = useState(true);
    const [navAktif, setNavAktif] = useState(false);
    const [navAdim, setNavAdim] = useState(0);
    const [kalan, setKalan] = useState(null);

    const musteriKonum = (() => {
        if (!odakSiparis) return null;
        if (odakSiparis.lat && odakSiparis.lng) return { lat: odakSiparis.lat, lng: odakSiparis.lng };
        const m = odakSiparis.adres?.match(/q=([-\d.]+),([-\d.]+)/);
        return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
    })();

    useEffect(() => {
        setLeg1(null); setLeg2(null); setNavAktif(false); setNavAdim(0); setKalan(null); setPanelAcik(!!odakSiparis);
        if (!odakSiparis || !kuryeKonum || !dukkanKonum) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const r1 = await osrmRota(kuryeKonum, dukkanKonum);
            if (cancelled) return; setLeg1(r1);
            if (musteriKonum) { const r2 = await osrmRota(dukkanKonum, musteriKonum); if (!cancelled) setLeg2(r2); }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [odakSiparis?.id]);

    const navBaslat = () => { setNavAktif(true); setNavAdim(0); setPanelAcik(true); setKalan(leg1 ? { km: leg1.km, dk: leg1.dk } : null); };
    const navDukkanVardim = () => { setNavAdim(1); setPanelAcik(true); setKalan(leg2 ? { km: leg2.km, dk: leg2.dk } : null); };
    const navTeslimEttim = () => { setNavAktif(false); setNavAdim(0); setKalan(null); alert('Teslimat tamamlandı.'); };
    const gMapsAc = () => {
        if (!kuryeKonum) return;
        let url = `https://www.google.com/maps/dir/?api=1&origin=${kuryeKonum.lat},${kuryeKonum.lng}&travelmode=driving`;
        if (dukkanKonum && musteriKonum) url += `&waypoints=${dukkanKonum.lat},${dukkanKonum.lng}&destination=${musteriKonum.lat},${musteriKonum.lng}`;
        else if (dukkanKonum) url += `&destination=${dukkanKonum.lat},${dukkanKonum.lng}`;
        window.open(url, '_blank');
    };

    const bounds = [];
    if (kuryeKonum) bounds.push([kuryeKonum.lat, kuryeKonum.lng]);
    if (dukkanKonum) bounds.push([dukkanKonum.lat, dukkanKonum.lng]);
    if (musteriKonum) bounds.push([musteriKonum.lat, musteriKonum.lng]);
    const topKm = ((parseFloat(leg1?.km || 0)) + (parseFloat(leg2?.km || 0))).toFixed(1);
    const topDk = (leg1?.dk || 0) + (leg2?.dk || 0);
    const center = kuryeKonum || dukkanKonum || { lat: 37.7997, lng: 29.0197 };

    return (
        <div className="h-full w-full relative z-0 flex flex-col overflow-hidden rounded-xl bg-gray-50">
            <div className="flex-1 w-full relative h-full">
                <MapContainer center={[center.lat, center.lng]} zoom={15} className="w-full h-full" zoomControl={false}>
                    <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <MapResizeTrigger aktifTab={aktifTab} />
                    {bounds.length > 0 && <FitBounds bounds={bounds} panelAcik={panelAcik} odakSiparisId={odakSiparis?.id} recenterCounter={recenterCounter} />}
                    {kuryeKonum && <Marker position={[kuryeKonum.lat, kuryeKonum.lng]} icon={ikonKurye}><Popup>Kurye</Popup></Marker>}
                    {dukkanKonum && <Marker position={[dukkanKonum.lat, dukkanKonum.lng]} icon={ikonDukkan}><Popup>Dükkan</Popup></Marker>}
                    {musteriKonum && <Marker position={[musteriKonum.lat, musteriKonum.lng]} icon={ikonMusteri}><Popup>{odakSiparis?.musteriAdi}</Popup></Marker>}
                    {leg1?.coords?.length > 0 && <Polyline positions={leg1.coords} pathOptions={{ color: navAktif && navAdim === 0 ? '#f59e0b' : '#94a3b8', weight: 4, opacity: 1 }} />}
                    {leg2?.coords?.length > 0 && <Polyline positions={leg2.coords} pathOptions={{ color: navAktif && navAdim === 1 ? '#ef4444' : '#94a3b8', weight: 4, opacity: 1 }} />}
                </MapContainer>

                {loading && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2 z-[1000]">
                        <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-600">Hesaplanıyor...</span>
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            <div className={`absolute bottom-0 left-0 w-full bg-white rounded-t-2xl shadow-modal z-[1000] px-4 pb-5 pt-2 transition-transform duration-300 ${panelAcik ? 'translate-y-0' : 'translate-y-[calc(100%-72px)]'}`}>
                <div className="w-full flex justify-center pb-1.5 cursor-pointer" onClick={() => setPanelAcik(!panelAcik)}>
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className={`absolute right-4 -top-12`}>
                    <button onClick={() => setRecenterCounter(p => p + 1)} className="bg-white w-10 h-10 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>

                {!odakSiparis ? (
                    <div className="text-center py-5">
                        <p className="text-sm font-medium text-gray-800">Rota Yok</p>
                        <p className="text-xs text-gray-400 mt-1">Sipariş seçildiğinde rota bilgisi burada görünecek.</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-start mb-3" onClick={() => !panelAcik && setPanelAcik(true)}>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">
                                    {navAktif ? (navAdim === 0 ? 'Dükkana İlerleyin' : 'Müşteriye İlerleyin') : odakSiparis.musteriAdi}
                                </h2>
                                <p className="text-xs text-gray-500 truncate max-w-[240px]">{navAktif ? odakSiparis.musteriAdi : odakSiparis.adres}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-2xl font-bold text-gray-900">{navAktif ? (kalan ? kalan.dk : '—') : topDk}<span className="text-xs font-medium ml-0.5 text-gray-500">dk</span></span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{navAktif ? 'kalan' : `${topKm} km`}</span>
                            </div>
                        </div>

                        <div className={`transition-all duration-300 overflow-hidden ${panelAcik ? 'opacity-100 max-h-[400px]' : 'opacity-0 max-h-0'}`}>
                            <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                                {[
                                    { l: 'Dükkana Geçiş', v: leg1 ? `${leg1.km} km · ${leg1.dk} dk` : '—', active: navAktif && navAdim === 0, c: 'bg-amber-500' },
                                    { l: 'Müşteriye Teslimat', v: leg2 ? `${leg2.km} km · ${leg2.dk} dk` : '—', active: navAktif && navAdim === 1, c: 'bg-red-500' },
                                ].map((r, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${r.active ? r.c : 'bg-gray-300'}`} />
                                            <span className={`font-medium ${r.active ? 'text-gray-900' : 'text-gray-500'}`}>{r.l}</span>
                                        </div>
                                        <span className="font-semibold text-gray-800">{r.v}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={navAktif ? () => { setNavAktif(false); setNavAdim(0); } : haritaKapat} className="btn-secondary !py-3">
                                    {navAktif ? 'İptal' : 'Kapat'}
                                </button>
                                {!navAktif ? (
                                    <>
                                        <button onClick={gMapsAc} className="btn-secondary !py-3 !px-3">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                        </button>
                                        <button onClick={navBaslat} className="btn-primary flex-1 !py-3 flex items-center justify-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                                            Navigasyonu Başlat
                                        </button>
                                    </>
                                ) : navAdim === 0 ? (
                                    <button onClick={navDukkanVardim} className="btn-primary flex-1 !py-3">Dükkana Vardım</button>
                                ) : (
                                    <button onClick={navTeslimEttim} className="btn-primary flex-1 !py-3">Teslimatı Tamamla</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
