// src/pages/esnaf/SilinenSiparisler.jsx
import { useEffect, useState } from 'react';
import { SiparisServisi } from '../../api/siparisService';

const SilinenSiparisler = () => {
  const [silinenler, setSilinenler] = useState([]);
  useEffect(() => { veriGetir(); }, []);
  const veriGetir = async () => setSilinenler(await SiparisServisi.getSiparisler(false));
  const geriYukle = async (id) => { if (confirm("Geri yüklensin mi?")) { await SiparisServisi.siparisGeriYukle(id); veriGetir(); } };

  const toplamTutar = silinenler.reduce((t, s) => t + (s.tutar || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Silinen Siparişler</h1>
          <p className="page-subtitle">{silinenler.length} kayıt{silinenler.length > 0 && ` · ₺${toplamTutar.toFixed(0)}`}</p>
        </div>
      </div>

      {silinenler.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">🗑️</div>
          <p className="text-gray-500 text-sm font-medium">Silinen sipariş yok</p>
          <p className="text-gray-400 text-xs mt-1">Sildiğiniz siparişler burada görünür ve geri yüklenebilir.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="table-header px-4 py-3">ID</th><th className="table-header px-4 py-3">Müşteri</th>
              <th className="table-header px-4 py-3">Tutar</th><th className="table-header px-4 py-3">Tarih</th>
              <th className="table-header px-4 py-3 text-right">İşlem</th>
            </tr></thead>
            <tbody>
              {silinenler.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">#{s.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.musteriAdi || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">₺{(s.tutar || 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.tarih ? new Date(s.tarih).toLocaleString('tr-TR') : '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => geriYukle(s.id)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 px-2 py-1 rounded-md text-[11px] font-medium transition-colors">Geri Yükle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SilinenSiparisler;