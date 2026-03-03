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

  return (
    <div style={{ padding: '40px 24px 120px', position: 'relative', zIndex: 1 }}>
      <button onClick={() => setGoogleStep('welcome')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        <Back /> Atrás
      </button>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Completar Perfil</div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4 }}>
          +{cfg.regBase} pts base + {cfg.regOptional} por dato opcional
        </div>
      </div>

      {authError && (
        <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          {authError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {fields.map(f => (
          <input key={f.k} placeholder={`${f.icon} ${f.l}`}
            type={f.type || 'text'}
            inputMode={f.numeric ? 'numeric' : undefined}
            value={regProfile[f.k] || ''}
            onChange={e => {
              const val = f.numeric ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
              setRegProfile(p => ({ ...p, [f.k]: val })); clearAuthErr();
            }}
            maxLength={f.maxLen}
            max={f.type === 'date' ? maxBday : undefined}
            style={inputStyle} />
        ))}
      </div>

      {bonusPts > 0 && (
        <div style={{ background: '#E8F5E9', borderRadius: 14, padding: 12, marginBottom: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2E7D32' }}>🎁 Bonus: +{bonusPts} pts</span>
        </div>
      )}

      <button onClick={doFinish} style={{ ...btnStyle, background: '#FBBC04', color: '#0D0D0D' }}>
        Completar Registro ({cfg.regBase + bonusPts} pts)
      </button>
    </div>
  );
}
