// src/pages/esnaf/MenuYonetimi.jsx
import { useState, useEffect } from 'react';
import { MenuServisi } from '../../api/menuService';

const MenuYonetimi = () => {
  const [menu, setMenu] = useState([]);
  const [kategoriler, setKategoriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gorunum, setGorunum] = useState(() => localStorage.getItem('menuGorunum') || 'list');
  const [seciliKategori, setSeciliKategori] = useState('Tümü');
  const [aramaMetni, setAramaMetni] = useState('');
  const [siralama, setSiralama] = useState('ad-asc');
  const [karTakibi, setKarTakibi] = useState(() => localStorage.getItem('karTakibi') === 'true');
  const [formAcik, setFormAcik] = useState(false);
  const [yeniUrun, setYeniUrun] = useState({ ad: '', fiyat: '', alis_fiyati: '', kategori: '', stok_miktari: '' });
  const [kategoriPaneli, setKategoriPaneli] = useState(false);
  const [yeniKategoriAd, setYeniKategoriAd] = useState('');
  const [duzenleId, setDuzenleId] = useState(null);
  const [duzenleData, setDuzenleData] = useState({ ad: '', fiyat: '', alis_fiyati: '', kategori: '', stok_miktari: '' });

  const verileriYukle = async () => {
    setYukleniyor(true);
    const [m, k] = await Promise.all([MenuServisi.getMenu(), MenuServisi.getKategoriler()]);
    setMenu(m); setKategoriler(k); setYukleniyor(false);
  };

  useEffect(() => { verileriYukle(); }, []);
  useEffect(() => { localStorage.setItem('menuGorunum', gorunum); }, [gorunum]);
  useEffect(() => { localStorage.setItem('karTakibi', karTakibi); }, [karTakibi]);

  const getKar = (u) => u.alis_fiyati && u.fiyat ? u.fiyat - u.alis_fiyati : null;
  const getKarOrani = (u) => u.alis_fiyati && u.fiyat ? ((u.fiyat - u.alis_fiyati) / u.alis_fiyati) * 100 : 0;

  const toplamKar = menu.reduce((t, u) => t + (getKar(u) || 0), 0);
  const toplamAlis = menu.reduce((t, u) => t + (u.alis_fiyati || 0), 0);
  const toplamSatis = menu.reduce((t, u) => t + (u.fiyat || 0), 0);

  const filtrelenmis = menu
    .filter(u => {
      if (seciliKategori !== 'Tümü' && u.kategori !== seciliKategori) return false;
      if (aramaMetni) return u.ad.toLowerCase().includes(aramaMetni.toLowerCase());
      return true;
    })
    .sort((a, b) => {
      switch (siralama) {
        case 'ad-asc': return a.ad.localeCompare(b.ad, 'tr');
        case 'ad-desc': return b.ad.localeCompare(a.ad, 'tr');
        case 'fiyat-asc': return a.fiyat - b.fiyat;
        case 'fiyat-desc': return b.fiyat - a.fiyat;
        case 'kar-desc': return getKarOrani(b) - getKarOrani(a);
        default: return 0;
      }
    });

  const urunEkle = async (e) => {
    e.preventDefault();
    if (!yeniUrun.ad.trim() || !yeniUrun.fiyat) return alert('Ad ve fiyat zorunlu!');
    if (!yeniUrun.kategori) return alert('Kategori seçin!');
    const payload = { ad: yeniUrun.ad.trim(), fiyat: parseFloat(yeniUrun.fiyat), kategori: yeniUrun.kategori };
    if (yeniUrun.stok_miktari !== '') payload.stok_miktari = parseInt(yeniUrun.stok_miktari);
    if (karTakibi && yeniUrun.alis_fiyati) payload.alis_fiyati = parseFloat(yeniUrun.alis_fiyati);
    if (await MenuServisi.urunEkle(payload)) { setYeniUrun({ ad: '', fiyat: '', alis_fiyati: '', kategori: yeniUrun.kategori, stok_miktari: '' }); setFormAcik(false); verileriYukle(); }
  };

  const urunSil = async (id, ad) => { if (confirm(`"${ad}" silinsin mi?`)) { await MenuServisi.urunSil(id); verileriYukle(); } };
  const duzenleBaslat = (u) => { setDuzenleId(u.id); setDuzenleData({ ad: u.ad, fiyat: u.fiyat, alis_fiyati: u.alis_fiyati || '', kategori: u.kategori, stok_miktari: u.stok_miktari === -1 ? '' : u.stok_miktari }); };
  const duzenleKaydet = async () => {
    if (!duzenleData.ad.trim() || !duzenleData.fiyat) return;
    if (await MenuServisi.urunGuncelle(duzenleId, { ad: duzenleData.ad.trim(), fiyat: parseFloat(duzenleData.fiyat), kategori: duzenleData.kategori, alis_fiyati: duzenleData.alis_fiyati ? parseFloat(duzenleData.alis_fiyati) : null, stok_miktari: duzenleData.stok_miktari !== '' ? parseInt(duzenleData.stok_miktari) : -1 })) { setDuzenleId(null); verileriYukle(); }
  };

  const kategoriEkle = () => {
    const k = yeniKategoriAd.trim();
    if (!k || kategoriler.includes(k)) return;
    setKategoriler(p => [...p, k].sort()); setYeniKategoriAd('');
  };

  const kategoriSil = async (kat) => {
    const c = menu.filter(u => u.kategori === kat).length;
    if (c > 0 && !confirm(`"${kat}" kategorisinde ${c} ürün var. "Genel"e taşınsın mı?`)) return;
    if (c === 0 && !confirm(`"${kat}" silinsin mi?`)) return;
    for (const u of menu.filter(u => u.kategori === kat)) await MenuServisi.urunGuncelle(u.id, { ...u, kategori: 'Genel' });
    setKategoriler(p => p.filter(k => k !== kat));
    if (seciliKategori === kat) setSeciliKategori('Tümü');
    verileriYukle();
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h1 className="page-title">Menü Yönetimi</h1>
          <p className="page-subtitle">{menu.length} ürün · {kategoriler.length} kategori{karTakibi && toplamKar > 0 && ` · Kar: ₺${toplamKar.toFixed(0)}`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {['list', 'grid'].map(g => (
              <button key={g} onClick={() => setGorunum(g)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${gorunum === g ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'}`}>
                {g === 'grid' ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                )}
              </button>
            ))}
          </div>
          <button onClick={() => setKarTakibi(!karTakibi)}
            className={`btn-secondary !py-1.5 !text-[11px] ${karTakibi ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200' : ''}`}>
            {karTakibi ? 'Kar: Açık' : 'Kar: Kapalı'}
          </button>
          <button onClick={() => setKategoriPaneli(!kategoriPaneli)} className="btn-secondary !py-1.5 !text-[11px]">Kategoriler</button>
          <button onClick={() => setFormAcik(!formAcik)} className="btn-primary !py-1.5 !text-[11px]">{formAcik ? 'Kapat' : '+ Ürün'}</button>
        </div>
      </div>

      {/* Category Panel */}
      {kategoriPaneli && (
        <div className="card p-4 animate-slide-up">
          <div className="flex justify-between items-center mb-3">
            <p className="section-title">Kategoriler ({kategoriler.length})</p>
            <button onClick={() => setKategoriPaneli(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {kategoriler.map(k => (
              <div key={k} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 group">
                <span className="text-sm text-gray-700">{k}</span>
                <span className="text-[11px] text-gray-400">{menu.filter(u => u.kategori === k).length}</span>
                <button onClick={() => kategoriSil(k)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Kategori adı" className="input-field !flex-1" value={yeniKategoriAd} onChange={e => setYeniKategoriAd(e.target.value)} onKeyDown={e => e.key === 'Enter' && kategoriEkle()} />
            <button onClick={kategoriEkle} className="btn-primary !py-2">Ekle</button>
          </div>
        </div>
      )}

      {/* Add Form */}
      {formAcik && (
        <div className="card p-4 animate-slide-up">
          <p className="section-title mb-3">Yeni Ürün</p>
          <form onSubmit={urunEkle} className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <input type="text" placeholder="Ürün Adı *" className="input-field" value={yeniUrun.ad} onChange={e => setYeniUrun({ ...yeniUrun, ad: e.target.value })} />
            {karTakibi && <input type="number" step="0.01" placeholder="Alış ₺" className="input-field" value={yeniUrun.alis_fiyati} onChange={e => setYeniUrun({ ...yeniUrun, alis_fiyati: e.target.value })} />}
            <input type="number" step="0.01" placeholder={karTakibi ? 'Satış ₺ *' : 'Fiyat ₺ *'} className="input-field" value={yeniUrun.fiyat} onChange={e => setYeniUrun({ ...yeniUrun, fiyat: e.target.value })} />
            <select className="input-field" value={yeniUrun.kategori} onChange={e => setYeniUrun({ ...yeniUrun, kategori: e.target.value })}>
              <option value="">Kategori seç</option>
              {kategoriler.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <input type="number" placeholder="Stok (Boş=Sınırsız)" className="input-field" value={yeniUrun.stok_miktari} onChange={e => setYeniUrun({ ...yeniUrun, stok_miktari: e.target.value })} />
          </form>
          {karTakibi && yeniUrun.alis_fiyati && yeniUrun.fiyat && (
            <div className="text-xs text-emerald-600 mb-2">Kar: ₺{(parseFloat(yeniUrun.fiyat) - parseFloat(yeniUrun.alis_fiyati)).toFixed(2)} · %{(((parseFloat(yeniUrun.fiyat) - parseFloat(yeniUrun.alis_fiyati)) / parseFloat(yeniUrun.alis_fiyati)) * 100).toFixed(1)}</div>
          )}
          <button type="submit" onClick={urunEkle} className="btn-primary">Ekle</button>
        </div>
      )}

      {/* Profit Stats */}
      {karTakibi && menu.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: 'Alış Toplam', v: `₺${toplamAlis.toFixed(0)}`, c: 'border-l-amber-500' },
            { l: 'Satış Toplam', v: `₺${toplamSatis.toFixed(0)}`, c: 'border-l-blue-500' },
            { l: 'Toplam Kar', v: `₺${toplamKar.toFixed(0)}`, c: 'border-l-emerald-500' },
            { l: 'Kar Oranı', v: `%${toplamAlis > 0 ? ((toplamKar / toplamAlis) * 100).toFixed(1) : '0'}`, c: 'border-l-violet-500' },
          ].map((k, i) => <div key={i} className={`card border-l-[3px] ${k.c} p-3`}><p className="text-xs text-gray-500">{k.l}</p><p className="text-lg font-bold text-gray-900 mt-0.5">{k.v}</p></div>)}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <input type="text" placeholder="Ürün ara..." className="input-field !flex-1" value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
        <select className="input-field !w-auto" value={siralama} onChange={e => setSiralama(e.target.value)}>
          <option value="ad-asc">İsim A→Z</option><option value="ad-desc">İsim Z→A</option>
          <option value="fiyat-asc">Fiyat ↑</option><option value="fiyat-desc">Fiyat ↓</option>
          {karTakibi && <option value="kar-desc">Kar ↓</option>}
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setSeciliKategori('Tümü')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${seciliKategori === 'Tümü' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          Tümü ({menu.length})
        </button>
        {kategoriler.map(k => (
          <button key={k} onClick={() => setSeciliKategori(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${seciliKategori === k ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {k} ({menu.filter(u => u.kategori === k).length})
          </button>
        ))}
      </div>

      {/* Content */}
      {yukleniyor ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">{aramaMetni ? 'Sonuç yok.' : 'Menü boş.'}</div>
      ) : gorunum === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtrelenmis.map(u => {
            if (duzenleId === u.id) return (
              <div key={u.id} className="card border-primary-300 p-4 space-y-2">
                <input type="text" className="input-field" value={duzenleData.ad} onChange={e => setDuzenleData({ ...duzenleData, ad: e.target.value })} />
                {karTakibi && <input type="number" step="0.01" placeholder="Alış ₺" className="input-field" value={duzenleData.alis_fiyati} onChange={e => setDuzenleData({ ...duzenleData, alis_fiyati: e.target.value })} />}
                <input type="number" step="0.01" className="input-field" value={duzenleData.fiyat} onChange={e => setDuzenleData({ ...duzenleData, fiyat: e.target.value })} />
                <select className="input-field" value={duzenleData.kategori} onChange={e => setDuzenleData({ ...duzenleData, kategori: e.target.value })}>
                  {kategoriler.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <input type="number" placeholder="Stok (Boş=Sınırsız)" className="input-field" value={duzenleData.stok_miktari} onChange={e => setDuzenleData({ ...duzenleData, stok_miktari: e.target.value })} />
                <div className="flex gap-2"><button onClick={duzenleKaydet} className="btn-primary flex-1 !py-1.5 !text-xs">Kaydet</button><button onClick={() => setDuzenleId(null)} className="btn-secondary flex-1 !py-1.5 !text-xs">İptal</button></div>
              </div>
            );
            const kar = getKar(u);
            return (
              <div key={u.id} className="card p-4 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-2">
                  <span className="badge bg-gray-100 text-gray-600 !text-[10px]">{u.kategori}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => duzenleBaslat(u)} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onClick={() => urunSil(u.id, u.ad)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <h3 className="font-medium text-gray-800 text-sm mb-2">{u.ad} {u.stok_miktari !== -1 && <span className={`text-[10px] px-1.5 py-0.5 rounded ml-1 ${u.stok_miktari === 0 ? 'bg-red-100 text-red-600 font-semibold' : 'bg-blue-100 text-blue-600'}`}>{u.stok_miktari === 0 ? 'Tükendi' : `Stok: ${u.stok_miktari}`}</span>}</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-900">₺{u.fiyat}</span>
                    {karTakibi && u.alis_fiyati && <span className="text-[11px] text-gray-400 ml-1.5">(₺{u.alis_fiyati})</span>}
                  </div>
                  {karTakibi && kar !== null && (
                    <span className={`text-xs font-semibold ${kar >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₺{kar.toFixed(0)} · %{getKarOrani(u).toFixed(0)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="table-header px-4 py-3">Ürün</th><th className="table-header px-4 py-3">Kategori</th>
              <th className="table-header px-4 py-3 text-center">Stok</th>
              {karTakibi && <th className="table-header px-4 py-3 text-right">Alış</th>}
              <th className="table-header px-4 py-3 text-right">{karTakibi ? 'Satış' : 'Fiyat'}</th>
              {karTakibi && <th className="table-header px-4 py-3 text-right">Kar</th>}
              <th className="table-header px-4 py-3 text-right w-20">İşlem</th>
            </tr></thead>
            <tbody>
              {filtrelenmis.map(u => {
                const kar = getKar(u);
                if (duzenleId === u.id) return (
                  <tr key={u.id} className="bg-primary-50 border-b">
                    <td className="px-3 py-2"><input type="text" className="input-field" value={duzenleData.ad} onChange={e => setDuzenleData({ ...duzenleData, ad: e.target.value })} /></td>
                    <td className="px-3 py-2"><select className="input-field" value={duzenleData.kategori} onChange={e => setDuzenleData({ ...duzenleData, kategori: e.target.value })}>{kategoriler.map(k => <option key={k} value={k}>{k}</option>)}</select></td>
                    <td className="px-3 py-2"><input type="number" placeholder="Sınırsız" className="input-field !text-center" value={duzenleData.stok_miktari} onChange={e => setDuzenleData({ ...duzenleData, stok_miktari: e.target.value })} /></td>
                    {karTakibi && <td className="px-3 py-2"><input type="number" step="0.01" className="input-field !text-right" value={duzenleData.alis_fiyati} onChange={e => setDuzenleData({ ...duzenleData, alis_fiyati: e.target.value })} /></td>}
                    <td className="px-3 py-2"><input type="number" step="0.01" className="input-field !text-right" value={duzenleData.fiyat} onChange={e => setDuzenleData({ ...duzenleData, fiyat: e.target.value })} /></td>
                    {karTakibi && <td />}
                    <td className="px-3 py-2 text-right"><div className="flex gap-1 justify-end"><button onClick={duzenleKaydet} className="btn-primary !py-1 !px-2 !text-[11px]">✓</button><button onClick={() => setDuzenleId(null)} className="btn-secondary !py-1 !px-2 !text-[11px]">✕</button></div></td>
                  </tr>
                );
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{u.ad}</td>
                    <td className="px-4 py-2.5"><span className="badge bg-gray-100 text-gray-600">{u.kategori}</span></td>
                    <td className="px-4 py-2.5 text-center">{u.stok_miktari === -1 ? <span className="text-gray-400 text-xs">Sınırsız</span> : u.stok_miktari === 0 ? <span className="text-red-500 font-semibold text-xs">Tükendi</span> : <span className="text-blue-600 font-medium text-xs">{u.stok_miktari}</span>}</td>
                    {karTakibi && <td className="px-4 py-2.5 text-right text-gray-500">{u.alis_fiyati ? `₺${u.alis_fiyati}` : '—'}</td>}
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">₺{u.fiyat}</td>
                    {karTakibi && <td className={`px-4 py-2.5 text-right font-semibold ${kar !== null && kar >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{kar !== null ? `₺${kar.toFixed(0)}` : '—'}</td>}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => duzenleBaslat(u)} className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button onClick={() => urunSil(u.id, u.ad)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MenuYonetimi;