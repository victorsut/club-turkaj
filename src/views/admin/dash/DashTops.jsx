// src/views/admin/dash/DashTops.jsx
// Rankings del INICIO del panel — extraídos de AdminDash.jsx en la
// división del 15-ago-2026 (regla de 500 líneas), lógica VERBATIM:
// (1) Top 10 GENERAL por galones acumulados del programa (multi-column
// CSS con flujo vertical); (2) Top 10 POR ESTACIÓN vía RPC
// get_station_top_members (migración 20260806f) — sin la migración el
// RPC no existe y la sección se omite sin romper nada.
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { sMono, adminTheme as AT, BRAND_ORANGE } from '../../../constants/styles';
import { getAdminToken } from '../../../services/sessionTokens';
import Badge from '../../../components/ui/Badge';

export default function DashTops({ custs, gT, setSel, setScr }) {
  // Top 10 POR ESTACIÓN (RPC get_station_top_members, migración
  // 20260806f) — sin migración el RPC no existe y la sección se omite.
  const [stationTop, setStationTop] = useState(null);
  useEffect(() => {
    if (!sb) return;
    const tok = getAdminToken()?.token;
    if (!tok) return;
    sb.rpc('get_station_top_members', { p_session_token: tok, p_limit: 10 })
      .then(({ data, error }) => {
        if (error) { console.warn('[Dash] top estaciones:', error.message); return; }
        if (Array.isArray(data)) setStationTop(data);
      });
  }, []);

  // ===== estilos (FORMATO GENERAL Admin v2 — mismos de AdminDash) =====
  const card = { background: AT.card, borderRadius: 18, border: `1px solid ${AT.border}`, padding: 18 };
  const rowCard = { ...card, height: '100%', boxSizing: 'border-box' };
  const cardTitle = { fontSize: 13.5, fontWeight: 800, color: '#E0E0E0', marginBottom: 12 };

  return (
    <>
      {/* ── Top 10 GENERAL (galones acumulados del programa) —
          máx 5 columnas en monitor, flujo VERTICAL (el 2º debajo
          del 1º): multi-column CSS, no grid ── */}
      <div style={{ ...card, padding: '18px 6px 8px', marginBottom: 14 }}>
        <div style={{ ...cardTitle, padding: '0 14px' }}>Top 10 general — Galones comprados</div>
        <div className="pp-top-cols" style={{ padding: '0 8px' }}>
          {[...custs].sort((a, b) => b.gallons - a.gallons).slice(0, 10).map((c, i) => {
            const t = gT(c.gallons);
            return (
              <div key={c.id} onClick={() => { setSel(c); setScr('det'); }} style={{
                display: 'flex', alignItems: 'center', padding: '11px 8px',
                borderBottom: `1px solid ${AT.border}`, cursor: 'pointer',
              }}>
                <div style={{
                  width: 26, textAlign: 'center', marginRight: 10, ...sMono,
                  fontSize: 13, fontWeight: 800,
                  color: i < 3 ? BRAND_ORANGE : '#666',
                }}>
                  {i + 1}
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, marginRight: 12, flexShrink: 0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Badge t={t} /></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...sMono, fontSize: 14, fontWeight: 800, color: '#fff' }}>{Math.round(c.gallons).toLocaleString('en-US')}<span style={{ fontSize: 10, color: '#777', fontWeight: 600 }}> gal</span></div>
                  <div style={{ fontSize: 10, color: '#777', ...sMono }}>Q{Math.round(c.spent).toLocaleString('en-US')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top 10 POR ESTACIÓN (RPC get_station_top_members) — una
          tarjeta por estación, agregado de las facturas registradas.
          Sin la migración 20260806f el RPC no existe y la sección se
          omite sin romper nada. ── */}
      {stationTop?.length > 0 && (
        <div className="pp-dash-cols pp-dash-cols-3">
          {stationTop.map(st => (
            <div key={st.id} style={{ ...rowCard, padding: '18px 14px 8px' }}>
              <div style={{ ...cardTitle, padding: '0 4px' }}>Top 10 — {st.name}</div>
              {(!st.top || st.top.length === 0) && (
                <div style={{ fontSize: 12, color: '#777', fontWeight: 600, padding: '0 4px 12px' }}>
                  Sin compras registradas en esta estación.
                </div>
              )}
              {(st.top || []).map((r, i) => {
                const c = custs.find(x => x.id === r.member_id) || null;
                const t = gT(r.member_gallons ?? c?.gallons ?? 0);
                return (
                  <div key={r.member_id || i}
                    onClick={() => { if (c) { setSel(c); setScr('det'); } }}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '10px 4px',
                      borderBottom: i < st.top.length - 1 ? `1px solid ${AT.border}` : 'none',
                      cursor: c ? 'pointer' : 'default',
                    }}>
                    <div style={{
                      width: 24, textAlign: 'center', marginRight: 8, ...sMono,
                      fontSize: 12.5, fontWeight: 800,
                      color: i < 3 ? BRAND_ORANGE : '#666',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, marginRight: 10, flexShrink: 0 }}>
                      {(r.member_name || '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#E0E0E0' }}>{r.member_name}</div>
                      <div style={{ fontSize: 10, color: '#9E9E9E', marginTop: 1 }}>{r.purchases} compras</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#fff' }}>{Math.round(r.gallons).toLocaleString('en-US')}<span style={{ fontSize: 9.5, color: '#777', fontWeight: 600 }}> gal</span></div>
                      <div style={{ fontSize: 10, color: '#777', ...sMono }}>Q{Math.round(r.amount).toLocaleString('en-US')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
