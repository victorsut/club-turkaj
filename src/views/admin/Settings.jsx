// src/views/admin/Settings.jsx
// Admin settings — program config, fuel prices, tier thresholds
import { useState, useEffect } from 'react';
import { sMono, adminTheme as AT, inputStyleDark } from '../../constants/styles';
import { Back } from '../../components/ui/Icons';
import { updateFuelPrices } from '../../services/rpcServices';

export default function Settings(ctx) {
  const { cfg, setCfg, setScr, fire, operators, setScr: navTo } = ctx;

  // ─── Modal: edición de precios de combustible ───
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ super: '', regular: '', diesel: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Valida un campo de precio (string desde el input).
  // Retorna null si OK, string con mensaje si inválido.
  const fieldError = (v) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 'Ingresá un número';
    if (n < 1 || n > 100) return 'Debe estar entre Q1.00 y Q100.00';
    return null;
  };
  const formInvalid = ['super', 'regular', 'diesel'].some((k) => fieldError(priceForm[k]) !== null);

  const openPriceModal = () => {
    setPriceForm({
      super: String(cfg.fuelPrices?.super ?? 0),
      regular: String(cfg.fuelPrices?.regular ?? 0),
      diesel: String(cfg.fuelPrices?.diesel ?? 0),
    });
    setSaveError('');
    setShowPriceModal(true);
  };

  const closePriceModal = () => {
    if (saving) return;
    setShowPriceModal(false);
    setSaveError('');
  };

  // Esc cierra el modal (a menos que estemos guardando).
  useEffect(() => {
    if (!showPriceModal) return;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) closePriceModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPriceModal, saving]);

  const savePrices = async () => {
    if (formInvalid || saving) return;
    const payload = {
      super: parseFloat(priceForm.super),
      regular: parseFloat(priceForm.regular),
      diesel: parseFloat(priceForm.diesel),
    };
    setSaving(true);
    setSaveError('');
    const { data, error } = await updateFuelPrices(payload);
    setSaving(false);
    if (error) {
      console.error('[Settings:updatePrices]', error.message);
      setSaveError('Error al guardar. Intentá de nuevo.');
      return;
    }
    if (!data) {
      console.error('[Settings:updatePrices] Unexpected null response from update_fuel_prices RPC.');
      setSaveError('No se pudo guardar. Intentá de nuevo o contactá soporte.');
      return;
    }
    if (typeof setCfg === 'function') {
      setCfg((prev) => ({ ...prev, fuelPrices: payload }));
    }
    if (typeof fire === 'function') fire('✓ Precios actualizados');
    setShowPriceModal(false);
  };

  const aSec = { padding: '20px 20px 8px', fontSize: 12, fontWeight: 800, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 2 };
  const aCard = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, margin: '0 20px 12px', padding: 16 };
  const row = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 13 };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${AT.border}`, background: '#252525', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScr('dash')} style={{ background: 'none', border: 'none', color: '#9E9E9E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600 }}><Back /> Inicio</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Configuración</div>
        <div style={{ width: 80 }} />
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 20px' }}>
        <button onClick={() => setScr('rules')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#FBBC04' }}>📋 Ver Reglas</button>
        <button onClick={() => setScr('ops')} style={{ flex: 1, padding: 14, borderRadius: 14, background: AT.card, border: `1px solid ${AT.border}`, fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64B5F6' }}>👷 Operadores</button>
      </div>

      {/* Conversión */}
      <div style={aSec}>Conversión</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Quetzales por punto</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>Q{cfg.qPerPt}</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Puntos por boleto rifa</span>
          <span style={{ color: '#FBBC04', fontWeight: 800, ...sMono }}>{cfg.ticketPts} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts registro base</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>{cfg.regBase} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts campo opcional</span>
          <span style={{ color: '#2E7D32', fontWeight: 800, ...sMono }}>+{cfg.regOptional} pts</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Pts referido</span>
          <span style={{ color: '#7B1FA2', fontWeight: 800, ...sMono }}>{cfg.referralPts} pts</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={{ color: '#9E9E9E', fontWeight: 600 }}>Encuestas diarias</span>
          <span style={{ color: '#1565C0', fontWeight: 800, ...sMono }}>{cfg.surveyDaily}/día · {cfg.surveyPts} pts</span>
        </div>
      </div>

      {/* Fuel Prices */}
      <div style={aSec}>Precios de Combustible</div>
      <div style={aCard}>
        {[
          { name: 'Súper', price: cfg.fuelPrices?.super ?? 0, color: '#E65100' },
          { name: 'Regular', price: cfg.fuelPrices?.regular ?? 0, color: '#2E7D32' },
          { name: 'Diésel', price: cfg.fuelPrices?.diesel ?? 0, color: '#1565C0' },
        ].map((f, i) => (
          <div key={f.name} style={{ ...row, borderBottom: i < 2 ? `1px solid ${AT.border}` : 'none' }}>
            <span style={{ color: f.color, fontWeight: 700 }}>⛽ {f.name}</span>
            <span style={{ color: '#fff', fontWeight: 800, ...sMono }}>Q{f.price.toFixed(2)}/gal</span>
          </div>
        ))}
        <button
          onClick={openPriceModal}
          style={{
            marginTop: 14, width: '100%', padding: '11px 16px',
            background: 'transparent', border: `1px solid ${AT.border}`,
            borderRadius: 12, color: '#FBBC04',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✏️ Editar precios
        </button>
      </div>

      {/* Tiers */}
      <div style={aSec}>Niveles (Tiers)</div>
      <div style={aCard}>
        <div style={row}>
          <span style={{ color: '#FBBC04', fontWeight: 700 }}>🟡 ORO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>0 – {(cfg.tiers?.platino?.gal || 150) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>💎 PLATINO</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.platino?.gal || 150} – {(cfg.tiers?.black?.gal || 500) - 1} gal</span>
        </div>
        <div style={row}>
          <span style={{ color: '#9E9E9E', fontWeight: 700 }}>🖤 BLACK</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{cfg.tiers?.black?.gal || 500}+ gal</span>
        </div>
        {cfg.tiers?.platino && (
          <>
            <div style={{ height: 1, background: AT.border, margin: '8px 0' }} />
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>PLATINO desc/galón</span>
              <span style={{ ...sMono, color: '#64B5F6' }}>Q{cfg.tiers.platino.discGal.toFixed(2)}</span>
            </div>
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>PLATINO desc canje</span>
              <span style={{ ...sMono, color: '#64B5F6' }}>{Math.round(cfg.tiers.platino.discRedeem * 100)}%</span>
            </div>
            <div style={row}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>BLACK desc/galón</span>
              <span style={{ ...sMono, color: '#CE93D8' }}>Q{cfg.tiers.black.discGal.toFixed(2)}</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: '#9E9E9E', fontWeight: 600 }}>BLACK desc canje</span>
              <span style={{ ...sMono, color: '#CE93D8' }}>{Math.round(cfg.tiers.black.discRedeem * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {/* Degradation */}
      <div style={aSec}>Degradación por Inactividad</div>
      <div style={aCard}>
        {(cfg.degrad || []).map((d, i) => (
          <div key={i} style={{ marginBottom: i < (cfg.degrad || []).length - 1 ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6, color: d.tier === 'BLACK' ? '#CE93D8' : d.tier === 'PLATINO' ? '#64B5F6' : '#FFB74D' }}>{d.tier}</div>
            {d.rules.map((r, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                <span style={{ color: '#aaa', fontWeight: 700 }}>{r.days} días</span>
                <span style={{ color: '#EF5350', fontWeight: 600 }}>{r.effect}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: '#2E7D32', fontWeight: 700 }}>✅ Cualquier compra (hasta Q10) resetea el reloj</div>
      </div>

      {/* ─── Modal: editar precios de combustible ─── */}
      {showPriceModal && (
        <div
          onClick={closePriceModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: AT.bg, border: `1px solid ${AT.border}`,
              borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
              Editar precios de combustible
            </div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>
              Rango válido: Q1.00 a Q100.00 por galón
            </div>

            {[
              { k: 'super', label: 'Súper', color: '#E65100' },
              { k: 'regular', label: 'Regular', color: '#2E7D32' },
              { k: 'diesel', label: 'Diésel', color: '#1565C0' },
            ].map((f) => {
              const err = fieldError(priceForm[f.k]);
              return (
                <div key={f.k} style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 800,
                    color: f.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
                  }}>
                    ⛽ {f.label}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    required
                    value={priceForm[f.k]}
                    onChange={(e) => setPriceForm((p) => ({ ...p, [f.k]: e.target.value }))}
                    disabled={saving}
                    style={{
                      ...inputStyleDark,
                      border: `1.5px solid ${err ? '#EF5350' : '#3A3A3A'}`,
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>Q por galón</div>
                  {err && (
                    <div style={{ fontSize: 11, color: '#EF5350', marginTop: 4, fontWeight: 600 }}>
                      {err}
                    </div>
                  )}
                </div>
              );
            })}

            {saveError && (
              <div style={{
                background: 'rgba(239,83,80,.1)', border: '1px solid rgba(239,83,80,.3)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 16,
                fontSize: 12, color: '#EF5350', fontWeight: 600,
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={closePriceModal}
                disabled={saving}
                style={{
                  flex: 1, padding: '14px 16px',
                  background: 'transparent', border: `1px solid ${AT.border}`,
                  borderRadius: 14, color: '#9E9E9E',
                  fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={savePrices}
                disabled={formInvalid || saving}
                style={{
                  flex: 1, padding: '14px 16px',
                  background: formInvalid || saving ? '#3A3A3A' : '#FBBC04',
                  border: 'none', borderRadius: 14,
                  color: formInvalid || saving ? '#777' : '#0D0D0D',
                  fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
                  cursor: formInvalid || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
