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
        <div style={{ fontSize: 22, fontWeight: 900 }}>Completa tu Perfil</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>
          Gana +{cfg.regBase} pts base · +{cfg.regOptional} pts por cada dato opcional
        </div>
      </div>

      {authError && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {fields.map(f => {
          const isFilled = regProfile[f.k]?.trim();
          const showBonus = !f.req && isFilled;

          return (
            <div key={f.k} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, zIndex: 1 }}>
                {f.icon}
              </div>

              {f.type === 'date' ? (
                <>
                  <input type="date"
                    value={regProfile[f.k] || ''}
                    max={maxBday} min="1930-01-01"
                    onFocus={() => {
                      if (!regProfile[f.k]) setRegProfile(p => ({ ...p, [f.k]: '2000-01-01' }));
                    }}
                    onChange={e => { setRegProfile(p => ({ ...p, [f.k]: e.target.value })); clearAuthErr(); }}
                    style={{ ...inputStyle, paddingLeft: 42, color: regProfile[f.k] ? '#0D0D0D' : 'transparent' }}
                  />
                  {!regProfile[f.k] && (
                    <div style={{
                      position: 'absolute', left: 42, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 14, color: '#9E9E9E', pointerEvents: 'none',
                      fontFamily: "'DM Sans'", fontWeight: 600,
                    }}>
                      {f.l}
                    </div>
                  )}
                  {regProfile[f.k] && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, fontWeight: 800, color: '#4CAF50',
                      background: '#E8F5E9', padding: '2px 8px', borderRadius: 8,
                    }}>
                      +{cfg.regOptional} pts
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    placeholder={f.l}
                    type={f.type || 'text'}
                    inputMode={f.numeric ? 'numeric' : undefined}
                    maxLength={f.maxLen}
                    value={regProfile[f.k] || ''}
                    onChange={e => {
                      let val = f.numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                      if (f.maxLen && val.length > f.maxLen) val = val.slice(0, f.maxLen);
                      setRegProfile(p => ({ ...p, [f.k]: val })); clearAuthErr();
                    }}
                    style={{ ...inputStyle, paddingLeft: 42 }}
                  />
                  {showBonus && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, fontWeight: 800, color: '#4CAF50',
                      background: '#E8F5E9', padding: '2px 8px', borderRadius: 8,
                    }}>
                      +{cfg.regOptional} pts
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Points summary card */}
      <div style={{ background: '#FFF8E1', borderRadius: 14, padding: 16, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#9E9E9E' }}>Puntos al registrarte</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#F0A500' }}>{cfg.regBase + bonusPts}</div>
        <div style={{ fontSize: 11, color: '#9E9E9E' }}>Base: {cfg.regBase} + Datos opcionales: {bonusPts}</div>
      </div>

      <button onClick={doFinish} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
        Completar Registro
      </button>
    </div>
  );
}
