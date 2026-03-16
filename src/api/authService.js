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
        try {
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
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
                console.warn("API Sunucusuna ulaşılamadı. Demo modunda giriş yapılıyor...");
                const rol = email.includes('kurye') ? 'kurye' : 'esnaf';
                const demoKullanici = { id: 999, ad: rol === 'esnaf' ? 'Demo' : 'Kurye', soyad: 'Kullanıcı', email, rol };
                const demoData = { token: 'demo-token-12345', kullanici: demoKullanici };
                
                localStorage.setItem('auth_token', demoData.token);
                localStorage.setItem('auth_kullanici', JSON.stringify(demoData.kullanici));
                return demoData;
            }
            throw err;
        }
    },

    // Kayıt ol
    async register(ad, soyad, email, sifre, rol) {
        try {
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
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
                console.warn("API Sunucusuna ulaşılamadı. Demo modunda kayıt gerçekleştiriliyor...");
                const demoKullanici = { id: 999, ad, soyad, email, rol: rol || 'esnaf' };
                const demoData = { token: 'demo-token-12345', kullanici: demoKullanici };
                
                localStorage.setItem('auth_token', demoData.token);
                localStorage.setItem('auth_kullanici', JSON.stringify(demoData.kullanici));
                return demoData;
            }
            throw err;
        }
    },

    // Mevcut kullanıcı bilgisini sunucudan doğrula
    async me() {
        try {
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
        } catch (err) {
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
                console.warn("API Sunucusuna ulaşılamadı. Lokal session ile devam ediliyor...");
                return this.getKullanici();
            }
            this.logout();
            return null;
        }
    },

    // Çıkış yap
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_kullanici');
    }
};
