// src/api/authService.js
const API_URL = 'http://localhost:3001/api/auth';

export const AuthServisi = {
    // Token'ı localStorage'dan al
    getToken() {
        return localStorage.getItem('auth_token');
    },

    // Kullanıcı bilgisini al
    getKullanici() {
        const data = localStorage.getItem('auth_kullanici');
        return data ? JSON.parse(data) : null;
    },

    // Giriş yapılmış mı kontrol et
    girisYapilmisMi() {
        return !!this.getToken();
    },

    // Kullanıcı rolünü al
    getRol() {
        const k = this.getKullanici();
        return k ? k.rol : null;
    },

    // Auth header oluştur (diğer servisler için)
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Giriş yap
    async login(email, sifre) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sifre })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Giriş başarısız');

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_kullanici', JSON.stringify(data.kullanici));
        return data;
    },

    // Kayıt ol
    async register(ad, soyad, email, sifre, rol) {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ad, soyad, email, sifre, rol })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kayıt başarısız');

        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_kullanici', JSON.stringify(data.kullanici));
        return data;
    },

    // Mevcut kullanıcı bilgisini sunucudan doğrula
    async me() {
        const res = await fetch(`${API_URL}/me`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!res.ok) {
            this.logout();
            return null;
        }
        const data = await res.json();
        localStorage.setItem('auth_kullanici', JSON.stringify(data.kullanici));
        return data.kullanici;
    },

    // Çıkış yap
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_kullanici');
    }
};
