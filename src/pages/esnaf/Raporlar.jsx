// src/pages/esnaf/Raporlar.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { AuthServisi } from '../../api/authService';

const API = 'http://localhost:3001/api/raporlar';
const authFetch = (url) => fetch(url, { headers: AuthServisi.getAuthHeader() }).then(r => r.json());
const RENKLER = ['#4263eb', '#0ca678', '#f59f00', '#e8590c', '#7048e8', '#d6336c'];

const Raporlar = () => {
  const [donem, setDonem] = useState('haftalik');
  const [ozet, setOzet] = useState(null);
  const [gunlukCiro, setGunlukCiro] = useState([]);
  const [enCokSatanlar, setEnCokSatanlar] = useState([]);
  const [kategoriDagilimi, setKategoriDagilimi] = useState([]);
  const [kuryePerformans, setKuryePerformans] = useState([]);
  const [musteriAnalitik, setMusteriAnalitik] = useState(null);
  const [karZarar, setKarZarar] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState('genel');
  const [gunSonu, setGunSonu] = useState(null);
  const [gunSonuTarih, setGunSonuTarih] = useState(new Date().toISOString().split('T')[0]);

  const gun = donem === 'gunluk' ? 1 : donem === 'haftalik' ? 7 : 30;

  useEffect(() => {
    setYukleniyor(true);
    Promise.all([
      authFetch(`${API}/ozet?donem=${donem}`), authFetch(`${API}/gunluk-ciro?gun=${gun}`),
      authFetch(`${API}/en-cok-satanlar?gun=${gun}`), authFetch(`${API}/kategori-dagilimi?gun=${gun}`),
      authFetch(`${API}/kurye-performans`), authFetch(`${API}/musteri-analitik`),
      authFetch(`${API}/kar-zarar?gun=${gun}`)
    ]).then(([o, g, e, k, kp, ma, kz]) => {
      setOzet(o); setGunlukCiro(g); setEnCokSatanlar(e); setKategoriDagilimi(k);
      setKuryePerformans(kp); setMusteriAnalitik(ma); setKarZarar(kz); setYukleniyor(false);
    }).catch(() => setYukleniyor(false));
  }, [donem]);

  useEffect(() => { if (sekme === 'gunsonu') authFetch(`${API}/gun-sonu?tarih=${gunSonuTarih}`).then(setGunSonu); }, [sekme, gunSonuTarih]);

  const csvIndir = (tip) => window.open(`${API}/csv-export?tip=${tip}&token=${AuthServisi.getToken()}`, '_blank');

  if (yukleniyor) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="page-title">Raporlar</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[{ k: 'gunluk', l: 'Bugün' }, { k: 'haftalik', l: '7 Gün' }, { k: 'aylik', l: '30 Gün' }].map(d => (
            <button key={d.k} onClick={() => setDonem(d.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${donem === d.k ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{d.l}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {ozet && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: 'Toplam Ciro', v: `₺${ozet.toplamCiro.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, c: 'border-l-emerald-500' },
            { l: 'Sipariş', v: `${ozet.toplamSiparis}`, c: 'border-l-blue-500' },
            { l: 'Ort. Sepet', v: `₺${ozet.ortalamaSeped.toFixed(2)}`, c: 'border-l-amber-500' },
            { l: 'Başarı', v: `%${ozet.basariOrani}`, c: 'border-l-violet-500' },
          ].map((k, i) => (
            <div key={i} className={`card border-l-[3px] ${k.c} p-4`}>
              <p className="text-xs text-gray-500">{k.l}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{k.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
        {[{ k: 'genel', l: 'Genel' }, { k: 'urunler', l: 'Ürünler' }, { k: 'kuryeler', l: 'Kuryeler' }, { k: 'musteriler', l: 'Müşteriler' }, { k: 'kar', l: 'Kâr/Zarar' }, { k: 'gunsonu', l: 'Gün Sonu' }].map(s => (
          <button key={s.k} onClick={() => setSekme(s.k)}
            className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${sekme === s.k ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{s.l}</button>
        ))}
      </div>

      {/* GENEL */}
      {sekme === 'genel' && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Günlük Ciro Trendi</h3>
            <button onClick={() => csvIndir('siparisler')} className="btn-secondary !py-1 !px-2 !text-[11px]">CSV İndir</button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gunlukCiro}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="gun" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₺${v}`} />
                <Tooltip formatter={v => `₺${v.toLocaleString('tr-TR')}`} />
                <Line type="monotone" dataKey="ciro" stroke="#4263eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ÜRÜNLER */}
      {sekme === 'urunler' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">En Çok Satanlar</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enCokSatanlar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="ad" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="toplam_adet" name="Satış" fill="#4263eb" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Kategori Dağılımı</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kategoriDagilimi} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="toplam_adet" nameKey="kategori"
                    label={({ kategori, percent }) => `${kategori} %${(percent * 100).toFixed(0)}`}>
                    {kategoriDagilimi.map((_, i) => <Cell key={i} fill={RENKLER[i % RENKLER.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* KURYELER */}
      {sekme === 'kuryeler' && (
        <div className="card overflow-hidden">
          {kuryePerformans.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Kayıtlı kurye yok.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-header px-4 py-3">Kurye</th>
                <th className="table-header px-4 py-3 text-center">Toplam</th>
                <th className="table-header px-4 py-3 text-center">Başarılı</th>
                <th className="table-header px-4 py-3 text-center">Ort. Süre</th>
                <th className="table-header px-4 py-3 text-center">Başarı</th>
              </tr></thead>
              <tbody>
                {kuryePerformans.map(k => (
                  <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{k.ad} {k.soyad}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{k.toplamTeslimat}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{k.basarili}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{k.ortalamaSure || '-'} dk</td>
                    <td className="px-4 py-3 text-center"><span className="badge bg-gray-100 text-gray-700">%{k.basariOrani}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MÜŞTERİLER */}
      {sekme === 'musteriler' && musteriAnalitik && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Toplam', v: musteriAnalitik.toplamMusteri, c: 'border-l-blue-500' },
              { l: 'Tekrar', v: musteriAnalitik.tekrarMusteri, c: 'border-l-emerald-500' },
              { l: 'Tekrar %', v: `%${musteriAnalitik.tekrarOrani}`, c: 'border-l-violet-500' },
            ].map((k, i) => <div key={i} className={`card border-l-[3px] ${k.c} p-4`}><p className="text-xs text-gray-500">{k.l}</p><p className="text-xl font-bold text-gray-900 mt-1">{k.v}</p></div>)}
          </div>
          <div className="card overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">En Çok Sipariş Verenler</h3>
              <button onClick={() => csvIndir('musteriler')} className="btn-secondary !py-1 !px-2 !text-[11px]">CSV</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-header px-4 py-3">#</th><th className="table-header px-4 py-3">Müşteri</th>
                <th className="table-header px-4 py-3 text-center">Sipariş</th><th className="table-header px-4 py-3 text-right">Harcama</th>
              </tr></thead>
              <tbody>{musteriAnalitik.enCokSiparisVerenler.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50"><td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium">{m.ad} {m.soyad}</td>
                  <td className="px-4 py-2.5 text-center text-primary-600 font-semibold">{m.siparis_sayisi}</td>
                  <td className="px-4 py-2.5 text-right text-gray-800">₺{(m.toplam_harcama || 0).toFixed(2)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* KÂR/ZARAR */}
      {sekme === 'kar' && karZarar && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[{ l: 'Satış', v: `₺${karZarar.toplamSatis.toFixed(2)}`, c: 'border-l-blue-500' }, { l: 'Maliyet', v: `₺${karZarar.toplamMaliyet.toFixed(2)}`, c: 'border-l-red-400' }, { l: 'Net Kâr', v: `₺${karZarar.toplamKar.toFixed(2)}`, c: 'border-l-emerald-500' }, { l: 'Marj', v: `%${karZarar.karMarji}`, c: 'border-l-violet-500' }].map((k, i) =>
              <div key={i} className={`card border-l-[3px] ${k.c} p-4`}><p className="text-xs text-gray-500">{k.l}</p><p className="text-xl font-bold text-gray-900 mt-1">{k.v}</p></div>
            )}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-header px-4 py-3">Ürün</th><th className="table-header px-4 py-3 text-center">Adet</th>
                <th className="table-header px-4 py-3 text-right">Satış</th><th className="table-header px-4 py-3 text-right">Maliyet</th>
                <th className="table-header px-4 py-3 text-right">Kâr</th><th className="table-header px-4 py-3 text-center">Marj</th>
              </tr></thead>
              <tbody>{karZarar.urunler.map((u, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-800 font-medium">{u.ad}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{u.toplam_adet}</td>
                  <td className="px-4 py-2.5 text-right text-gray-800">₺{u.toplam_satis.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">₺{u.toplam_maliyet.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">₺{u.kar.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center"><span className="badge bg-gray-100 text-gray-700">%{u.karMarji}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* GÜN SONU */}
      {sekme === 'gunsonu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <input type="date" value={gunSonuTarih} onChange={e => setGunSonuTarih(e.target.value)} className="input-field !w-auto !text-xs" />
            <button onClick={() => {
              const g = gunSonu?.genel;
              if (!g) return;
              const pw = window.open('', '_blank', 'width=400,height=600');
              pw.document.write(`<html><head><title>Gün Sonu - ${gunSonuTarih}</title><style>body{font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;font-size:13px}h1{text-align:center;font-size:16px;border-bottom:2px dashed #999;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{padding:5px 8px;text-align:left;border-bottom:1px solid #eee}th{background:#f5f5f5;font-size:12px}.total{font-size:18px;font-weight:bold;text-align:right;padding:10px 0;border-top:2px dashed #999}</style></head><body><h1>GÜN SONU RAPORU<br/><small>${new Date(gunSonuTarih).toLocaleDateString('tr-TR')}</small></h1><table><tr><td>Toplam Sipariş</td><td><b>${g.toplam_siparis}</b></td></tr><tr><td>Teslim Edilen</td><td><b>${g.teslim}</b></td></tr><tr><td>İptal</td><td><b>${g.iptal}</b></td></tr><tr><td>Ort. Sepet</td><td><b>₺${g.ort_sepet?.toFixed(2)}</b></td></tr><tr><td>İndirimler</td><td><b>-₺${g.toplam_indirim?.toFixed(2)}</b></td></tr></table><h3>Ödeme Dağılımı</h3><table>${(gunSonu?.odemeDagilimi || []).map(o => `<tr><td>${o.odeme_yontemi || 'Nakit'}</td><td>${o.adet} adet</td><td><b>₺${o.tutar?.toFixed(2)}</b></td></tr>`).join('')}</table><div class='total'>NET CİRO: ₺${gunSonu?.netCiro?.toFixed(2)}</div></body></html>`);
              pw.document.close(); pw.focus(); setTimeout(() => pw.print(), 500);
            }} className="btn-primary !py-1.5 !text-[11px]">🖨️ Yazdır</button>
          </div>
          {gunSonu?.genel ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { l: 'Toplam Ciro', v: `₺${gunSonu.genel.toplam_ciro.toFixed(2)}`, c: 'border-l-blue-500' },
                  { l: 'Teslim', v: `${gunSonu.genel.teslim}`, c: 'border-l-emerald-500' },
                  { l: 'İptal', v: `${gunSonu.genel.iptal}`, c: 'border-l-red-400' },
                  { l: 'Net Ciro', v: `₺${gunSonu.netCiro.toFixed(2)}`, c: 'border-l-violet-500' },
                ].map((k, i) => (
                  <div key={i} className={`card border-l-[3px] ${k.c} p-4`}><p className="text-xs text-gray-500">{k.l}</p><p className="text-xl font-bold text-gray-900 mt-1">{k.v}</p></div>
                ))}
              </div>

              {/* Ödeme Dağılımı */}
              {gunSonu.odemeDagilimi?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50"><p className="section-title !mb-0">Ödeme Yöntemi Dağılımı</p></div>
                  <div className="divide-y divide-gray-50">
                    {gunSonu.odemeDagilimi.map((o, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{o.odeme_yontemi || 'Nakit'}</span>
                          <span className="text-[11px] text-gray-400">{o.adet} adet</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">₺{o.tutar.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kurye Performans */}
              {gunSonu.kuryePerformans?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50"><p className="section-title !mb-0">Kurye Performans</p></div>
                  <div className="divide-y divide-gray-50">
                    {gunSonu.kuryePerformans.map((k, i) => (
                      <div key={i} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{k.kurye_adi}</p>
                          <p className="text-[11px] text-gray-400">{k.teslimat} teslimat</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">₺{k.toplam.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* İndirim */}
              {gunSonu.genel.toplam_indirim > 0 && (
                <div className="card p-4 bg-amber-50 border-amber-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-800">Toplam İndirim</span>
                    <span className="text-lg font-bold text-amber-700">-₺{gunSonu.genel.toplam_indirim.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-16 text-center"><p className="text-gray-400 text-sm">Bu tarihte veri yok</p></div>
          )}
        </div>
      )}
    </div>
  );
};

export default Raporlar;