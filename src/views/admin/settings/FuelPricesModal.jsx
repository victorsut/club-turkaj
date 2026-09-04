// src/views/admin/settings/FuelPricesModal.jsx
// Flujo completo de edición de precios de combustible — extraído de
// Settings.jsx en la división del 15-ago-2026 (regla de 500 líneas).
// Encapsula los DOS pasos: (1) modal de precios con validación
// Q1.00–Q100.00 y (2) ReasonModal de motivo (auditoría F0.3.3) que
// ejecuta updateFuelPrices; en error el modal de precios reabre con
// el formulario intacto. Settings lo monta condicionalmente: el
// formulario se siembra desde cfg al montar (equivale al viejo
// openPriceModal) y onClose desmonta todo el flujo.
// D4 (4-sep): con `station` edita los precios PROPIOS de esa estación
// (update_station_fuel_prices; "Usar globales" los borra) y refleja el
// cambio en ctx.stations; sin `station` sigue siendo el global.
import { useState, useEffect } from 'react';
import { adminTheme as AT, inputStyleDark } from '../../../constants/styles';
import { updateFuelPrices, updateStationFuelPrices } from '../../../services/adminRpcServices';
import ReasonModal from '../../../components/ui/ReasonModal';

export default function FuelPricesModal({ cfg, setCfg, fire, loggedAdmin, onClose, station = null, setStations = null }) {
  const [showPriceModal, setShowPriceModal] = useState(true);
  const [showReasonModal, setShowReasonModal] = useState(false);
  // Siembra al montar = el viejo openPriceModal (el componente se
  // desmonta al cerrar, así que cada apertura re-siembra desde cfg).
  const seed = station?.fuelPrices || cfg.fuelPrices;
  const [priceForm, setPriceForm] = useState(() => ({
    super: String(seed?.super ?? 0),
    regular: String(seed?.regular ?? 0),
    diesel: String(seed?.diesel ?? 0),
  }));
  // D4: "Usar globales" en una estación = borrar su precio propio
  const [clearing, setClearing] = useState(false);
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

  const closePriceModal = () => {
    if (saving) return;
    onClose();
  };

  // Esc cierra el modal (a menos que estemos guardando).
  useEffect(() => {
    if (!showPriceModal) return;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) closePriceModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPriceModal, saving]);

  // PASO 1: valida los precios y abre el ReasonModal (cierra el de
  // precios sin tocar priceForm, para poder reabrirlo si el RPC falla).
  const openReasonStep = (clear = false) => {
    if (!clear && formInvalid) return;
    setClearing(clear);
    setSaveError('');
    setShowPriceModal(false);
    setShowReasonModal(true);
  };

  // PASO 2: recibe el motivo del ReasonModal y ejecuta el RPC con
  // auditoría. En error reabre el modal de precios con priceForm intacto.
  const confirmSaveWithReason = async (reason) => {
    // Guard: sin admin logueado no se audita ni se guarda (la épica
    // F0.3 exige auditoría obligatoria; no degradar a legacy).
    if (!loggedAdmin || !loggedAdmin.id) {
      setShowReasonModal(false);
      fire('Error: sesion admin no disponible. Cerra sesion y volve a ingresar.');
      onClose();
      return;
    }

    setSaving(true);
    setSaveError('');

    const payload = {
      super: parseFloat(priceForm.super),
      regular: parseFloat(priceForm.regular),
      diesel: parseFloat(priceForm.diesel),
    };

    const audit = {
      adminId: loggedAdmin.id,
      adminName: loggedAdmin.name,
      adminEmail: loggedAdmin.email,
      reasonText: reason,
    };

    try {
      const { data, error } = station
        ? await updateStationFuelPrices(station.id, clearing ? null : payload, audit)
        : await updateFuelPrices(payload, audit);

      if (error) {
        // RPC falló: cerrar ReasonModal, reabrir Modal de precios
        // con el error visible.
        setShowReasonModal(false);
        setShowPriceModal(true);
        setSaveError(error.message || 'Error al guardar los precios');
        fire('Error al guardar: ' + (error.message || 'desconocido'));
        return;
      }

      if (!data) {
        setShowReasonModal(false);
        setShowPriceModal(true);
        setSaveError('No se recibieron datos del servidor');
        fire('Error al guardar: respuesta vacia del servidor');
        return;
      }

      if (data.error) {
        setShowReasonModal(false);
        setShowPriceModal(true);
        setSaveError(data.error);
        fire('Error al guardar: ' + data.error);
        return;
      }

      // Éxito: reflejar en cfg (global) o en ctx.stations (estación),
      // cerrar todo el flujo, toast de éxito.
      if (station) {
        setStations?.(prev => prev.map(s => s.id === station.id ? { ...s, fuelPrices: data.fuel_prices || null } : s));
        fire(clearing ? `${station.name} vuelve a los precios globales` : `Precios de ${station.name} actualizados`);
      } else {
        setCfg(prev => ({ ...prev, fuelPrices: data }));
        fire('Precios actualizados');
      }
      setShowReasonModal(false);
      onClose();
    } catch (err) {
      setShowReasonModal(false);
      setShowPriceModal(true);
      setSaveError(err.message || 'Error inesperado');
      fire('Error al guardar: ' + (err.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
              {station ? `Precios de ${station.name}` : 'Editar precios de combustible'}
            </div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>
              {station
                ? (station.fuelPrices ? 'Precio propio de esta estación · ' : 'Hoy usa los globales · ') + 'Rango Q1.00 a Q100.00'
                : 'Rango válido: Q1.00 a Q100.00 por galón'}
            </div>

            {[
              { k: 'super', label: 'Súper', color: '#FF8F00' },
              { k: 'regular', label: 'Regular', color: '#81C784' },
              { k: 'diesel', label: 'Diésel', color: '#64B5F6' },
            ].map((f) => {
              const err = fieldError(priceForm[f.k]);
              return (
                <div key={f.k} style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block', fontSize: 12, fontWeight: 800,
                    color: f.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
                  }}>
                    {f.label}
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

            {station?.fuelPrices && (
              <button onClick={() => openReasonStep(true)} disabled={saving} style={{
                width: '100%', marginBottom: 10, padding: '11px 16px',
                background: 'transparent', border: `1px dashed ${AT.border}`, borderRadius: 14,
                color: '#9E9E9E', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                Usar los precios globales en esta estación
              </button>
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
                onClick={() => openReasonStep(false)}
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

      {/* ─── Modal: motivo del cambio (auditoría F0.3.3) ─── */}
      <ReasonModal
        open={showReasonModal}
        onClose={() => { setShowReasonModal(false); onClose(); }}
        onConfirm={confirmSaveWithReason}
        actionLabel={station ? (clearing ? `Volver a precios globales en ${station.name}` : `Actualizar precios de ${station.name}`) : 'Actualizar precios de combustible'}
        loading={saving}
      />
    </>
  );
}
