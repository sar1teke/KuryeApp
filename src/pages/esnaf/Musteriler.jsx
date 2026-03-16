// src/pages/esnaf/Musteriler.jsx
import { useEffect, useState } from 'react';
import { MusteriServisi } from '../../api/musteriService';

const Musteriler = () => {
  const [musteriler, setMusteriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aramaMetni, setAramaMetni] = useState('');
  const [seciliMusteri, setSeciliMusteri] = useState(null);
  const [formAcik, setFormAcik] = useState(false);
  const [yeniMusteri, setYeniMusteri] = useState({ ad: '', soyad: '', telefon: '', adres: '' });
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [duzenleData, setDuzenleData] = useState({ ad: '', soyad: '', telefon: '', adres: '' });
  const [siralama, setSiralama] = useState('siparis');

  const verileriGetir = async () => { setYukleniyor(true); setMusteriler(await MusteriServisi.musteriListele()); setYukleniyor(false); };
  useEffect(() => { verileriGetir(); }, []);

  const filtrelenmis = musteriler.filter(m => {
    if (!aramaMetni) return true;
    const q = aramaMetni.toLowerCase();
    return m.ad?.toLowerCase().includes(q) || m.soyad?.toLowerCase().includes(q) || m.telefon?.includes(q);
  }).sort((a, b) => {
    if (siralama === 'ad') return (a.ad || '').localeCompare(b.ad || '');
    if (siralama === 'harcama') return (b.toplam_harcama || 0) - (a.toplam_harcama || 0);
    return (b.siparis_sayisi || 0) - (a.siparis_sayisi || 0);
  });

  const musteriEkle = async () => {
    if (!yeniMusteri.ad.trim()) return alert('Ad zorunlu!');
    if (await MusteriServisi.musteriEkle(yeniMusteri)) { setYeniMusteri({ ad: '', soyad: '', telefon: '', adres: '' }); setFormAcik(false); verileriGetir(); }
  };

  const musteriSil = async (id, ad) => {
    if (!confirm(`"${ad}" silinsin mi?`)) return;
    if (await MusteriServisi.musteriSil(id)) { if (seciliMusteri?.id === id) { setSeciliMusteri(null); setDuzenleModu(false); } verileriGetir(); }
  };

  const duzenleBaslat = () => {
    setDuzenleData({ ad: seciliMusteri.ad || '', soyad: seciliMusteri.soyad || '', telefon: seciliMusteri.telefon || '', adres: seciliMusteri.adres || '' });
    setDuzenleModu(true);
  };

  const duzenleKaydet = async () => {
    if (!duzenleData.ad.trim()) return alert('Ad zorunlu!');
    const s = await MusteriServisi.musteriGuncelle(seciliMusteri.id, duzenleData);
    if (s) { setSeciliMusteri(s); setDuzenleModu(false); verileriGetir(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Müşteriler</h1>
          <p className="page-subtitle">{musteriler.length} kayıt</p>
        </div>
        <button onClick={() => setFormAcik(!formAcik)} className="btn-primary">{formAcik ? 'Kapat' : '+ Yeni Müşteri'}</button>
      </div>

      {formAcik && (
        <div className="card p-4 animate-slide-up">
          <p className="section-title mb-3">Yeni Müşteri</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <input type="text" placeholder="Ad *" className="input-field" value={yeniMusteri.ad} onChange={e => setYeniMusteri({ ...yeniMusteri, ad: e.target.value })} />
            <input type="text" placeholder="Soyad" className="input-field" value={yeniMusteri.soyad} onChange={e => setYeniMusteri({ ...yeniMusteri, soyad: e.target.value })} />
            <input type="tel" placeholder="Telefon" className="input-field" value={yeniMusteri.telefon} onChange={e => setYeniMusteri({ ...yeniMusteri, telefon: e.target.value })} />
            <input type="text" placeholder="Adres" className="input-field" value={yeniMusteri.adres} onChange={e => setYeniMusteri({ ...yeniMusteri, adres: e.target.value })} />
          </div>
          <button onClick={musteriEkle} className="btn-primary">Kaydet</button>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input type="text" placeholder="Ara (ad, soyad, telefon)..." className="input-field !max-w-sm" value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
        <select value={siralama} onChange={e => setSiralama(e.target.value)} className="input-field !w-auto !min-w-[130px]">
          <option value="siparis">Sipariş Sayısı</option>
          <option value="harcama">Toplam Harcama</option>
          <option value="ad">İsme Göre</option>
        </select>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className={`${seciliMusteri ? 'flex-[2]' : 'flex-1'} transition-all`}>
          {yukleniyor ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtrelenmis.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">{aramaMetni ? 'Sonuç yok.' : 'Müşteri yok.'}</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="table-header px-4 py-3">Müşteri</th>
                  <th className="table-header px-4 py-3">Telefon</th>
                  <th className="table-header px-4 py-3 text-center">Sipariş</th>
                  <th className="table-header px-4 py-3 text-right">Harcama</th>
                  <th className="table-header px-4 py-3 text-right">İşlem</th>
                </tr></thead>
                <tbody>
                  {filtrelenmis.map(m => (
                    <tr key={m.id} onClick={() => setSeciliMusteri(seciliMusteri?.id === m.id ? null : m)}
                      className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${seciliMusteri?.id === m.id ? 'bg-primary-50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-600">
                            {m.ad?.charAt(0)}{m.soyad?.charAt(0) || ''}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{m.ad} {m.soyad || ''}</p>
                            {m.adres && <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{m.adres}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{m.telefon || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><span className="badge bg-gray-100 text-gray-600">{m.siparis_sayisi || 0}</span></td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-700">₺{(m.toplam_harcama || 0).toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={e => { e.stopPropagation(); musteriSil(m.id, `${m.ad} ${m.soyad || ''}`); }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail */}
        {seciliMusteri && (
          <div className="flex-1 card p-5 self-start sticky top-4 animate-slide-up">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-sm font-bold text-primary-700">
                  {seciliMusteri.ad?.charAt(0)}{seciliMusteri.soyad?.charAt(0) || ''}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">{seciliMusteri.ad} {seciliMusteri.soyad || ''}</h2>
                  <span className="text-xs text-gray-400">#{seciliMusteri.id}</span>
                </div>
              </div>
              <button onClick={() => { setSeciliMusteri(null); setDuzenleModu(false); }}
                className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {duzenleModu ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Ad *</label><input type="text" className="input-field" value={duzenleData.ad} onChange={e => setDuzenleData({ ...duzenleData, ad: e.target.value })} /></div>
                  <div><label className="label">Soyad</label><input type="text" className="input-field" value={duzenleData.soyad} onChange={e => setDuzenleData({ ...duzenleData, soyad: e.target.value })} /></div>
                </div>
                <div><label className="label">Telefon</label><input type="tel" className="input-field" value={duzenleData.telefon} onChange={e => setDuzenleData({ ...duzenleData, telefon: e.target.value })} /></div>
                <div><label className="label">Adres</label><textarea rows="2" className="input-field !resize-none" value={duzenleData.adres} onChange={e => setDuzenleData({ ...duzenleData, adres: e.target.value })} /></div>
                <div className="flex gap-2 pt-1">
                  <button onClick={duzenleKaydet} className="btn-primary flex-1">Kaydet</button>
                  <button onClick={() => setDuzenleModu(false)} className="btn-secondary flex-1">İptal</button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  {[
                    { l: 'Telefon', v: seciliMusteri.telefon || '—' },
                    { l: 'Adres', v: seciliMusteri.adres || '—' },
                    { l: 'Sipariş', v: `${seciliMusteri.siparis_sayisi || 0} adet` },
                    { l: 'Toplam Harcama', v: `₺${(seciliMusteri.toplam_harcama || 0).toFixed(2)}` },
                    { l: 'Son Sipariş', v: seciliMusteri.son_siparis_tarihi ? new Date(seciliMusteri.son_siparis_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                    { l: 'Kayıt', v: seciliMusteri.created_at ? new Date(seciliMusteri.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500">{r.l}</span>
                      <span className="text-gray-800 font-medium">{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={duzenleBaslat} className="btn-secondary flex-1 !text-xs">Düzenle</button>
                  <button onClick={() => musteriSil(seciliMusteri.id, `${seciliMusteri.ad}`)} className="btn-danger flex-1 !text-xs">Sil</button>
                  {seciliMusteri.telefon && <a href={`tel:${seciliMusteri.telefon}`} className="btn-secondary flex-1 !text-xs text-center">Ara</a>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Musteriler;