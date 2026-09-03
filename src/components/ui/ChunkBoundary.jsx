// src/components/ui/ChunkBoundary.jsx
// Límite de error para el code splitting (3-sep-2026). Cuando un chunk
// perezoso no carga (deploy entre medio: el hash viejo ya no existe y
// Vercel responde el index.html; o sin red), React.lazy lanza y, sin un
// límite, React 18 DESMONTA todo el árbol → pantalla en blanco (reporte
// del dueño al abrir Vehículos tras un deploy). Aquí: (1) primer fallo →
// recarga automática con guard de 3 min (trae los hashes vigentes);
// (2) si vuelve a fallar (sin red) → aviso con botón Reintentar, con la
// BottomNav intacta porque el límite vive dentro del área de pantalla.
import { Component } from 'react';
import { BRAND_ORANGE } from '../../constants/styles';

const KEY = 'pp_chunk_boundary_reload';
const isChunkError = (err) => /import|chunk|module|fetch|preload|Loading/i.test(String(err && (err.message || err)));

export default class ChunkBoundary extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) {
    console.warn('[ChunkBoundary]', err && err.message);
    if (!isChunkError(err)) return;
    let last = 0;
    try { last = +sessionStorage.getItem(KEY) || 0; } catch { /* sin storage */ }
    if (Date.now() - last < 180000) return; // ya se recargó hace poco: no bucle
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* sin storage */ }
    window.location.reload();
  }
  // Al cambiar de pantalla, dar otra oportunidad al chunk
  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const { dark } = this.props;
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: dark ? '#fff' : '#0D0D0D' }}>No se pudo cargar esta parte</div>
        <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.55)' : '#9E9E9E', lineHeight: 1.55, maxWidth: 280, margin: '8px 0 18px' }}>
          Puede ser una actualización de la app o falta de conexión. Toca para volver a intentarlo.
        </div>
        <button onClick={() => window.location.reload()} style={{
          padding: '13px 26px', borderRadius: 15, border: 'none', cursor: 'pointer',
          background: BRAND_ORANGE, color: '#fff', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800,
        }}>Reintentar</button>
      </div>
    );
  }
}
