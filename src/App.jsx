// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RouteGuard from './components/RouteGuard';

// Sayfalar
import Giris from './pages/ortak/Giris';
import EsnafHome from './pages/esnaf/EsnafHome';
import SiparisEkle from './pages/esnaf/SiparisEkle';
import KuryeHome from './pages/kurye/KuryeHome';

// Layout
import EsnafLayout from './layouts/EsnafLayout';
import MenuYonetimi from './pages/esnaf/MenuYonetimi';
import SilinenSiparisler from './pages/esnaf/SilinenSiparisler';
import Raporlar from './pages/esnaf/Raporlar';
import Ayarlar from './pages/esnaf/Ayarlar';
import Musteriler from './pages/esnaf/Musteriler';
import WhatsappBagla from './pages/esnaf/WhatsappBagla';
import GecmisSiparisler from './pages/esnaf/GecmisSiparisler';
import EsnafKuryeHaritasi from './pages/esnaf/EsnafKuryeHaritasi';
import KuryeYonetimi from './pages/esnaf/KuryeYonetimi';
import MusteriAnalitik from './pages/esnaf/MusteriAnalitik';
import Kampanyalar from './pages/esnaf/Kampanyalar';
import MusteriTakip from './pages/ortak/MusteriTakip';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Giris />} />

        {/* ESNAF BÖLÜMÜ — Sadece esnaf rolü */}
        <Route path="/esnaf" element={<RouteGuard allowedRoles={['esnaf', 'admin']}><EsnafLayout /></RouteGuard>}>
          <Route index element={<EsnafHome />} />
          <Route path="yeni-siparis" element={<SiparisEkle />} />
          <Route path="menu-yonetimi" element={<MenuYonetimi />} />
          <Route path="silinen-siparisler" element={<SilinenSiparisler />} />
          <Route path="raporlar" element={<Raporlar />} />
          <Route path="ayarlar" element={<Ayarlar />} />
          <Route path="musteriler" element={<Musteriler />} />
          <Route path="whatsapp-bagla" element={<WhatsappBagla />} />
          <Route path="gecmis-siparisler" element={<GecmisSiparisler />} />
          <Route path="canli-harita" element={<EsnafKuryeHaritasi />} />
          <Route path="kurye-yonetimi" element={<KuryeYonetimi />} />
          <Route path="analitik" element={<MusteriAnalitik />} />
          <Route path="kampanyalar" element={<Kampanyalar />} />
        </Route>

        {/* KURYE BÖLÜMÜ — Sadece kurye rolü */}
        <Route path="/kurye" element={<RouteGuard allowedRoles={['kurye']}><KuryeHome /></RouteGuard>} />

        {/* PUBLIC — Müşteri Takip */}
        <Route path="/takip/:token" element={<MusteriTakip />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;