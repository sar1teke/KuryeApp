// src/api/musteriService.js
import { AuthServisi } from './authService';

const API_URL = 'http://localhost:3001/api/musteriler';
const authFetch = (url, opt = {}) => fetch(url, { ...opt, headers: { 'Content-Type': 'application/json', ...AuthServisi.getAuthHeader(), ...opt.headers } });

export const MusteriServisi = {
    musteriListele: async () => {
        try {
            const res = await authFetch(API_URL);
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error('musteriListele hata:', err);
            return [];
        }
    },

    musteriAra: async (query) => {
        if (!query || query.length < 2) return [];
        try {
            const res = await authFetch(`${API_URL}/ara?q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.error('musteriAra hata:', err);
            return [];
        }
    },

    musteriGetir: async (id) => {
        try {
            const res = await authFetch(`${API_URL}/${id}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error('musteriGetir hata:', err);
            return null;
        }
    },

    musteriEkle: async (musteri) => {
        try {
            const res = await authFetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(musteri)
            });
            if (!res.ok) throw new Error('Müşteri eklenemedi');
            return await res.json();
        } catch (err) {
            console.error('musteriEkle hata:', err);
            return null;
        }
    },

    musteriGuncelle: async (id, data) => {
        try {
            const res = await authFetch(`${API_URL}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Müşteri güncellenemedi');
            return await res.json();
        } catch (err) {
            console.error('musteriGuncelle hata:', err);
            return null;
        }
    },

    musteriSil: async (id) => {
        try {
            const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (err) {
            console.error('musteriSil hata:', err);
            return false;
        }
    }
};
