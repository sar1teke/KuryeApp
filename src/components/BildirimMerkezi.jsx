// src/components/BildirimMerkezi.jsx
import { useState, useEffect, useRef } from 'react';
import { BildirimServisi } from '../api/bildirimService';
import { io } from 'socket.io-client';

// Notification sound (base64 encoded short beep)
const BILDIRIM_SESI = (() => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        return () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.value = 0.15;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        };
    } catch { return () => { }; }
})();

const BildirimMerkezi = ({ rol = 'esnaf' }) => {
    const [acik, setAcik] = useState(false);
    const [bildirimler, setBildirimler] = useState([]);
    const [okunmamis, setOkunmamis] = useState(0);
    const ref = useRef(null);

    // Initial load
    useEffect(() => {
        yukle();
        const interval = setInterval(yukle, 30000); // 30sn'de bir güncelle
        return () => clearInterval(interval);
    }, [rol]);

    // Socket.io for real-time notifications
    useEffect(() => {
        const socket = io('http://localhost:3001');
        socket.on('bildirim_yeni', (bildirim) => {
            if (bildirim.hedef_rol === rol || bildirim.hedef_rol === 'hepsi') {
                setBildirimler(prev => [bildirim, ...prev].slice(0, 50));
                setOkunmamis(prev => prev + 1);
                BILDIRIM_SESI();
            }
        });
        return () => socket.disconnect();
    }, [rol]);

    // Click outside to close
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAcik(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const yukle = async () => {
        const [list, sayi] = await Promise.all([
            BildirimServisi.getBildirimler(rol, 30),
            BildirimServisi.getOkunmamisSayisi(rol)
        ]);
        setBildirimler(list);
        setOkunmamis(sayi);
    };

    const okunduIsaretle = async (id) => {
        await BildirimServisi.okunduIsaretle(id);
        setBildirimler(prev => prev.map(b => b.id === id ? { ...b, okundu: 1 } : b));
        setOkunmamis(prev => Math.max(0, prev - 1));
    };

    const tumunuOkundu = async () => {
        await BildirimServisi.tumunuOkunduIsaretle(rol);
        setBildirimler(prev => prev.map(b => ({ ...b, okundu: 1 })));
        setOkunmamis(0);
    };

    const zamanFarkiGoster = (tarih) => {
        const fark = Date.now() - new Date(tarih).getTime();
        const dk = Math.floor(fark / 60000);
        if (dk < 1) return 'Şimdi';
        if (dk < 60) return `${dk}dk`;
        const saat = Math.floor(dk / 60);
        if (saat < 24) return `${saat}sa`;
        return `${Math.floor(saat / 24)}g`;
    };

    const tipIkonu = (tip) => {
        switch (tip) {
            case 'yeni_siparis': return <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
            case 'siparis_durum': return <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'kurye_atandi': return <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>;
            default: return <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
        }
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={() => setAcik(!acik)}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {okunmamis > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {okunmamis > 99 ? '99+' : okunmamis}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {acik && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-modal z-50 animate-slide-up overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
                        <div className="flex items-center gap-2">
                            {okunmamis > 0 && (
                                <button onClick={tumunuOkundu} className="text-[11px] text-primary-600 font-medium hover:underline">
                                    Tümünü oku
                                </button>
                            )}
                            <span className="badge bg-gray-100 text-gray-500">{okunmamis} yeni</span>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {bildirimler.length === 0 ? (
                            <div className="text-center py-10">
                                <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                </svg>
                                <p className="text-xs text-gray-400">Bildirim yok</p>
                            </div>
                        ) : (
                            bildirimler.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => !b.okundu && okunduIsaretle(b.id)}
                                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${!b.okundu ? 'bg-primary-50/30 hover:bg-primary-50/50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="mt-0.5 shrink-0">{tipIkonu(b.tip)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs leading-snug ${!b.okundu ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{b.baslik}</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{b.mesaj}</p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end">
                                        <span className="text-[10px] text-gray-400">{zamanFarkiGoster(b.created_at)}</span>
                                        {!b.okundu && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1" />}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BildirimMerkezi;
