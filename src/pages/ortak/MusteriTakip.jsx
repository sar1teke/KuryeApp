// src/pages/ortak/MusteriTakip.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { BildirimServisi } from '../../api/bildirimService';

const kuryeIcon = L.divIcon({
    className: '',
    html: `<div style="background:#4f6ef7;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
});

const dukkanIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f59e0b;border:2px solid white;border-radius:50%;width:12px;height:12px;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6]
});

const durumRenk = {
    'Alındı': 'bg-gray-400',
    'Hazırlanıyor': 'bg-amber-500',
    'Hazır': 'bg-blue-500',
    'Yolda': 'bg-primary-600',
    'Teslim Edildi': 'bg-emerald-500',
    'İptal': 'bg-red-500',
};

const MusteriTakip = () => {
    const { token } = useParams();
    const [siparis, setSiparis] = useState(null);
    const [hata, setHata] = useState(null);
    const [kuryeKonum, setKuryeKonum] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => {
        const yukle = async () => {
            const data = await BildirimServisi.getTakipBilgisi(token);
            if (!data) { setHata('Bu takip linki geçersiz veya süresi dolmuş.'); setYukleniyor(false); return; }
            setSiparis(data);
            setYukleniyor(false);
        };
        yukle();
        const interval = setInterval(yukle, 15000); // 15sn'de bir güncelle
        return () => clearInterval(interval);
    }, [token]);

    // Kurye konumunu canlı dinle
    useEffect(() => {
        const socket = io('http://localhost:3001');
        socket.on('kurye_canli_konum', (data) => {
            setKuryeKonum({ lat: data.lat, lng: data.lng });
        });
        return () => socket.disconnect();
    }, []);

    if (yukleniyor) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center font-['Inter',sans-serif]">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (hata) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center font-['Inter',sans-serif]">
                <div className="card p-8 text-center max-w-sm">
                    <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-gray-600">{hata}</p>
                </div>
            </div>
        );
    }

    const durumlar = ['Alındı', 'Hazırlanıyor', 'Hazır', 'Yolda', 'Teslim Edildi'];
    const aktifIndex = durumlar.indexOf(siparis.durum);
    const center = kuryeKonum || { lat: 37.7997, lng: 29.0197 };

    return (
        <div className="min-h-screen bg-[#f8f9fb] font-['Inter',sans-serif]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <h1 className="text-sm font-semibold text-gray-900">KuryeApp Takip</h1>
                    <span className="badge bg-primary-50 text-primary-700">#{siparis.id}</span>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-3">
                {/* Status Progress */}
                <div className="card p-4">
                    <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-3">Sipariş Durumu</p>
                    <div className="flex items-center gap-1 mb-3">
                        {durumlar.map((d, i) => (
                            <div key={d} className="flex-1 flex flex-col items-center">
                                <div className={`w-full h-1.5 rounded-full ${i <= aktifIndex ? (siparis.durum === 'İptal' ? 'bg-red-500' : 'bg-primary-600') : 'bg-gray-200'}`} />
                                <span className={`text-[9px] mt-1 ${i <= aktifIndex ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{d}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${durumRenk[siparis.durum] || 'bg-gray-400'}`} />
                        <span className="text-sm font-semibold text-gray-900">{siparis.durum}</span>
                    </div>
                </div>

                {/* Map (show only when Yolda) */}
                {siparis.durum === 'Yolda' && kuryeKonum && (
                    <div className="card overflow-hidden" style={{ height: 250 }}>
                        <MapContainer center={[center.lat, center.lng]} zoom={15} className="w-full h-full" zoomControl={false}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                            <Marker position={[kuryeKonum.lat, kuryeKonum.lng]} icon={kuryeIcon}>
                                <Popup>Kurye</Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                )}

                {siparis.durum === 'Yolda' && !kuryeKonum && (
                    <div className="card p-4 text-center">
                        <p className="text-xs text-gray-500">Kurye konumu bekleniyor...</p>
                    </div>
                )}

                {/* Order Info */}
                <div className="card p-4 space-y-3">
                    <p className="section-title">Sipariş Bilgileri</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Müşteri</span>
                            <span className="text-gray-800 font-medium">{siparis.musteriAdi}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Adres</span>
                            <span className="text-gray-800 font-medium text-right max-w-[200px] truncate">{siparis.adres || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tutar</span>
                            <span className="text-gray-900 font-bold">₺{siparis.tutar}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Ödeme</span>
                            <span className="text-gray-800">{siparis.odemeYontemi}</span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                {siparis.kalemler?.length > 0 && (
                    <div className="card p-4">
                        <p className="section-title mb-2">Ürünler</p>
                        <div className="space-y-1.5">
                            {siparis.kalemler.map((k, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{k.adet}x {k.ad}</span>
                                    <span className="text-gray-500">₺{(k.fiyat * k.adet).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                {siparis.gecmis?.length > 0 && (
                    <div className="card p-4">
                        <p className="section-title mb-3">Zaman Çizelgesi</p>
                        <div className="space-y-3">
                            {siparis.gecmis.map((g, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full ${durumRenk[g.durum] || 'bg-gray-400'}`} />
                                        {i < siparis.gecmis.length - 1 && <div className="w-px h-6 bg-gray-200 mt-1" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-800">{g.durum}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(g.tarih).toLocaleString('tr-TR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-[10px] text-gray-400 pt-2">KuryeApp ile güvenli teslimat</p>
            </div>
        </div>
    );
};

export default MusteriTakip;
