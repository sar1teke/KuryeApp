import { useState } from 'react';
import { adisyonYazdir } from '../../utils/printService';

const durumStil = {
  'Alındı': { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Hazırlanıyor': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Hazır': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Kuryede': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Yolda': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Teslim Edildi': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'İptal': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const sonrakiDurum = {
  'Alındı': { durum: 'Hazırlanıyor', label: 'Hazırla' },
  'Hazırlanıyor': { durum: 'Hazır', label: 'Hazır' },
  'Hazır': { durum: 'Yolda', label: 'Yola Çıkar' },
  'Yolda': { durum: 'Teslim Edildi', label: 'Teslim Et' },
};

const SiparisKart = ({ siparis, onDetayTikla, onDurumDegistir, onIptal, onKuryeAta, musaitKuryeler = [] }) => {
  const [kuryeMenuAcik, setKuryeMenuAcik] = useState(false);
  const ds = durumStil[siparis.durum] || durumStil['Alındı'];
  const sonraki = sonrakiDurum[siparis.durum];
  const suAnki = siparis.tarih ? new Date(siparis.tarih) : null;
  const gecenDk = suAnki ? Math.round((Date.now() - suAnki.getTime()) / 60000) : null;

  return (
    <div className="card flex flex-col justify-between h-full hover:shadow-md transition-shadow cursor-pointer" onClick={onDetayTikla}>
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">#{siparis.id}</span>
            <span className="text-[11px] text-gray-400">
              {suAnki ? suAnki.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {gecenDk !== null && gecenDk > 0 && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${gecenDk > 45 ? 'bg-red-50 text-red-600' : gecenDk > 20 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>
                {gecenDk}dk
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`badge ${ds.bg} ${ds.text}`}>{siparis.durum}</span>
            {siparis.zamanlanmis_tarih && siparis.zamanlanmis_saat && (
              <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-indigo-100">
                🕒 {new Date(siparis.zamanlanmis_tarih).toLocaleDateString('tr-TR')} {siparis.zamanlanmis_saat}
              </span>
            )}
          </div>
        </div>

        {/* Customer */}
        <p className="text-sm font-medium text-gray-800 truncate">{siparis.musteriAdi}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{siparis.adres}</p>

        {/* Items */}
        {(siparis.icerik || []).length > 0 && (
          <div className="mt-2.5 bg-gray-50 rounded-lg p-2.5 space-y-0.5">
            {siparis.icerik.slice(0, 2).map((u, i) => (
              <p key={i} className="text-xs text-gray-600 truncate">• {u}</p>
            ))}
            {siparis.icerik.length > 2 && <p className="text-[11px] text-gray-400">+{siparis.icerik.length - 2} daha</p>}
          </div>
        )}

        {/* Kurye Info */}
        {siparis.kurye_adi && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <span className="text-[11px] text-blue-600 font-medium">{siparis.kurye_adi}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
        <div>
          <p className="text-base font-bold text-gray-900">₺{(siparis.tutar || 0).toFixed(2)}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${(siparis.odemeYontemi || siparis.odeme_yontemi) === 'Kart' ? 'bg-blue-50 text-blue-600' :
              (siparis.odemeYontemi || siparis.odeme_yontemi) === 'Havale' ? 'bg-cyan-50 text-cyan-600' :
                (siparis.odemeYontemi || siparis.odeme_yontemi) === 'Online' ? 'bg-violet-50 text-violet-600' :
                  (siparis.odemeYontemi || siparis.odeme_yontemi) === 'Açık Hesap' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-500'
            }`}>{siparis.odemeYontemi || siparis.odeme_yontemi || 'Nakit'}</span>
        </div>
        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          {/* Kurye Ata Butonu - Hazır durumundayken ve kurye atanmamışken */}
          {(siparis.durum === 'Hazır' || siparis.durum === 'Hazırlanıyor') && !siparis.kurye_id && onKuryeAta && (
            <div className="relative">
              <button onClick={() => setKuryeMenuAcik(!kuryeMenuAcik)}
                className="btn-secondary !py-1.5 !px-2 !text-[11px] flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Kurye
              </button>
              {kuryeMenuAcik && (
                <div className="absolute bottom-full right-0 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                  {musaitKuryeler.length === 0 ? (
                    <p className="text-xs text-gray-400 px-3 py-2">Müsait kurye yok</p>
                  ) : musaitKuryeler.map(k => (
                    <button key={k.id} onClick={() => { onKuryeAta(siparis.id, k.id); setKuryeMenuAcik(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex justify-between items-center">
                      <span className="font-medium text-gray-800">{k.ad} {k.soyad}</span>
                      <span className="text-[10px] text-gray-400">{k.aktif_gorev || 0} görev</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* İptal Butonu */}
          {!['Teslim Edildi', 'İptal'].includes(siparis.durum) && onIptal && (
            <button onClick={() => onIptal(siparis.id)}
              className="btn !py-1.5 !px-2 !text-[11px] text-red-500 bg-red-50 border border-red-200 hover:bg-red-100">İptal</button>
          )}

          {/* Yazdır Butonu */}
          <button onClick={() => adisyonYazdir(siparis)}
            className="btn !py-1.5 !px-2 !text-[11px] text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 flex items-center gap-1" title="Adisyon Yazdır">
            🖨️
          </button>

          {/* Sonraki Durum Butonu */}
          {sonraki && (
            <button onClick={() => onDurumDegistir(siparis.id, sonraki.durum)}
              className="btn-primary !py-1.5 !px-3 !text-xs">{sonraki.label}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiparisKart;