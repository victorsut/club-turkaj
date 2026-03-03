// src/views/client/ClientProfile.jsx
// Profile completion form shown after phone registration
import { inputStyle, btnStyle } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';

export default function ClientProfile(ctx) {
  const { regProfile, setRegProfile, regPhone, cfg, authError, setAuthError,
    clearAuthErr, setAuthScreen, setMe, setCusts, custs, fire, sbConnected, logActivity } = ctx;

  const maxBday = new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];

  const fields = [
    { k: 'name', l: 'Nombre completo *', icon: '👤', req: true, type: 'text' },
    { k: 'dpi', l: 'DPI (13 dígitos) *', icon: '🪪', req: true, type: 'text', maxLen: 13 },
    { k: 'plate', l: 'Placa vehículo (opcional)', icon: '🚗', type: 'text' },
    { k: 'email', l: 'Correo electrónico (opcional)', icon: '📧', type: 'email' },
    { k: 'bday', l: 'Fecha de nacimiento (opcional)', icon: '🎂', type: 'date' },
    { k: 'nit', l: 'NIT (opcional)', icon: '🧾', type: 'text' },
  ];

  const optFilled = ['dpi', 'plate', 'bday', 'nit'].filter(k => regProfile[k]?.trim()).length
    + (regProfile.email?.trim() ? 1 : 0);
  const bonusPts = optFilled * cfg.regOptional;

  const doFinish = () => {
    if (!regProfile.name.trim()) { setAuthError('Ingresa tu nombre'); return; }
    if (!regProfile.dpi?.trim()) { setAuthError('El DPI es obligatorio'); return; }
    if (!/^\d{13}$/.test(regProfile.dpi.trim())) { setAuthError('El DPI debe tener exactamente 13 dígitos'); return; }
    const totalPts = cfg.regBase + bonusPts;
    const newUser = {
      id: 'CT-' + Date.now(), name: regProfile.name, phone: regPhone,
      dpi: regProfile.dpi, plate: regProfile.plate || '', email: regProfile.email || '',
      bday: regProfile.bday || '', nit: regProfile.nit || '',
      points: totalPts, gallons: 0, spent: 0, visits: 0, tickets: 0,
      redeemed: 0, referrals: 0, registered: new Date().toISOString().split('T')[0],
      lastBuy: '', station: '', cardId: '',
    };
    setMe(newUser);
    setCusts(p => [...p, newUser]);
    setAuthScreen('logged');
    fire(`🎉 ¡Bienvenido! +${totalPts} pts de registro`);
  };

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => { setAuthScreen('register'); setAuthError(''); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        <Back /> Atrás
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Completar Perfil</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>
          +{cfg.regBase} pts base + {cfg.regOptional} pts por dato opcional
        </div>
      </div>

      {authError && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f.k} style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: 14, fontSize: 16 }}>{f.icon}</span>
            <input
              placeholder={f.l}
              type={f.type || 'text'}
              value={regProfile[f.k] || ''}
              onChange={e => { setRegProfile(p => ({ ...p, [f.k]: e.target.value })); clearAuthErr(); }}
              maxLength={f.maxLen}
              max={f.type === 'date' ? maxBday : undefined}
              style={{ ...inputStyle, paddingLeft: 42 }}
            />
          </div>
        ))}
      </div>

      {bonusPts > 0 && (
        <div style={{ background: '#E8F5E9', borderRadius: 14, padding: 12, marginBottom: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2E7D32' }}>
            🎁 Bonus: +{bonusPts} pts por datos opcionales
          </span>
        </div>
      )}

      <button onClick={doFinish} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
        Completar Registro ({cfg.regBase + bonusPts} pts)
      </button>
    </div>
  );
}
