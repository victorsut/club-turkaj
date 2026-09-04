// src/views/ScreenRouter.jsx
// Router de pantallas — extraído de App.jsx en la división del
// 15-ago-2026 (regla de 500 líneas), lógica VERBATIM. Concentra
// TODOS los imports de vistas (App.jsx ya no importa ninguna):
// los eager del camino crítico (logins de los 3 roles + vistas del
// cliente) y los React.lazy del code splitting por rol (14-ago).
// También exporta los arrays de la BottomNav (operatorNav/clientNav)
// porque sus iconos viven junto a las vistas que los usan.
import { lazy, Suspense } from 'react';
import LogoSpinner from '../components/ui/LogoSpinner';
import ChunkBoundary from '../components/ui/ChunkBoundary';
import { Fuel, Users, Gift, Ticket, House, TicketStar, Car } from '../components/ui/Icons';

// Auth Views
import ClientLogin from './client/ClientLogin';
import GoogleProfile from './client/GoogleProfile';
import OperatorLogin from './operator/OperatorLogin';
import AdminLogin from './admin/AdminLogin';

// Client Views
import ClientHome from './client/ClientHome';
import CompanySelect from './client/CompanySelect';
import Catalog from './shared/Catalog';
import ClientRaffle from './client/ClientRaffle';
import Rules from './shared/Rules';
import ClientMenu from './client/ClientMenu';
import ClientPromos from './client/ClientPromos';
import VehiclesScreen from './client/VehiclesScreen';

// ── Code splitting por ROL (14-ago) ─────────────────────────
// Las vistas de OPERADOR y ADMIN se cargan bajo demanda (React.lazy):
// el cliente — la audiencia masiva de la PWA — ya no descarga el panel
// ni html5-qrcode (solo lo usan los escáneres del operador). Los
// LOGINS de los 3 roles quedan EAGER (pantalla de entrada inmediata) y
// las vistas del cliente también (son su camino crítico). El fallback
// lo pinta el <Suspense> del render; si un chunk falla por un deploy
// entre medio, main.jsx recarga la página (vite:preloadError).

// Operator Views
const OpHome = lazy(() => import('./operator/OpHome'));
const OpClients = lazy(() => import('./operator/OpClients'));
const OpRedeem = lazy(() => import('./operator/OpRedeem'));
const OpRaffle = lazy(() => import('./operator/OpRaffle'));

// Admin Views
const AdminDash = lazy(() => import('./admin/AdminDash'));
const AdminShell = lazy(() => import('./admin/AdminShell'));
const Members = lazy(() => import('./admin/Members'));
const MemberDetail = lazy(() => import('./admin/MemberDetail'));
const AdminRaffle = lazy(() => import('./admin/AdminRaffle'));
const AdminPremios = lazy(() => import('./admin/AdminPremios'));
const Settings = lazy(() => import('./admin/Settings'));
const AdminPromos = lazy(() => import('./admin/AdminPromos'));
const PromoRules = lazy(() => import('./admin/PromoRules'));
const OpManagement = lazy(() => import('./admin/OpManagement'));
const AdminManagement = lazy(() => import('./admin/AdminManagement'));
const AdminCatalog = lazy(() => import('./admin/AdminCatalog'));
const AnClientes = lazy(() => import('./admin/analytics/AnClientes'));
const AnOperadores = lazy(() => import('./admin/analytics/AnOperadores'));
const AnPromos = lazy(() => import('./admin/analytics/AnPromos'));
const AnIntegridad = lazy(() => import('./admin/analytics/AnIntegridad'));
const AdminStations = lazy(() => import('./admin/AdminStations'));
const AuditLog = lazy(() => import('./admin/AuditLog'));

// ===== NAV ITEMS =====
// El admin no tiene BottomNav (Admin v2: AdminShell con menú lateral).
export const operatorNav = [
  { id: 'ohome', label: 'Inicio', icon: <Fuel /> },
  { id: 'oclients', label: 'Clientes', icon: <Users /> },
  { id: 'oredeem', label: 'Premios', icon: <Gift /> },
  { id: 'oraffle', label: 'Rifa', icon: <Ticket /> },
];
// Iconos y labels según la referencia FORMATO GENERAL: casa, boleto
// con estrella, QR central, regalo, carro.
export const clientNav = [
  { id: 'home', label: 'Inicio', icon: <House /> },
  { id: 'cat', label: 'Canjes', icon: <Gift /> },
  { id: 'qr', label: '', icon: null, isQR: true },
  { id: 'raf', label: 'Rifa', icon: <TicketStar /> },
  { id: 'veh', label: 'Vehículos', icon: <Car /> },
];

export default function ScreenRouter({ ctx, companyPicked, setCompanyPicked, navOrigin }) {
  const {
    isA, isO, isC, authScreen, authOp, authAdmin,
    scr, oScr, cScr, dark, cfg,
  } = ctx;
  const adminWide = isA && authAdmin === 'logged';

  // ===== SCREEN ROUTER =====
  function renderScreen() {
    // Auth gates
    if (isC && authScreen !== 'logged') {
      if (authScreen === 'googleProfile') return <GoogleProfile {...ctx} />;
      return <ClientLogin {...ctx} />;
    }
    if (isO && authOp !== 'logged') return <OperatorLogin {...ctx} />;
    if (isA && authAdmin !== 'logged') return <AdminLogin {...ctx} />;

    // Admin screens
    if (isA) {
      if (scr === 'mem') return <Members {...ctx} />;
      if (scr === 'det') return <MemberDetail {...ctx} />;
      if (scr === 'cat') return <AdminCatalog {...ctx} />; // 8-ago: Catálogo de Canjes (gestión; la vista Catalog compartida queda solo para el cliente)
      if (scr === 'raf') return <AdminRaffle {...ctx} />;
      if (scr === 'premios') return <AdminPremios {...ctx} />;
      if (scr === 'cfg') return <Settings {...ctx} />;
      if (scr === 'ops') return <OpManagement {...ctx} />;
      if (scr === 'stations') return <AdminStations {...ctx} />;
      if (scr === 'admins') return <AdminManagement {...ctx} />;
      if (scr === 'audit') return <AuditLog {...ctx} />;
      if (scr === 'rules') return <Rules {...ctx} />;
      if (scr === 'promos') return <AdminPromos {...ctx} />;
      if (scr === 'promorules') return <PromoRules {...ctx} />;
      if (scr === 'anCli') return <AnClientes {...ctx} />;
      if (scr === 'anOps') return <AnOperadores {...ctx} />;
      if (scr === 'anPro') return <AnPromos {...ctx} />;
      if (scr === 'anInt') return <AnIntegridad {...ctx} />;
      return <AdminDash {...ctx} />;
    }

    // Operator screens
    if (isO) {
      if (oScr === 'oclients') return <OpClients {...ctx} />;
      if (oScr === 'oredeem') return <OpRedeem {...ctx} />;
      if (oScr === 'oraffle') return <OpRaffle {...ctx} />;
      return <OpHome {...ctx} />;
    }

    // Client screens — el selector de empresa antecede al inicio
    if (!companyPicked) return <CompanySelect dark={dark} cfg={cfg} onPick={() => setCompanyPicked(true)} />;
    if (cScr === 'cat') return <Catalog {...ctx} client={true} />;
    if (cScr === 'promos') return <ClientPromos {...ctx} />;
    if (cScr === 'raf') return <ClientRaffle {...ctx} />;
    if (cScr === 'menu') return <ClientMenu {...ctx} />;
    if (cScr === 'veh') return <VehiclesScreen {...ctx} />;
    return <ClientHome {...ctx} />;
  }

  return (
    /* Active screen — el cliente entra con animación desde el origen presionado (D35).
       position:relative (SIN z-index) apila el contenido SIEMPRE por
       encima de GalaxyStars: sin él, al terminar la animación de
       entrada el transform desaparecía, el contenido estático caía
       bajo el overlay fixed de estrellas/nebulosas y los textos se
       veían "bajar de opacidad" segundos después de entrar. z-auto
       no crea stacking context → los modales internos siguen
       pudiendo tapar la BottomNav. */
    /* Suspense del code splitting por rol: mientras baja el chunk
       del operador/admin se muestra el spinner de marca centrado
       (el cliente es eager — nunca lo ve en su camino). */
    /* ChunkBoundary (3-sep): un chunk que no carga tras un deploy ya no
       deja la pantalla en blanco — recarga una vez y, si persiste,
       muestra Reintentar (la BottomNav sigue viva). */
    <ChunkBoundary dark={isA || (isC && dark)} resetKey={isC ? cScr : isA ? scr : oScr}>
    <Suspense fallback={
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoSpinner size={44} dark={isA || (isC && dark)} />
      </div>
    }>
      {isC && authScreen === 'logged'
        ? (
          <div
            key={companyPicked ? cScr : 'company'}
            className="pp-screen"
            style={{ position: 'relative', transformOrigin: navOrigin ? `${navOrigin.x}px ${navOrigin.y}px` : '50% 85%' }}
          >
            {renderScreen()}
          </div>
        )
        : adminWide
          // Admin v2 (6-ago): shell con menú lateral — desktop-first,
          // iconos en tableta, drawer en móvil. Sin BottomNav.
          ? <AdminShell ctx={ctx}>{renderScreen()}</AdminShell>
          : renderScreen()}
    </Suspense>
    </ChunkBoundary>
  );
}
