// src/views/client/home/HomeHeader.jsx
// Encabezado del inicio (FORMATO GENERAL): logo, saludo, campana de
// notificaciones con badge, ayuda, botón de menú y saludo festivo vía
// special_days. En pantallas cortas se OMITE el logo (decisión del
// dueño 23-jul): solo saludo compacto + botones; en pantallas grandes
// el logo conserva su fila propia como la referencia. Extraído
// VERBATIM de ClientHome (división 14-ago).
import { useState, useEffect } from 'react';
import { sb } from '../../../lib/supabaseClient';
import { bento, BRAND_ORANGE } from '../../../constants/styles';
import Wordmark from '../../../components/ui/Wordmark';
import { Menu, Bell, HelpCircle } from '../../../components/ui/Icons';

export default function HomeHeader({
  me, cfg, dark, shortScr, unreadN, sbConnected,
  onOpenNotifs, onOpenSupport, onOpenMenu,
}) {
  const headerTxt = dark ? '#fff' : '#0D0D0D';
  // Línea institucional bajo el saludo (referencia encabezado inicio)
  const taglineFg = dark ? 'rgba(255,255,255,.55)' : '#6E6E73';
  // Halo sutil del logo Turkaj en modo oscuro: separa los contornos
  // negros del arte del fondo (pedido del dueño 1-ago)
  const turkajHalo = dark
    ? 'drop-shadow(0 0 5px rgba(255,255,255,.4)) drop-shadow(0 0 16px rgba(255,255,255,.18))'
    : 'none';
  const firstName = (me.name || '').trim().split(' ')[0] || 'cliente';

  // Campana de notificaciones (28-jul): badge con las sin leer; abre
  // el inbox (NotificationsSheet) con container transform desde el ícono.
  const bellBtn = (extraStyle) => (
    <button onClick={onOpenNotifs} aria-label="Notificaciones" style={{
      width: 42, height: 42, border: 'none', cursor: 'pointer',
      background: 'none', color: headerTxt, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, padding: 0, ...extraStyle,
    }}>
      <Bell />
      {unreadN > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: 4,
          minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
          background: bento.red, color: '#fff',
          fontSize: 9.5, fontWeight: 800, lineHeight: '16px',
          fontFamily: "'DM Sans'", boxSizing: 'border-box',
        }}>
          {unreadN > 9 ? '9+' : unreadN}
        </span>
      )}
    </button>
  );

  // Canal de asistencia (4-ago): icono de ayuda a la par de la campana
  const helpBtn = () => (
    <button onClick={onOpenSupport} aria-label="Asistencia y ayuda" style={{
      width: 42, height: 42, border: 'none', cursor: 'pointer',
      background: 'none', color: headerTxt,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, padding: 0,
    }}>
      <HelpCircle />
    </button>
  );

  const menuBtn = () => (
    <button onClick={onOpenMenu} aria-label="Menú" style={{
      width: 42, height: 42, border: 'none', cursor: 'pointer',
      background: 'none', color: headerTxt,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, padding: 0,
    }}>
      <Menu />
    </button>
  );

  // Saludo festivo (D34): special_days de hoy (hora de Guatemala) o cumpleaños.
  const [festivo, setFestivo] = useState(null);
  useEffect(() => {
    if (!sb || !sbConnected) return;
    const todayGT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }); // YYYY-MM-DD
    const mm = parseInt(todayGT.slice(5, 7), 10);
    const dd = parseInt(todayGT.slice(8, 10), 10);
    sb.from('special_days').select('name, month, day, icon, active').eq('active', true)
      .then(({ data }) => {
        if (!data) return;
        const hit = data.find(s => s.month === mm && s.day === dd);
        if (hit) { setFestivo({ name: hit.name, icon: hit.icon || '🎉' }); return; }
        // month=0 = cumpleaños del miembro (regla del sistema).
        // bday puede ser 'MM-DD' (miembros antiguos) o 'YYYY-MM-DD'.
        const bdayMD = (me.bday || '').length === 10 ? me.bday.slice(5) : me.bday;
        if (data.some(s => s.month === 0) && bdayMD && bdayMD === todayGT.slice(5)) {
          setFestivo({ bday: true, icon: '🎂' });
        }
      });
  }, [sbConnected, me.bday]);

  return (<>
    {shortScr ? (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px 0' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: headerTxt }}>¡Hola, {firstName}!</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: headerTxt, lineHeight: 1.2 }}>Bienvenido a</div>
          <div style={{ lineHeight: 1.1 }}>
            <Wordmark size={28} color={headerTxt} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: taglineFg, marginTop: 3 }}>
            {cfg.companyName || 'Gasolineras Turkaj'}, {cfg.companyLocation || 'Chichicastenango'}
          </div>
        </div>
        {/* Columna derecha: bell + menú arriba, logo Turkaj debajo
            (referencia encabezado inicio — logo interno de la app;
            la marca de la app sigue siendo Puntos Plus) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {helpBtn()}
            {bellBtn()}
            {menuBtn()}
          </div>
          <img src="/logo-turkaj.png" alt="Turkaj" style={{ width: 82, marginTop: 2, filter: turkajHalo }} />
        </div>
      </div>
    ) : (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 0' }}>
          <img src="/logo.png" alt="Puntos Plus" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1 }} />
          {helpBtn()}
          {bellBtn()}
          {menuBtn()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: headerTxt }}>¡Hola, {firstName}!</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: headerTxt, lineHeight: 1.25 }}>Bienvenido a</div>
            <div style={{ lineHeight: 1.1 }}>
              <Wordmark size={34} color={headerTxt} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: taglineFg, marginTop: 4 }}>
              {cfg.companyName || 'Gasolineras Turkaj'}, {cfg.companyLocation || 'Chichicastenango'}
            </div>
          </div>
          {/* Logo Turkaj a la derecha del saludo (referencia encabezado
              inicio) — uso interno; la app conserva su logo Puntos Plus */}
          <img src="/logo-turkaj.png" alt="Turkaj" style={{ width: 106, flexShrink: 0, filter: turkajHalo }} />
        </div>
      </>
    )}

    {/* Saludo festivo vía special_days (D34) */}
    {festivo && (
      <div style={{ padding: '4px 20px 0', fontSize: 12, fontWeight: 800, color: BRAND_ORANGE }}>
        {festivo.icon} {festivo.bday ? `¡Feliz cumpleaños, ${firstName}!` : `¡Feliz ${festivo.name}!`}
      </div>
    )}
  </>);
}
