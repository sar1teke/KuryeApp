// src/layouts/EsnafLayout.jsx
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { AuthServisi } from '../api/authService';
import BildirimMerkezi from '../components/BildirimMerkezi';

const menuItems = [
    {
        label: 'SİPARİŞLER', items: [
            { to: '/esnaf', end: true, label: 'Aktif Siparişler', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
            { to: '/esnaf/yeni-siparis', label: 'Yeni Sipariş', icon: 'M12 4v16m8-8H4' },
            { to: '/esnaf/gecmis-siparisler', label: 'Geçmiş', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { to: '/esnaf/silinen-siparisler', label: 'Silinen', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
        ]
    },
    {
        label: 'İŞLETME', items: [
            { to: '/esnaf/menu-yonetimi', label: 'Menü', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { to: '/esnaf/musteriler', label: 'Müşteriler', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { to: '/esnaf/raporlar', label: 'Raporlar', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { to: '/esnaf/analitik', label: 'Analitik', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { to: '/esnaf/kurye-yonetimi', label: 'Kuryeler', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { to: '/esnaf/kampanyalar', label: 'Kampanyalar', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
        ]
    },
    {
        label: 'ARAÇLAR', items: [
            { to: '/esnaf/canli-harita', label: 'Canlı Harita', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
            { to: '/esnaf/whatsapp-bagla', label: 'WhatsApp', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
            { to: '/esnaf/ayarlar', label: 'Ayarlar', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
        ]
    },
];

const Icon = ({ d }) => (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const EsnafLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const kullanici = AuthServisi.getKullanici();

    const cikisYap = () => { AuthServisi.logout(); navigate('/'); };

    const getTitle = () => {
        for (const g of menuItems) for (const i of g.items) {
            if (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/esnaf')
                return i.label;
        }
        return 'Aktif Siparişler';
    };

    return (
        <div className="flex h-screen bg-[#f8f9fb]">
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-gray-200 hidden md:flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="h-14 flex items-center px-5 border-b border-gray-100">
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">KuryeApp</h1>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
                    {menuItems.map((group, i) => (
                        <div key={i}>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">{group.label}</p>
                            <div className="space-y-0.5">
                                {group.items.map(item => (
                                    <NavLink key={item.to} to={item.to} end={item.end}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`
                                        }>
                                        <Icon d={item.icon} />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User */}
                <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-2.5 px-2 mb-2">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center text-xs font-bold">
                            {kullanici ? (kullanici.ad?.charAt(0) || 'U') + (kullanici.soyad?.charAt(0) || '') : 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-gray-800 truncate">
                                {kullanici ? `${kullanici.ad} ${kullanici.soyad}` : 'Kullanıcı'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{kullanici?.email || ''}</p>
                        </div>
                    </div>
                    <button onClick={cikisYap}
                        className="w-full flex items-center justify-center gap-1.5 text-gray-400 hover:text-red-500 text-xs font-medium py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-800">{getTitle()}</h2>
                    <BildirimMerkezi rol="esnaf" />
                </header>
                <main className="flex-1 overflow-y-auto p-5">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default EsnafLayout;