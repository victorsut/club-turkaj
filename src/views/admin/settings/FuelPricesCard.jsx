// src/views/admin/settings/FuelPricesCard.jsx
// D4 (4-sep-2026) — Tarjeta "Precios de Combustible" de Admin →
// Configuración, extraída de Settings.jsx: precios GLOBALES (como
// siempre) + interruptor "Precios por estación". Con el modo encendido,
// cada estación lista sus precios propios (o "usa los globales") con su
// botón Editar; el modal FuelPricesModal atiende ambos casos (global o
// una estación) con la misma validación y el motivo auditado. El
// interruptor va por set_fuel_prices_mode (sesión admin STRICT +
// auditoría). El precio que aplica una compra lo decide el servidor
// (fuel_price_for): estación propia si el modo está encendido, si no
// el global.
import { useState } from 'react';
import { sMono } from '../../../constants/styles';
import { setFuelPricesMode } from '../../../services/adminRpcServices';
import FuelPricesModal from './FuelPricesModal';

export const FUELS = [
  { k: 'super', name: 'Súper', color: '#FF8F00' },
  { k: 'regular', name: 'Regular', color: '#81C784' },
  { k: 'diesel', name: 'Diésel', color: '#64B5F6' },
];

export default function FuelPricesCard({ cfg, setCfg, stations, setStations, loggedAdmin, fire, card, cardTitle, cardHint, row, ghostCardBtn, border }) {
  const [modal, setModal] = useState(null); // null | { station: null } | { station }
  const [savingMode, setSavingMode] = useState(false);
  const perStation = !!cfg.fuelPricesPerStation;
  const global = cfg.fuelPrices || { super: 0, regular: 0, diesel: 0 };

  const toggleMode = async () => {
    if (savingMode) return;
    if (!loggedAdmin?.id) { fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.', 'error'); return; }
    const next = !perStation;
    setSavingMode(true);
    const { data, error } = await setFuelPricesMode(next, {
      adminId: loggedAdmin.id, adminName: loggedAdmin.name, adminEmail: loggedAdmin.email,
    });
    setSavingMode(false);
    if (error) { fire('Error: ' + error.message, 'error'); return; }
    if (data?.error) { fire(data.error, 'error'); return; }
    setCfg(p => ({ ...p, fuelPricesPerStation: !!data?.per_station }));
    fire(next
      ? 'Precios POR ESTACIÓN activados — las estaciones sin precio propio siguen usando los globales'
      : 'Precios globales para todas las estaciones', 'success');
  };

  const priceRows = (prices, keyPrefix) => FUELS.map((f, i) => (
    <div key={keyPrefix + f.k} style={{ ...row, borderBottom: i < FUELS.length - 1 ? `1px solid ${border}` : 'none' }}>
      <span style={{ color: f.color, fontWeight: 700 }}>{f.name}</span>
      <span style={{ color: '#fff', fontWeight: 800, ...sMono }}>Q{(+prices?.[f.k] || 0).toFixed(2)}/gal</span>
    </div>
  ));

  return (
    <div style={card}>
      <div style={cardTitle}>Precios de Combustible</div>

      {/* ── Interruptor D4 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>Precios por estación</div>
          <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
            {perStation
              ? 'Cada estación puede tener su precio; sin precio propio usa los globales'
              : 'Apagado — los precios globales aplican en todas las estaciones'}
          </div>
        </div>
        <button onClick={toggleMode} disabled={savingMode} style={{
          padding: '8px 16px', borderRadius: 20, border: 'none', flexShrink: 0,
          background: savingMode ? '#3A3A3A' : perStation ? 'rgba(46,125,50,.25)' : 'rgba(255,255,255,.08)',
          color: savingMode ? '#777' : perStation ? '#69F0AE' : '#9E9E9E',
          fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 12,
          cursor: savingMode ? 'not-allowed' : 'pointer',
        }}>
          {savingMode ? '...' : perStation ? 'ACTIVADO' : 'APAGADO'}
        </button>
      </div>
      <div style={{ height: 1, background: border, margin: '0 0 8px' }} />

      {/* ── Globales ── */}
      <div style={{ ...cardHint, marginBottom: 4 }}>{perStation ? 'Precios globales (respaldo)' : 'Precios vigentes'}</div>
      {priceRows(global, 'g-')}
      <button onClick={() => setModal({ station: null })} style={{ ...ghostCardBtn('#FBBC04'), marginTop: 14 }}>
        Editar precios globales
      </button>

      {/* ── Por estación ── */}
      {perStation && (stations || []).map(s => (
        <div key={s.id} style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#E0E0E0' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: s.fuelPrices ? '#69F0AE' : '#777', marginTop: 2, fontWeight: 700 }}>
                {s.fuelPrices ? 'Precio propio' : 'Usa los globales'}
              </div>
            </div>
            <button onClick={() => setModal({ station: s })} style={{ ...ghostCardBtn('#FBBC04'), width: 'auto', padding: '8px 14px' }}>
              Editar
            </button>
          </div>
          {s.fuelPrices && <div style={{ marginTop: 4 }}>{priceRows(s.fuelPrices, s.id + '-')}</div>}
        </div>
      ))}

      {modal && (
        <FuelPricesModal
          cfg={cfg} setCfg={setCfg} fire={fire} loggedAdmin={loggedAdmin}
          station={modal.station} setStations={setStations}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
