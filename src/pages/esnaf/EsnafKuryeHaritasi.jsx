// src/pages/esnaf/EsnafKuryeHaritasi.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

// Kurye İkonu
const createKuryeIcon = (ad, soyad) => {
    return L.divIcon({
        className: '',
        html: `
            <div class="flex flex-col items-center">
                <div class="bg-blue-600 border-2 border-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-white font-bold text-xs uppercase z-20">
                    ${ad.charAt(0)}${soyad ? soyad.charAt(0) : ''}
                </div>
                <div class="w-1.5 h-1.5 bg-blue-600 rotate-45 -mt-1 z-10"></div>
            </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
    });
};

const EsnafKuryeHaritasi = () => {
    const [kuryeler, setKuryeler] = useState({});

    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on('kurye_canli_konum', (data) => {
            setKuryeler(prev => ({
                ...prev,
                [data.kuryeId]: data
            }));
        });

        return () => socket.disconnect();
    }, []);

    // Denizli Merkez Varsayılan
    const mapCenter = [37.7749, 29.0875];

    return (
        <div className="h-full w-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">

            {/* Üst Bilgi Başlığı */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 z-10 relative">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">📍 Canlı Kurye Takibi</h2>
                    <p className="text-sm text-gray-500">Kuryelerinizin anlık konumlarını harita üzerinden izleyin.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700">{Object.keys(kuryeler).length} Kurye Aktif</span>
                </div>
            </div>

            {/* Harita Alanı */}
            <div className="flex-1 w-full z-0 relative">
                <MapContainer center={mapCenter} zoom={13} className="w-full h-full">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />

                    {Object.values(kuryeler).map((kurye) => (
                        <Marker
                            key={kurye.kuryeId}
                            position={[kurye.lat, kurye.lng]}
                            icon={createKuryeIcon(kurye.ad, kurye.soyad)}
                        >
                            <Popup>
                                <div className="text-center font-medium">
                                    <p className="text-base text-gray-900 border-b pb-1 mb-1">{kurye.ad} {kurye.soyad}</p>
                                    <p className="text-xs text-gray-500">
                                        Son Güncelleme: {new Date(kurye.sonGuncelleme).toLocaleTimeString('tr-TR')}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                </MapContainer>
            </div>
        </div>
    );
};

export default EsnafKuryeHaritasi;
