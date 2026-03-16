// src/pages/esnaf/GecmisSiparisler.jsx
import { useEffect, useState } from 'react';
import { SiparisServisi } from '../../api/siparisService';
import SiparisDetayModal from '../../features/esnaf/SiparisDetayModal';

const SAYFA_BOYUTU = 20;

const GecmisSiparisler = () => {
    const [siparisler, setSiparisler] = useState([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [seciliSiparis, setSeciliSiparis] = useState(null);
    const [aramaMetni, setAramaMetni] = useState('');
    const [durumFiltre, setDurumFiltre] = useState('hepsi');
    const [tarihFiltre, setTarihFiltre] = useState('hepsi');
    const [sayfa, setSayfa] = useState(1);

    useEffect(() => { veriGetir(); }, []);

    const veriGetir = async () => {
        setYukleniyor(true);
        const tum = await SiparisServisi.getSiparisler(true);
        setSiparisler(tum.filter(s => s.durum === 'Teslim Edildi' || s.durum === 'İptal'));
        setYukleniyor(false);
    };

    // Tarih filtresi
    const tarihFiltreUygula = (s) => {
        if (tarihFiltre === 'hepsi') return true;
        if (!s.tarih) return false;
        const siparisTarih = new Date(s.tarih);
        const simdi = new Date();
        if (tarihFiltre === 'bugun') {
            return siparisTarih.toDateString() === simdi.toDateString();
        } else if (tarihFiltre === 'hafta') {
            const haftaOnce = new Date(simdi); haftaOnce.setDate(simdi.getDate() - 7);
            return siparisTarih >= haftaOnce;
        } else if (tarihFiltre === 'ay') {
            const ayOnce = new Date(simdi); ayOnce.setDate(simdi.getDate() - 30);
            return siparisTarih >= ayOnce;
        }
        return true;
    };

    const filtrelenmis = siparisler.filter(s => {
        if (durumFiltre !== 'hepsi' && s.durum !== durumFiltre) return false;
        if (!tarihFiltreUygula(s)) return false;
        if (!aramaMetni) return true;
        const q = aramaMetni.toLowerCase();
        return (s.musteriAdi || '').toLowerCase().includes(q) || (s.telefon || '').includes(q) || String(s.id).includes(q);
    });

    // KPI hesapla
    const toplamCiro = filtrelenmis.filter(s => s.durum !== 'İptal').reduce((t, s) => t + (s.tutar || 0), 0);
    const teslimSayisi = filtrelenmis.filter(s => s.durum === 'Teslim Edildi').length;
    const iptalSayisi = filtrelenmis.filter(s => s.durum === 'İptal').length;
    const ortSepet = teslimSayisi > 0 ? toplamCiro / teslimSayisi : 0;

    // Pagination
    const toplamSayfa = Math.max(1, Math.ceil(filtrelenmis.length / SAYFA_BOYUTU));
    const sayfadakiler = filtrelenmis.slice((sayfa - 1) * SAYFA_BOYUTU, sayfa * SAYFA_BOYUTU);

    // Sayfa sıfırla filtre değişince
    useEffect(() => { setSayfa(1); }, [aramaMetni, durumFiltre, tarihFiltre]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="page-title">Geçmiş Siparişler</h1>
                    <p className="page-subtitle">{filtrelenmis.length} kayıt</p>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card border-l-[3px] border-l-emerald-500 p-3">
                    <p className="text-[11px] text-gray-500">Toplam Ciro</p>
                    <p className="text-lg font-bold text-gray-900">₺{toplamCiro.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}</p>
                </div>
                <div className="card border-l-[3px] border-l-blue-500 p-3">
                    <p className="text-[11px] text-gray-500">Teslim Edilen</p>
                    <p className="text-lg font-bold text-gray-900">{teslimSayisi}</p>
                </div>
                <div className="card border-l-[3px] border-l-amber-500 p-3">
                    <p className="text-[11px] text-gray-500">Ort. Sepet</p>
                    <p className="text-lg font-bold text-gray-900">₺{ortSepet.toFixed(0)}</p>
                </div>
                <div className="card border-l-[3px] border-l-red-400 p-3">
                    <p className="text-[11px] text-gray-500">İptal</p>
                    <p className="text-lg font-bold text-gray-900">{iptalSayisi}</p>
                </div>
            </div>

            {/* Filtreler */}
            <div className="flex flex-wrap gap-2 items-center">
                <input type="text" placeholder="Ara (müşteri, telefon, ID)..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} className="input-field !max-w-[220px]" />
                <select value={durumFiltre} onChange={e => setDurumFiltre(e.target.value)} className="input-field !w-auto">
                    <option value="hepsi">Tüm Durumlar</option>
                    <option value="Teslim Edildi">Teslim Edildi</option>
                    <option value="İptal">İptal</option>
                </select>
                <select value={tarihFiltre} onChange={e => setTarihFiltre(e.target.value)} className="input-field !w-auto">
                    <option value="hepsi">Tüm Zamanlar</option>
                    <option value="bugun">Bugün</option>
                    <option value="hafta">Son 7 Gün</option>
                    <option value="ay">Son 30 Gün</option>
                </select>
            </div>

            {/* Tablo */}
            {yukleniyor ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : filtrelenmis.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">{aramaMetni ? 'Sonuç yok.' : 'Kayıt bulunamadı.'}</div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100 bg-gray-50">
                            <th className="table-header px-4 py-3">ID</th><th className="table-header px-4 py-3">Müşteri</th>
                            <th className="table-header px-4 py-3">İçerik</th><th className="table-header px-4 py-3">Tutar</th>
                            <th className="table-header px-4 py-3">Durum</th><th className="table-header px-4 py-3">Tarih</th>
                            <th className="table-header px-4 py-3 text-right">İşlem</th>
                        </tr></thead>
                        <tbody>
                            {sayfadakiler.map(s => (
                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">#{s.id}</td>
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-gray-800">{s.musteriAdi || '—'}</p>
                                        {s.telefon && <p className="text-[11px] text-gray-400">{s.telefon}</p>}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500 max-w-[180px]"><div className="truncate">{(s.icerik || []).slice(0, 2).join(', ')}{(s.icerik || []).length > 2 && ` +${s.icerik.length - 2}`}</div></td>
                                    <td className="px-4 py-2.5 font-semibold text-gray-800">₺{(s.tutar || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`badge ${s.durum === 'Teslim Edildi' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{s.durum}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500">{s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                    <td className="px-4 py-2.5 text-right"><button onClick={() => setSeciliSiparis(s)} className="btn-secondary !py-1 !px-2 !text-[11px]">Detay</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {toplamSayfa > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-500">{filtrelenmis.length} kayıttan {(sayfa - 1) * SAYFA_BOYUTU + 1}-{Math.min(sayfa * SAYFA_BOYUTU, filtrelenmis.length)} gösteriliyor</p>
                            <div className="flex gap-1">
                                <button onClick={() => setSayfa(Math.max(1, sayfa - 1))} disabled={sayfa === 1}
                                    className="px-2.5 py-1 rounded text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Önceki</button>
                                <span className="px-3 py-1 text-xs font-medium text-gray-600">{sayfa}/{toplamSayfa}</span>
                                <button onClick={() => setSayfa(Math.min(toplamSayfa, sayfa + 1))} disabled={sayfa === toplamSayfa}
                                    className="px-2.5 py-1 rounded text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sonraki →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {seciliSiparis && <SiparisDetayModal siparis={seciliSiparis} kapat={() => setSeciliSiparis(null)} />}
        </div>
    );
};

export default GecmisSiparisler;
