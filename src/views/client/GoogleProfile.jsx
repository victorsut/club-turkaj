// src/views/client/GoogleProfile.jsx
// Two-step flow: 1) Welcome screen 2) Profile form for Google/Apple OAuth users
import { sb } from '../../lib/supabaseClient';
import { inputStyle, btnStyle, sMono } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import { Back } from '../../components/ui/Icons';

export default function GoogleProfile(ctx) {
  const { me, setMe, setCusts, custs, cfg, googleStep, setGoogleStep,
    regProfile, setRegProfile, authError, setAuthError, clearAuthErr,
    setAuthScreen, fire, sbConnected, cTier, syncMember, logActivity } = ctx;

  // Step 1: Welcome screen
  if (googleStep === 'welcome') {
    const doBack = () => {
      setMe(null); setAuthScreen('login'); setGoogleStep('welcome');
      setRegProfile({ name: '', dpi: '', plate: '', email: '', bday: '', nit: '' });
      if (sb) sb.auth.signOut({ scope: 'local' }).catch(() => {});
    };

    return (
      <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
        <button onClick={doBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          <Back /> Volver al inicio
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {me?.avatar && <img src={me.avatar} style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #FBBC04', marginBottom: 12 }} alt="" />}
          {!me?.avatar && <div style={{ fontSize: 48, marginBottom: 12 }}>⛽</div>}
          <div style={{ fontSize: 24, fontWeight: 900 }}>¡Hola, {me?.name?.split(' ')[0]}!</div>
          <div style={{ fontSize: 14, color: '#9E9E9E', marginTop: 6 }}>Bienvenido a Club Turkaj</div>
        </div>

        <div style={{ background: '#FFF8E1', borderRadius: 20, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0A500', marginBottom: 16, textAlign: 'center' }}>
            ¿Cómo funciona?
          </div>
          {[
            { icon: '⛽', title: 'Acumulá puntos', desc: `Ganás 1 punto por cada Q${cfg.qPerPt} en combustible` },
            { icon: '🎁', title: 'Canjeá premios', desc: 'Desde café gratis hasta un PlayStation 5' },
            { icon: '🎟️', title: 'Rifas mensuales', desc: 'Cada mes un premio diferente' },
            { icon: '⭐', title: 'Subí de nivel', desc: 'ORO → PLATINO (150 gal) → BLACK (500 gal)' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: 1 }}>Bonus de registro</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#4CAF50', marginTop: 4 }}>{cfg.regBase}+</div>
          <div style={{ fontSize: 12, color: '#9E9E9E' }}>puntos base + {cfg.regOptional} por cada dato opcional</div>
        </div>

        <button onClick={() => setGoogleStep('profile')} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D', width: '100%' }}>
          Completar mi perfil →
        </button>
      </div>
    );
  }

  // Step 2: Profile form
  const maxBday = new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];
  const fields = [
    { k: 'name', l: 'Nombre completo', icon: '👤', req: true, type: 'text' },
    { k: 'phone', l: 'Teléfono 8 dígitos (opcional)', icon: '📱', type: 'tel', maxLen: 8, numeric: true },
    { k: 'dpi', l: 'DPI (13 dígitos) *', icon: '🪪', req: true, type: 'text', maxLen: 13 },
    { k: 'plate', l: 'Placa vehículo (opcional)', icon: '🚗', type: 'text' },
    { k: 'email', l: 'Correo electrónico', icon: '📧', type: 'email' },
    { k: 'bday', l: 'Fecha de nacimiento (opcional)', icon: '🎂', type: 'date' },
    { k: 'nit', l: 'NIT (opcional)', icon: '🧾', type: 'text' },
  ];

  const optFilled = ['phone', 'dpi', 'plate', 'bday', 'nit'].filter(k => regProfile[k]?.trim()).length
    + (regProfile.email?.trim() ? 1 : 0);
  const bonusPts = optFilled * cfg.regOptional;

  const doFinish = () => {
    if (!regProfile.name.trim()) { setAuthError('Ingresa tu nombre'); return; }
    if (!regProfile.dpi?.trim()) { setAuthError('El DPI es obligatorio'); return; }
    if (!/^\d{13}$/.test(regProfile.dpi.trim())) { setAuthError('El DPI debe tener exactamente 13 dígitos'); return; }
    if (regProfile.phone?.trim() && !/^\d{8}$/.test(regProfile.phone.trim())) { setAuthError('El teléfono debe tener exactamente 8 dígitos'); return; }

    const totalPts = cfg.regBase + bonusPts;
    let bdayStored = '';
    if (regProfile.bday) { const parts = regProfile.bday.split('-'); if (parts.length === 3) bdayStored = parts[1] + '-' + parts[2]; }

    // Generate card code and save to Supabase
    const fallbackCard = CARD_PREFIX.ORO + '-' + String(Date.now()).slice(-5);
    const updated = {
      ...me, name: regProfile.name, phone: regProfile.phone || '',
      dpi: regProfile.dpi || '', plate: regProfile.plate || '',
      email: regProfile.email || me.email, bday: bdayStored,
      nit: regProfile.nit || '', points: totalPts, cardId: fallbackCard,
    };
    setMe(updated);
    setCusts(p => [...p, updated]);
    setAuthScreen('logged');
    setGoogleStep('welcome');
    fire(`🎉 ¡Bienvenido! +${totalPts} pts de registro`);

    // Save to Supabase (background)
    if (sb && sbConnected) {
      const memberData = {
        phone: regProfile.phone?.trim() || 'goog_' + me.id.substring(0, 12),
        password_hash: 'google-oauth', auth_provider: 'google', auth_provider_id: me.id,
        name: regProfile.name, dpi: regProfile.dpi || null,
        plate: regProfile.plate || null, nit: regProfile.nit || null,
        email: regProfile.email || me.email, birthday: bdayStored || null,
        points: totalPts, gallons: 0, spent: 0, visits: 0, tickets: 0,
        redeemed_count: 0, referral_count: 0,
      };
      sb.from('members').insert(memberData).select().then(async (r) => {
        if (r.data?.[0]) {
          const dbId = r.data[0].id;
          setMe(p => ({ ...p, id: dbId }));
          // Insert card and link back to member
          const cardRes = await sb.from('physical_cards')
            .insert({ assigned_to: dbId, card_code: fallbackCard, tier: 'ORO', status: 'active' })
            .select();
          if (cardRes.data?.[0]) {
            await sb.from('members').update({ card_id: cardRes.data[0].id }).eq('id', dbId);
          }
          logActivity(dbId, 'registro', `Bienvenido a Club Turkaj \u00b7 +${totalPts} pts de registro`, totalPts);
        }
      });
    }
  };

  // noBonus flag for required fields (name)
  const fieldsStyled = fields.map(f => ({ ...f, noBonus: f.k === 'name' }));

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => setGoogleStep('welcome')}
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
        {fieldsStyled.map(f => {
          const isFilled = regProfile[f.k]?.trim();
          const showBonus = !f.noBonus && isFilled;

          return (
            <div key={f.k} style={{ position: 'relative' }}>
              {/* Icon inside input */}
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
                  {/* Placeholder overlay for date */}
                  {!regProfile[f.k] && (
                    <div style={{
                      position: 'absolute', left: 42, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 14, color: '#9E9E9E', pointerEvents: 'none',
                      fontFamily: "'DM Sans'", fontWeight: 600,
                    }}>
                      {f.l}
                    </div>
                  )}
                  {/* Bonus badge for date */}
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
                  {/* Bonus badge inside input */}
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
