import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthServisi } from '../../api/authService';

const Giris = () => {
  const navigate = useNavigate();
  const [mod, setMod] = useState('login');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [rol, setRol] = useState('esnaf');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  if (AuthServisi.girisYapilmisMi()) {
    window.location.href = AuthServisi.getRol() === 'kurye' ? '/kurye' : '/esnaf';
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata(''); setYukleniyor(true);
    try {
      const data = mod === 'login'
        ? await AuthServisi.login(email, sifre)
        : await AuthServisi.register(ad, soyad, email, sifre, rol);
      navigate(data.kullanici.rol === 'kurye' ? '/kurye' : '/esnaf');
    } catch (err) { setHata(err.message); }
    finally { setYukleniyor(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
      <div className="w-full max-w-sm px-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">KuryeApp</h1>
          <p className="text-sm text-gray-500 mt-1">Sipariş & Teslimat Yönetimi</p>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5">
            <button onClick={() => { setMod('login'); setHata(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mod === 'login' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>
              Giriş Yap
            </button>
            <button onClick={() => { setMod('register'); setHata(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mod === 'register' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>
              Kayıt Ol
            </button>
          </div>

          {hata && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">{hata}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mod === 'register' && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label">Ad</label>
                    <input type="text" value={ad} onChange={e => setAd(e.target.value)} className="input-field" placeholder="Adınız" required />
                  </div>
                  <div className="flex-1">
                    <label className="label">Soyad</label>
                    <input type="text" value={soyad} onChange={e => setSoyad(e.target.value)} className="input-field" placeholder="Soyadınız" />
                  </div>
                </div>
                <div>
                  <label className="label">Hesap Türü</label>
                  <div className="flex gap-2">
                    {[{ v: 'esnaf', l: 'İşletme' }, { v: 'kurye', l: 'Kurye' }].map(r => (
                      <button key={r.v} type="button" onClick={() => setRol(r.v)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${rol === r.v ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}>{r.l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="ornek@email.com" required />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} className="input-field" placeholder="••••••••" required minLength={6} />
            </div>
            <button type="submit" disabled={yukleniyor}
              className={`btn-primary w-full !py-2.5 ${yukleniyor ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {yukleniyor ? 'İşleniyor...' : (mod === 'login' ? 'Giriş Yap' : 'Hesap Oluştur')}
            </button>
          </form>

          {mod === 'login' && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 text-center mb-2 uppercase tracking-wider font-medium">Demo Hesapları</p>
              <div className="space-y-1.5">
                {[
                  { email: 'admin@kuryeapp.com', label: 'İşletme', desc: 'admin@kuryeapp.com' },
                  { email: 'kurye@kuryeapp.com', label: 'Kurye', desc: 'kurye@kuryeapp.com' },
                ].map(d => (
                  <button key={d.email} type="button" onClick={() => { setEmail(d.email); setSifre('123456'); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium text-gray-700">{d.label}</span>
                    <span className="text-xs text-gray-400">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">KuryeApp © 2026</p>
      </div>
    </div>
  );
};

export default Giris;