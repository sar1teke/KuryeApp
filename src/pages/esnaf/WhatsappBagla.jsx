import { useState, useEffect } from 'react';

const WhatsappBagla = () => {
    const [status, setStatus] = useState({ isReady: false, qr: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const data = await (await fetch('http://localhost:3001/api/status')).json();
            setStatus(data);
            setLoading(false);
        } catch { setLoading(false); }
    };

    return (
        <div className="space-y-5">
            <h1 className="page-title">WhatsApp Bağlantısı</h1>

            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px]">
                {loading ? (
                    <div className="text-gray-400 text-sm animate-pulse">Bağlanılıyor...</div>
                ) : status.isReady ? (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-lg font-semibold text-emerald-600 mb-1">Bağlı</h2>
                        <p className="text-sm text-gray-500 text-center max-w-md">WhatsApp bağlantısı aktif. Sipariş sayfasından konum çekebilirsiniz.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <p className="text-sm text-gray-600 mb-5 max-w-md">
                            Telefonunuzda WhatsApp → <span className="font-medium">Ayarlar → Bağlı Cihazlar → Cihaz Bağla</span> adımlarını izleyin.
                        </p>
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs p-2 bg-white">
                            <iframe src="http://localhost:3001/api/qr-image" className="w-[260px] h-[260px] overflow-hidden" scrolling="no" frameBorder="0" />
                        </div>
                        <div className="mt-4 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center gap-2">
                            <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                            QR Kod bekleniyor...
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {['WhatsApp Ayarlarını aç', 'Bağlı Cihazlar → Cihaz Bağla', 'QR kodu kamerayla okut'].map((t, i) => (
                    <div key={i} className="card p-4">
                        <p className="text-xs font-semibold text-gray-400 mb-1">{i + 1}. Adım</p>
                        <p className="text-sm text-gray-700">{t}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WhatsappBagla;
