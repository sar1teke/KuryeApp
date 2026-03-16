// src/api/menuService.js
import { AuthServisi } from './authService';

const API_URL = 'http://localhost:3001/api/menu';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

export const MenuServisi = {
  getMenu: async () => {
    try {
      const res = await authFetch(API_URL);
      if (!res.ok) throw new Error('Menü getirilemedi');
      return await res.json();
    } catch (err) {
      console.error('getMenu hata:', err);
      return [];
    }
  },

  getKategoriler: async () => {
    try {
      const res = await authFetch(`${API_URL}/kategoriler`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('getKategoriler hata:', err);
      return [];
    }
  },

  urunEkle: async (yeniUrun) => {
    try {
      const res = await authFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(yeniUrun)
      });
      if (!res.ok) throw new Error('Ürün eklenemedi');
      return await res.json();
    } catch (err) {
      console.error('urunEkle hata:', err);
      return null;
    }
  },

  urunGuncelle: async (id, data) => {
    try {
      const res = await authFetch(`${API_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Ürün güncellenemedi');
      return await res.json();
    } catch (err) {
      console.error('urunGuncelle hata:', err);
      return null;
    }
  },

  urunSil: async (id) => {
    try {
      const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('urunSil hata:', err);
      return false;
    }
  }
};