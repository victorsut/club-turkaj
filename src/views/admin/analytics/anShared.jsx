// src/views/admin/analytics/anShared.jsx
// Utilidades compartidas del grupo ANÁLISIS (8-ago-2026): llamada a
// los RPCs report_* con sesión de admin, estilos de chips (mismos de
// la vista Miembros), formato de números en-US y exportación CSV.
import { sb } from '../../../lib/supabaseClient';
import { adminTheme as AT } from '../../../constants/styles';
import { getAdminToken } from '../../../services/sessionTokens';

// ── Llamada estándar a un RPC de reporte. Los RPCs devuelven
// jsonb; un objeto {error} server-side también se trata como error. ──
export async function rpcReport(name, params = {}) {
  const tok = getAdminToken()?.token;
  if (!sb || !tok) return { error: 'Sin sesión de administrador' };
  const { data, error } = await sb.rpc(name, { p_session_token: tok, ...params });
  if (error) return { error: error.message };
  if (data && !Array.isArray(data) && data.error) return { error: data.error };
  return { data };
}

// ── Formato (regla del proyecto: decimales con punto, miles con
// coma — toLocaleString en-US explícito) ──
export const fmtInt = (n) => Math.round(+n || 0).toLocaleString('en-US');
export const fmtGal = (n) => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });

// ── Estilos compartidos (mismos patrones de Miembros) ──
export const groupLbl = { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#777', marginBottom: 6 };
export const chip = (on) => ({
  padding: '7px 14px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
  border: `1px solid ${on ? '#FBBC04' : AT.border}`,
  background: on ? '#FBBC04' : AT.card,
  color: on ? '#0D0D0D' : '#9E9E9E',
  fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700,
});
export const chipSoft = (on) => ({
  ...chip(on),
  background: on ? 'rgba(251,188,4,.15)' : AT.card,
  color: on ? '#FBBC04' : '#9E9E9E',
});
export const cardBox = {
  background: AT.card, border: `1px solid ${AT.border}`,
  borderRadius: 18, padding: 16, marginBottom: 16,
};

// ── Encabezado estándar de las vistas de Análisis ──
export function AnHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 21, fontWeight: 800, color: '#fff' }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9E9E9E', marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ── Estados de carga / vacío / error ──
export function AnStatus({ loading, error, empty, emptyMsg = 'Sin datos en el período elegido' }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13, fontWeight: 700 }}>Cargando consulta...</div>;
  if (error) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#E57373' }}>No se pudo cargar la consulta</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#777', marginTop: 4 }}>{error}</div>
    </div>
  );
  if (empty) return <div style={{ textAlign: 'center', padding: 40, color: '#777', fontSize: 13, fontWeight: 700 }}>{emptyMsg}</div>;
  return null;
}

// ── Exportar CSV (BOM para que Excel respete acentos) ──
export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = String.fromCharCode(0xFEFF) + [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CsvButton({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 14px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
      border: `1px solid ${AT.border}`, background: AT.card,
      color: disabled ? '#555' : '#9E9E9E',
      fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, marginLeft: 'auto',
    }}>
      Exportar CSV
    </button>
  );
}
