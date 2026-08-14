// src/views/client/home/WifiModal.jsx
// Modal WiFi por estación (25-jul): al montar pide la ubicación; a
// <300 m de una estación con red configurada muestra su SSID y clave
// con botón de copiar. Permiso negado / GPS mudo (in-app browsers) /
// lejos → pase de acceso (la clave la entrega el operador). Extraído
// VERBATIM de ClientHome (división 14-ago) — el efecto pasa de estar
// gateado por showWifi a correr al montar (el modal solo existe abierto).
import { useState, useEffect } from 'react';
import { sMono } from '../../../constants/styles';
import GrowModal from '../../../components/ui/GrowModal';
import LogoSpinner from '../../../components/ui/LogoSpinner';
import { Check } from '../../../components/ui/Icons';
import { WifiIcon } from '../../../components/ui/BentoIcons';
import { getPosition, nearestStation } from '../../../lib/geo';

export default function WifiModal({
  onClose, origin, tint, dark, hp, cTier, stations, displayCode, fire,
}) {
  const [wifiLoc, setWifiLoc] = useState('locating'); // 'locating'|'far'|{station,distance}
  const [wifiCopied, setWifiCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setWifiLoc('locating');
    getPosition()
      .then(({ lat, lng }) => {
        if (!alive) return;
        const hit = nearestStation(stations, lat, lng);
        setWifiLoc(hit?.station?.wifiSsid && hit?.station?.wifiPassword ? hit : 'far');
      })
      .catch(() => { if (alive) setWifiLoc('far'); });
    return () => { alive = false; };
  }, [stations]);

  const copyWifiPass = async (pass) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pass);
      } else {
        // Fallback para navegadores in-app sin Clipboard API
        const ta = document.createElement('textarea');
        ta.value = pass;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 2500);
      fire('Contraseña copiada', 'success');
    } catch {
      fire('No se pudo copiar la contraseña', 'error');
    }
  };

  // Colores del modal WiFi: en BLACK claro hp.wifi es gris perla
  // (invisible sobre blanco) → el acento pasa a la tinta wifiInk.
  const wifiFg = (!dark && hp.wifiInk) ? hp.wifiInk : hp.wifi;
  const wifiBoxBg = dark ? 'rgba(255,255,255,.1)' : (hp.wifiInk ? hp.wifi : '#E9EAF6');
  const wifiBoxFg = dark ? '#fff' : wifiFg;
  const wifiSubFg = dark ? 'rgba(255,255,255,.5)' : (hp.wifiInk ? 'rgba(20,20,23,.55)' : '#8A8FB8');

  return (
    <GrowModal onClose={onClose} origin={origin} tint={tint}
      background={dark ? '#1A1A2E' : '#fff'} maxWidth={340}
      arrowColor={dark ? '#fff' : '#0D0D0D'}
      style={{ padding: '30px 22px 26px', textAlign: 'center' }}>
      {() => (<>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <WifiIcon size={38} color={wifiFg} />
        </div>
        <div style={{ fontSize: 19, fontWeight: 900, color: dark ? '#fff' : '#0D0D0D' }}>WiFi Puntos Plus</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: wifiFg, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
          Beneficio {cTier.name}
        </div>

        {wifiLoc === 'locating' && (
          <div style={{ padding: '22px 0 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LogoSpinner size={30} dark={dark} />
            </div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 12 }}>Detectando tu estación...</div>
          </div>
        )}

        {wifiLoc?.station && (
          <>
            <div style={{ fontSize: 13, color: '#9E9E9E', lineHeight: 1.6, margin: '14px 0' }}>
              Estás en <strong style={{ color: dark ? '#fff' : '#0D0D0D' }}>{wifiLoc.station.name}</strong>. Conectate a esta red:
            </div>
            <div style={{ background: wifiBoxBg, borderRadius: 14, padding: '14px 16px', textAlign: 'left' }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: wifiSubFg }}>Red</div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: wifiBoxFg, marginTop: 2 }}>{wifiLoc.station.wifiSsid}</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: wifiSubFg, marginTop: 12 }}>Contraseña</div>
              <div style={{ ...sMono, fontSize: 17, fontWeight: 800, letterSpacing: 1.5, color: wifiBoxFg, marginTop: 2, wordBreak: 'break-all' }}>
                {wifiLoc.station.wifiPassword}
              </div>
            </div>
            <button onClick={() => copyWifiPass(wifiLoc.station.wifiPassword)} style={{
              width: '100%', marginTop: 12, padding: 14, borderRadius: 14, border: 'none',
              background: wifiFg, color: (dark && hp.wifiInk) ? '#141417' : '#fff',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {wifiCopied ? (<><Check /> Copiada</>) : 'Copiar contraseña'}
            </button>
          </>
        )}

        {wifiLoc === 'far' && (
          <>
            <div style={{ fontSize: 13, color: '#9E9E9E', lineHeight: 1.6, margin: '14px 0' }}>
              No pudimos confirmar que estés en una estación. Mostrá esta pantalla al operador para recibir la clave WiFi.
            </div>
            <div style={{
              ...sMono, fontSize: 18, fontWeight: 800, letterSpacing: 2,
              padding: '12px 0', borderRadius: 14,
              background: wifiBoxBg, color: wifiBoxFg,
            }}>
              {displayCode}
            </div>
          </>
        )}
      </>)}
    </GrowModal>
  );
}
