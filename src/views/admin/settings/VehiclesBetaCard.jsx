// src/views/admin/settings/VehiclesBetaCard.jsx
// F6 Etapa 1 — Tarjeta de Admin → Configuración para la BETA de la
// ventana Vehículos: buscar un miembro (sobre las fichas ya cargadas
// del admin) y agregarlo/quitarlo de la lista cerrada, más el
// interruptor de rollout GLOBAL. Todo por admin_set_vehicles_beta
// (sesión de admin STRICT + auditoría server-side).
import { useEffect, useMemo, useState } from 'react';
import { adminTheme as AT, inputStyleDark } from '../../../constants/styles';
import { adminListVehiclesBeta, adminSetVehiclesBeta } from '../../../services/vehicleService';

export default function VehiclesBetaCard({ custs, loggedAdmin, fire, card, cardTitle, cardHint }) {
  const [info, setInfo] = useState(null); // { enabled, members[] } | null=cargando | false=RPC ausente
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminListVehiclesBeta().then(({ data, error }) => {
      if (error || !data?.ok) { setInfo(false); return; }
      setInfo({ enabled: !!data.enabled, members: data.members || [] });
    });
  };
  useEffect(load, []);

  const audit = {
    adminId: loggedAdmin?.id, adminName: loggedAdmin?.name,
    adminEmail: loggedAdmin?.email, reasonText: null,
  };

  const inBeta = useMemo(() => new Set((info?.members || []).map(m => m.member_id)), [info]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return (custs || [])
      .filter(c => !inBeta.has(c.id) && (
        c.name?.toLowerCase().includes(s) || c.phone?.includes(s) || c.cardId?.toLowerCase().includes(s)
      ))
      .slice(0, 5);
  }, [q, custs, inBeta]);

  const change = async (args, okMsg) => {
    if (busy) return;
    setBusy(true);
    const { error } = await adminSetVehiclesBeta({ ...args, audit });
    setBusy(false);
    if (error) { fire('Error: ' + (error.message || 'no se pudo aplicar'), 'error'); return; }
    fire(okMsg, 'success');
    setQ('');
    load();
  };

  return (
    <div style={card}>
      <div style={cardTitle}>Beta de Vehículos (F6)</div>
      <div style={cardHint}>
        La ventana nueva de Vehículos solo la ven los miembros de esta lista.
        El interruptor global la habilita para TODOS (lanzamiento de la función).
      </div>

      {info === null && <div style={{ fontSize: 12, color: '#777', fontWeight: 600 }}>Cargando...</div>}
      {info === false && (
        <div style={{ fontSize: 12, color: '#EF5350', fontWeight: 600, lineHeight: 1.5 }}>
          Falta ejecutar la migración 20260815_f6e1 en el SQL Editor.
        </div>
      )}

      {info && (
        <>
          {/* Interruptor global */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#E0E0E0' }}>Disponible para todos</div>
            <button disabled={busy}
              onClick={() => change({ enabled: !info.enabled }, info.enabled ? 'Beta cerrada al público' : 'Vehículos habilitado para TODOS')}
              style={{
                padding: '7px 14px', borderRadius: 18, border: 'none', cursor: 'pointer',
                background: info.enabled ? 'rgba(46,125,50,.25)' : 'rgba(255,255,255,.08)',
                color: info.enabled ? '#69F0AE' : '#9E9E9E',
                fontFamily: "'DM Sans'", fontWeight: 800, fontSize: 11.5,
              }}>{info.enabled ? 'ACTIVADO' : 'APAGADO'}</button>
          </div>

          {/* Buscar y agregar probador */}
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar miembro (nombre, teléfono o tarjeta)"
            style={{ ...inputStyleDark, width: '100%', boxSizing: 'border-box', fontSize: 12.5 }} />
          {results.map(c => (
            <button key={c.id} disabled={busy}
              onClick={() => change({ memberId: c.id, add: true }, `${c.name} agregado a la beta`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                marginTop: 6, padding: '9px 12px', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'transparent', color: '#E0E0E0', cursor: 'pointer',
                fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 700, textAlign: 'left',
              }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ color: '#80CBC4', fontWeight: 800, flexShrink: 0, marginLeft: 8 }}>+ Agregar</span>
            </button>
          ))}

          {/* Probadores actuales */}
          {info.members.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: '#777', textTransform: 'uppercase', marginBottom: 6 }}>
                Probadores ({info.members.length})
              </div>
              {info.members.map(m => (
                <div key={m.member_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', borderBottom: `1px solid ${AT.border}`, fontSize: 12.5,
                }}>
                  <span style={{ color: '#E0E0E0', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  <button disabled={busy}
                    onClick={() => change({ memberId: m.member_id, add: false }, `${m.name} fuera de la beta`)}
                    style={{
                      border: 'none', background: 'transparent', color: '#EF5350', cursor: 'pointer',
                      fontFamily: "'DM Sans'", fontSize: 11.5, fontWeight: 800, flexShrink: 0, marginLeft: 8,
                    }}>Quitar</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
