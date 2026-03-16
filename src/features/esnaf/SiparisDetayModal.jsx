import { useState, useEffect } from 'react';
import { SiparisServisi } from '../../api/siparisService';
import { useNavigate } from 'react-router-dom';
import { adisyonYazdir } from '../../utils/printService';

const SiparisDetayModal = ({ siparis, kapat }) => {
  const [gecmis, setGecmis] = useState([]);
  const [yuklenyor, setYuklenyor] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (siparis?.id) {
      setYuklenyor(true);
      SiparisServisi.getSiparis(siparis.id).then(data => {
        if (data?.gecmis) setGecmis(data.gecmis);
        setYuklenyor(false);
      });
    }
  }, [siparis?.id]);

  if (!siparis) return null;
  const odeme = siparis.odemeYontemi || siparis.odeme_yontemi || 'Nakit';

  const handlePrint = () => {
    adisyonYazdir(siparis);
  };

  const handleTekrarSiparis = () => {
    // Sipariş verilerini localStorage'a koy ve yönlendir
    const tekrar = {
      musteriAdi: siparis.musteriAdi,
      telefon: siparis.telefon,
      adres: siparis.adres,
      musteri_id: siparis.musteri_id,
      icerik: siparis.icerik,
      tutar: siparis.tutar,
      odemeYontemi: odeme
    };
    localStorage.setItem('tekrarSiparis', JSON.stringify(tekrar));
    kapat();
    navigate('/esnaf/yeni-siparis');
  };

  const odemeBadge = {
    'Nakit': 'bg-gray-100 text-gray-600',
    'Kart': 'bg-blue-50 text-blue-600',
    'Havale': 'bg-cyan-50 text-cyan-600',
    'Online': 'bg-violet-50 text-violet-600',
    'Açık Hesap': 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200 animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Sipariş Detayı</h3>
            <span className="text-xs text-gray-400">#{siparis.id}</span>
          </div>
          <button onClick={kapat} className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status + Payment */}
          <div className="flex gap-2 flex-wrap">
            <span className="badge bg-blue-50 text-blue-700">{siparis.durum}</span>
            <span className={`badge ${odemeBadge[odeme] || 'bg-gray-100 text-gray-600'}`}>{odeme}</span>
          </div>

          {/* Customer */}
          <div>
            <p className="section-title mb-2">Müşteri</p>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Ad</span><span className="font-medium text-gray-800">{siparis.musteriAdi}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Telefon</span><span className="text-gray-800">{siparis.telefon || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Adres</span><span className="text-gray-800 text-right max-w-[60%]">{siparis.adres}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tarih</span><span className="text-gray-800">{siparis.tarih ? new Date(siparis.tarih).toLocaleString('tr-TR') : '—'}</span></div>
            </div>
          </div>

          {/* Kurye Bilgisi */}
          {siparis.kurye_adi && (
            <div>
              <p className="section-title mb-2">Kurye</p>
              <div className="flex items-center gap-2.5 bg-blue-50 rounded-lg p-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                  {siparis.kurye_adi?.charAt(0) || 'K'}
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">{siparis.kurye_adi}</p>
                  {siparis.kurye_telefon && <p className="text-[11px] text-blue-500">{siparis.kurye_telefon}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="section-title mb-2">Ürünler</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              {(siparis.icerik || []).map((item, i) => (
                <p key={i} className="text-sm text-gray-700">• {item}</p>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {gecmis.length > 0 && (
            <div>
              <p className="section-title mb-2">Geçmiş</p>
              <div className="space-y-2">
                {gecmis.map((k, i) => (
                  <div key={k.id || i} className="flex items-start gap-2.5 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === gecmis.length - 1 ? 'bg-primary-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{k.durum}</span>
                        <span className="text-[11px] text-gray-400">{new Date(k.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {k.degistiren_ad && <p className="text-xs text-gray-400">{k.degistiren_ad}</p>}
                      {k.neden && <p className="text-xs text-red-400 italic">{k.neden}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {yuklenyor && <p className="text-xs text-gray-400 text-center animate-pulse">Yükleniyor...</p>}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Toplam</span>
            <span className="text-lg font-bold text-gray-900">₺{(siparis.tutar || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={kapat} className="btn-secondary flex-1">Kapat</button>
          <button onClick={handleTekrarSiparis} className="btn-secondary flex-1 !text-violet-600 !border-violet-200 !bg-violet-50 hover:!bg-violet-100">Tekrar Sipariş</button>
          <button onClick={handlePrint} className="btn-primary flex-1">Yazdır</button>
        </div>
      </div>
    </div>
  );
};

export default SiparisDetayModal;