// src/api/bildirimService.js
import { AuthServisi } from './authService';

const API_URL = 'http://localhost:3001/api/bildirimler';

function authFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...AuthServisi.getAuthHeader(),
        ...options.headers
    };
    return fetch(url, { ...options, headers });
}

export const BildirimServisi = {
    getBildirimler: async (rol = 'esnaf', limit = 50) => {
        try {
            const res = await authFetch(`${API_URL}?rol=${rol}&limit=${limit}`);
            if (!res.ok) throw new Error('Bildirimler getirilemedi');
            return await res.json();
        } catch (err) {
            console.error('getBildirimler hata:', err);
            return [];
        }
    },

    getOkunmamisSayisi: async (rol = 'esnaf') => {
        try {
            const res = await authFetch(`${API_URL}/okunmamis?rol=${rol}`);
            if (!res.ok) return 0;
            const data = await res.json();
            return data.sayi;
        } catch (err) {
            return 0;
        }
    },

    okunduIsaretle: async (id) => {
        try {
            await authFetch(`${API_URL}/${id}/okundu`, { method: 'PUT' });
            return true;
        } catch (err) {
            return false;
        }
    },

    tumunuOkunduIsaretle: async (rol = 'esnaf') => {
        try {
            await authFetch(`${API_URL}/toplu-okundu`, {
                method: 'PUT',
                body: JSON.stringify({ rol })
            });
            return true;
        } catch (err) {
            return false;
        }
    },

    // Public: Müşteri takip bilgisi (auth gerektirmez)
    getTakipBilgisi: async (token) => {
        try {
            const res = await fetch(`${API_URL}/takip/${token}`);
            if (!res.ok) throw new Error('Takip bilgisi bulunamadı');
            return await res.json();
        } catch (err) {
            console.error('getTakipBilgisi hata:', err);
            return null;
        }
    }
};
