// src/views/admin/AdminShell.jsx
// Admin v2 (6-ago-2026, pedido del dueño) — shell del panel con MENÚ
// LATERAL, optimizado para computadora desde el login: sidebar fija
// con grupos clasificados (Programa / Promociones / Personal /
// Sistema), colapsada a solo iconos en tableta y drawer con
// hamburguesa en celular (la BottomNav dejó de existir en el admin).
// FORMATO GENERAL: flat, minimalista, iconos SVG — sin emojis.
// La navegación sigue siendo scr/setScr — las pantallas internas
// (MemberDetail, Rules, etc.) y sus botones de volver no cambian.
import { useState } from 'react';
import { adminTheme as AT, BRAND_ORANGE } from '../../constants/styles';
import {
  House, Users, Gift, TicketStar, Tag, Megaphone, Percent,
  IdCard, Lock, Gear, Fuel, Clipboard, Info, Menu, Logout, XMark,
  ChartBar, StarLine, Ticket, Shield, Cake,
} from '../../components/ui/Icons';

const NAV = [
  { group: null, items: [
    { id: 'dash', label: 'Inicio', Icon: House },
  ] },
  // 8-ago: Catálogo de Canjes absorbe la gestión de premios (antes en
  // "Premios y Festivos", que queda solo como Festivos).
  { group: 'Programa', items: [
    { id: 'mem',     label: 'Miembros',           Icon: Users },
    { id: 'cat',     label: 'Catálogo de Canjes', Icon: Gift },
    { id: 'premios', label: 'Festivos',           Icon: Cake },
    { id: 'raf',     label: 'Rifa',               Icon: TicketStar },
  ] },
  // Análisis (8-ago-2026): consultas de SOLO LECTURA sobre el
  // consumo — separadas de la gestión (Programa) y de la
  // configuración (Sistema). Integridad = investigación interna.
  { group: 'Análisis', items: [
    { id: 'anCli', label: 'Clientes',       Icon: ChartBar },
    { id: 'anOps', label: 'Operadores',     Icon: StarLine },
    { id: 'anPro', label: 'Promos y Rifas', Icon: Ticket },
    { id: 'anInt', label: 'Integridad',     Icon: Shield },
  ] },
  { group: 'Promociones', items: [
    { id: 'promos',     label: 'Promociones',     Icon: Megaphone },
    { id: 'promorules', label: 'Motor de promos', Icon: Percent },
  ] },
  { group: 'Personal', items: [
    { id: 'ops',    label: 'Operadores',      Icon: IdCard },
    { id: 'admins', label: 'Administradores', Icon: Lock },
  ] },
  { group: 'Sistema', items: [
    { id: 'cfg',      label: 'Configuración',       Icon: Gear },
    { id: 'stations', label: 'Estaciones y Tiendas', Icon: Fuel },
    { id: 'audit',    label: 'Auditoría',            Icon: Clipboard },
    { id: 'rules',    label: 'Reglas y términos',    Icon: Info },
  ] },
];

// Pantallas internas → entrada del menú que queda activa
const ACTIVE_ALIAS = { det: 'mem' };

export default function AdminShell({ ctx, children }) {
  const { scr, setScr, loggedAdmin, logout } = ctx;
  const [drawer, setDrawer] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const active = ACTIVE_ALIAS[scr] || scr;
  const activeLabel = NAV.flatMap(g => g.items).find(i => i.id === active)?.label || 'Panel';
  const adminName = loggedAdmin?.name || 'Administrador';

  // Cierre ANIMADO del drawer (regla D35: la capa cierra con la
  // animación inversa a la apertura) — desmonta a los 200ms.
  const closeDrawer = () => {
    if (drawerClosing) return;
    setDrawerClosing(true);
    setTimeout(() => { setDrawer(false); setDrawerClosing(false); }, 200);
  };

  const go = (id) => { setScr(id); if (drawer) closeDrawer(); };

  // Lista de navegación (la comparten la sidebar y el drawer móvil)
  const navList = (compactHost) => (
    <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>
      {NAV.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 6 }}>
          {g.group && (
            <div className="pp-ash-kicker" style={{
              padding: '12px 14px 6px', fontSize: 10, fontWeight: 800,
              letterSpacing: 1.5, textTransform: 'uppercase', color: '#666',
            }}>
              {g.group}
            </div>
          )}
          {g.items.map(({ id, label, Icon }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)} title={label} className="pp-ash-item" style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', marginBottom: 2, borderRadius: 12,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: on ? 'rgba(250,84,8,.14)' : 'transparent',
                color: on ? BRAND_ORANGE : '#9E9E9E',
                fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: on ? 800 : 600,
              }}>
                <span style={{ display: 'flex', flexShrink: 0 }}><Icon /></span>
                <span className="pp-ash-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: on ? '#fff' : undefined }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px 14px', borderBottom: `1px solid ${AT.border}` }}>
      <img src="/logo.png" alt="Puntos Plus" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
      <div className="pp-ash-brandtxt" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
          Puntos<span style={{ color: BRAND_ORANGE }}>Plus</span>
        </div>
        <div style={{ fontSize: 10, color: '#777', fontWeight: 700, letterSpacing: .5, whiteSpace: 'nowrap' }}>ADMINISTRACIÓN</div>
      </div>
    </div>
  );

  const userFoot = (
    <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${AT.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 10px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(250,84,8,.18)', color: BRAND_ORANGE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, fontFamily: "'DM Sans'",
        }}>
          {adminName.charAt(0)}
        </div>
        <div className="pp-ash-usertxt" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminName}</div>
          <div style={{ fontSize: 10, color: '#777', fontWeight: 700 }}>Administrador</div>
        </div>
      </div>
      <button onClick={logout} title="Cerrar sesión" className="pp-ash-item" style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, border: `1px solid ${AT.border}`,
        background: 'transparent', color: '#EF5350', cursor: 'pointer',
        fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
      }}>
        <span style={{ display: 'flex', flexShrink: 0 }}><Logout /></span>
        <span className="pp-ash-label">Cerrar sesión</span>
      </button>
    </div>
  );

  return (
    <div className="pp-ash">
      {/* ── Sidebar (desktop etiquetas / tableta iconos) ── */}
      <aside className="pp-ash-side" style={{ background: '#1A1A1A', borderRight: `1px solid ${AT.border}` }}>
        {brand}
        {navList()}
        {userFoot}
      </aside>

      {/* ── Contenido ── */}
      <div className="pp-ash-main">
        {/* Topbar móvil: hamburguesa + sección actual */}
        <div className="pp-ash-topbar" style={{
          position: 'sticky', top: 0, zIndex: 120,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: '#1A1A1A',
          borderBottom: `1px solid ${AT.border}`,
        }}>
          <button onClick={() => setDrawer(true)} aria-label="Abrir menú" style={{
            width: 38, height: 38, borderRadius: 10, border: `1px solid ${AT.border}`,
            background: AT.card, color: '#E0E0E0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Menu />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeLabel}</div>
          </div>
          <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 9 }} />
        </div>

        <div className="pp-ash-content">
          {children}
        </div>
      </div>

      {/* ── Drawer móvil (abre y cierra animado) ── */}
      {drawer && (
        <div onClick={closeDrawer} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,.6)',
          animation: drawerClosing ? 'ppFadeOut .2s ease forwards' : 'ppFade .2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 264, maxWidth: '82vw', height: '100%',
            background: '#1A1A1A', borderRight: `1px solid ${AT.border}`,
            display: 'flex', flexDirection: 'column',
            animation: drawerClosing
              ? 'ppDrawerOut .2s ease-in forwards'
              : 'ppDrawerIn .22s cubic-bezier(.32, .72, .33, 1)',
          }}>
            <div style={{ position: 'relative' }}>
              {brand}
              <button onClick={closeDrawer} aria-label="Cerrar menú" style={{
                position: 'absolute', right: 10, top: 20,
                width: 32, height: 32, borderRadius: 9, border: 'none',
                background: 'rgba(255,255,255,.06)', color: '#9E9E9E',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XMark />
              </button>
            </div>
            {navList()}
            {userFoot}
          </div>
        </div>
      )}
    </div>
  );
}
