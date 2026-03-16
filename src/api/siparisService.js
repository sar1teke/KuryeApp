// src/api/siparisService.js
import { AuthServisi } from './authService';

const API_URL = 'http://localhost:3001/api/siparisler';

// Auth header'lı fetch helper
function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...AuthServisi.getAuthHeader(),
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

export const SiparisServisi = {
  getSiparisler: async (aktifMi = true, filtreler = {}) => {
    try {
      const params = new URLSearchParams({ aktif: aktifMi });

      if (filtreler.arama) params.set('arama', filtreler.arama);
      if (filtreler.durum) params.set('durum', filtreler.durum);
      if (filtreler.durumlar) params.set('durumlar', filtreler.durumlar);
      if (filtreler.tarihBas) params.set('tarihBas', filtreler.tarihBas);
      if (filtreler.tarihBit) params.set('tarihBit', filtreler.tarihBit);

      const res = await authFetch(`${API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error('Siparişler getirilemedi');
      return await res.json();
    } catch (err) {
      console.error('getSiparisler hata:', err);
      return [];
    }
  },

  getSiparis: async (id) => {
    try {
      const res = await authFetch(`${API_URL}/${id}`);
      if (!res.ok) throw new Error('Sipariş getirilemedi');
      return await res.json();
    } catch (err) {
      console.error('getSiparis hata:', err);
      return null;
    }
  },

  siparisEkle: async (yeniSiparis) => {
    try {
      const res = await authFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(yeniSiparis)
      });
      if (!res.ok) throw new Error('Sipariş oluşturulamadı');
      return await res.json();
    } catch (err) {
      console.error('siparisEkle hata:', err);
      return null;
    }
  },

  siparisSil: async (id) => {
    try {
      const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('siparisSil hata:', err);
      return false;
    }
  },

  durumGuncelle: async (id, yeniDurum, not = '') => {
    try {
      const res = await authFetch(`${API_URL}/${id}/durum`, {
        method: 'PUT',
        body: JSON.stringify({ durum: yeniDurum, not })
      });
      if (!res.ok) throw new Error('Durum güncellenemedi');
      return await res.json();
    } catch (err) {
      console.error('durumGuncelle hata:', err);
      return null;
    }
  },

  siparisGeriYukle: async (id) => {
    try {
      const res = await authFetch(`${API_URL}/${id}/geri-yukle`, { method: 'PUT' });
      return res.ok;
    } catch (err) {
      console.error('siparisGeriYukle hata:', err);
      return false;
    }
  },

  kuryeAtaSiparis: async (id) => {
    try {
      const res = await authFetch(`${API_URL}/${id}/kurye-ata`, { method: 'PUT' });
      if (!res.ok) throw new Error('Kurye atanamadı');
      return await res.json();
    } catch (err) {
      console.error('kuryeAtaSiparis hata:', err);
      return null;
    }
  },

  siparisIptalEt: async (id, neden) => {
    try {
      const res = await authFetch(`${API_URL}/${id}/iptal`, { method: 'PUT', body: JSON.stringify({ neden }) });
      return res.ok;
    } catch (err) {
      console.error('siparisIptalEt hata:', err);
      return false;
    }
  },

  esnafKuryeAta: async (siparisId, kuryeId) => {
    try {
      const res = await authFetch(`${API_URL}/${siparisId}/esnaf-kurye-ata`, { method: 'PUT', body: JSON.stringify({ kurye_id: kuryeId }) });
      if (!res.ok) throw new Error('Kurye atanamadı');
      return await res.json();
    } catch (err) {
      console.error('esnafKuryeAta hata:', err);
      return null;
    }
  }
};
