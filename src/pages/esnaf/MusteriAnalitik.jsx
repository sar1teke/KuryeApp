// src/pages/esnaf/MusteriAnalitik.jsx
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { AuthServisi } from '../../api/authService';

const API = 'http://localhost:3001/api/raporlar/musteri-detay';
const authFetch = (url) => fetch(url, { headers: AuthServisi.getAuthHeader() }).then(r => r.json());
const RENKLER = ['#4263eb', '#0ca678', '#f59f00', '#e8590c', '#7048e8', '#d6336c'];

const MusteriAnalitik = () => {
    const [data, setData] = useState(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [sekme, setSekme] = useState('genel');

    useEffect(() => {
        authFetch(API).then(d => { setData(d); setYukleniyor(false); }).catch(() => setYukleniyor(false));
    }, []);

    if (yukleniyor) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center py-16 text-gray-400">Veri yüklenemedi.</div>;

    const segmentData = [
        { name: 'VIP (5+ sipariş)', value: data.segment.vip },
        { name: 'Düzenli (2-4)', value: data.segment.duzenli },
        { name: 'Tek Seferlik', value: data.segment.tekSefer },
    ].filter(s => s.value > 0);

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="page-title">Müşteri Analitik</h1>
                    <p className="page-subtitle">Müşteri davranışı ve sipariş kalıpları</p>
                </div>
            </div>

            {/* KPI Kartları */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { l: 'Toplam Müşteri', v: data.segment.toplam, ikon: '👥', c: 'border-l-blue-500' },
                    { l: 'Haftalık Aktif', v: data.haftalikAktif, ikon: '🔥', c: 'border-l-amber-500' },
                    { l: 'VIP Müşteri', v: data.segment.vip, ikon: '⭐', c: 'border-l-violet-500' },
                    { l: 'Tekrar Oranı', v: `%${data.segment.toplam > 0 ? ((data.segment.duzenli + data.segment.vip) / data.segment.toplam * 100).toFixed(0) : 0}`, ikon: '🔄', c: 'border-l-emerald-500' },
                    { l: 'Ort. Sepet', v: `₺${data.ortTutar}`, ikon: '🛒', c: 'border-l-cyan-500' },
                ].map((k, i) => (
                    <div key={i} className={`card border-l-[3px] ${k.c} p-4`}>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] text-gray-500 font-medium">{k.l}</p>
                            <span className="text-sm">{k.ikon}</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{k.v}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 overflow-x-auto">
                {[
                    { k: 'genel', l: 'Genel Trend' }, { k: 'skor', l: 'En Çok Harcayan' },
                    { k: 'sik', l: 'En Sık Sipariş' }, { k: 'dagilim', l: 'Gün & Saat' }
                ].map(s => (
                    <button key={s.k} onClick={() => setSekme(s.k)}
                        className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${sekme === s.k ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{s.l}</button>
                ))}
            </div>

            {/* GENEL TREND */}
            {sekme === 'genel' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Müşteri Trendi */}
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">Günlük Müşteri Sayısı (30 Gün)</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.musteriTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="gun" tick={{ fontSize: 10 }} interval={4} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="musteriSayisi" name="Müşteri" stroke="#4263eb" fill="#4263eb" fillOpacity={0.1} strokeWidth={2} />
                                    <Area type="monotone" dataKey="siparisSayisi" name="Sipariş" stroke="#0ca678" fill="#0ca678" fillOpacity={0.08} strokeWidth={1.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Müşteri Segmentleri */}
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">Müşteri Segmentleri</h3>
                        <div className="h-[280px] flex items-center">
                            {segmentData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={segmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name"
                                            label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`} labelLine={false}>
                                            {segmentData.map((_, i) => <Cell key={i} fill={RENKLER[i % RENKLER.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-400 text-sm w-full">Segment verisi yok.</p>
                            )}
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                            {segmentData.map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: RENKLER[i] }} />
                                    <span className="text-[11px] text-gray-500">{s.name}: {s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* EN ÇOK HARCAYAN */}
            {sekme === 'skor' && (
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">En Çok Harcayan Müşteriler (Top 10)</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100 bg-gray-50">
                            <th className="table-header px-4 py-3">#</th><th className="table-header px-4 py-3">Müşteri</th>
                            <th className="table-header px-4 py-3">Telefon</th>
                            <th className="table-header px-4 py-3 text-center">Sipariş</th>
                            <th className="table-header px-4 py-3 text-right">Toplam Harcama</th>
                            <th className="table-header px-4 py-3 text-right">Ort. Sepet</th>
                            <th className="table-header px-4 py-3 text-right">Son Sipariş</th>
                        </tr></thead>
                        <tbody>
                            {data.enCokHarcayanlar.map((m, i) => (
                                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <p className="font-medium text-gray-800">{m.ad} {m.soyad || ''}</p>
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-500">{m.telefon || '—'}</td>
                                    <td className="px-4 py-2.5 text-center"><span className="badge bg-blue-50 text-blue-700">{m.siparis_sayisi}</span></td>
                                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">₺{(m.toplam_harcama || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-500">₺{(m.ort_sepet || 0).toFixed(0)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{m.son_siparis ? new Date(m.son_siparis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '—'}</td>
                                </tr>
                            ))}
                            {data.enCokHarcayanlar.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-gray-400 text-sm">Veri yok.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EN SIK SİPARİŞ */}
            {sekme === 'sik' && (
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">En Sık Sipariş Veren Müşteriler (Top 10)</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-100 bg-gray-50">
                            <th className="table-header px-4 py-3">#</th><th className="table-header px-4 py-3">Müşteri</th>
                            <th className="table-header px-4 py-3">Telefon</th>
                            <th className="table-header px-4 py-3 text-center">Sipariş Sayısı</th>
                            <th className="table-header px-4 py-3 text-right">Toplam Harcama</th>
                            <th className="table-header px-4 py-3 text-right">Son Sipariş</th>
                        </tr></thead>
                        <tbody>
                            {data.enSikVerenler.map((m, i) => (
                                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-gray-800">{m.ad} {m.soyad || ''}</td>
                                    <td className="px-4 py-2.5 text-gray-500">{m.telefon || '—'}</td>
                                    <td className="px-4 py-2.5 text-center"><span className="badge bg-violet-50 text-violet-700 font-bold">{m.siparis_sayisi}</span></td>
                                    <td className="px-4 py-2.5 text-right text-gray-800">₺{(m.toplam_harcama || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{m.son_siparis ? new Date(m.son_siparis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* GÜN & SAAT DAĞILIMI */}
            {sekme === 'dagilim' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">Hafta Günlerine Göre (Son 30 Gün)</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.gunDagilimi}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="gun" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="siparis" name="Sipariş" fill="#4263eb" radius={[4, 4, 0, 0]} barSize={28} />
                                    <Bar dataKey="musteri" name="Müşteri" fill="#0ca678" radius={[4, 4, 0, 0]} barSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold text-gray-800 mb-4">Saatlere Göre Sipariş (Son 30 Gün)</h3>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.saatDagilimi}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="saat" tick={{ fontSize: 11 }} tickFormatter={v => `${v}:00`} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip labelFormatter={v => `${v}:00`} />
                                    <Bar dataKey="siparis" name="Sipariş" fill="#f59f00" radius={[3, 3, 0, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MusteriAnalitik;
