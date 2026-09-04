// src/views/client/home/VehicleBentoTile.jsx
// Cuadro VEHÍCULO del bento del inicio (referencia PANTALLA DE INICIO,
// 4-sep-2026): el socio con vehículos ve el ARTE de su vehículo
// PRINCIPAL (primero del orden del server = último que cargó
// combustible) en su color, sobre el mismo fondo del cuadro; sin
// vehículos, el icono del carrito de siempre. Sin rótulo PRÓXIMAMENTE
// (la ventana ya es de todos desde el rollout de F6).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BentoTile from '../../../components/ui/BentoTile';
import VehicleArt from '../../../components/ui/VehicleArt';
import { CarIcon } from '../../../components/ui/BentoIcons';
import { bodyFor } from '../../../constants/vehicleCatalog';
import { listMyVehicles } from '../../../services/vehicleService';

// Caché por socio para pintar el arte al instante al volver al inicio
// (el home se remonta en cada navegación); se refresca con la RPC.
const cacheKey = (id) => `pp_home_vehicle_${id}`;
const readCache = (id) => {
  try { const raw = localStorage.getItem(cacheKey(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeCache = (id, v) => {
  try {
    if (v) localStorage.setItem(cacheKey(id), JSON.stringify(v));
    else localStorage.removeItem(cacheKey(id));
  } catch { /* sin storage (privado/bloqueado): solo se pierde el pintado instantáneo */ }
};

export default function VehicleBentoTile({ me, htp, onOpen }) {
  const ready = !!me?.id && !String(me.id).startsWith('temp-');
  const [main, setMain] = useState(() => (ready ? readCache(me.id) : null));

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    listMyVehicles().then(({ data }) => {
      if (!alive || !data?.ok) return;
      const first = Array.isArray(data.vehicles) && data.vehicles.length ? data.vehicles[0] : null;
      const slim = first ? {
        id: first.id, vtype: first.vtype, brand: first.brand, model: first.model, color: first.color,
      } : null;
      setMain(slim);
      writeCache(me.id, slim);
    });
    return () => { alive = false; };
  }, [ready, me?.id]);

  // ── Encaje del arte (4-sep, referencias POR CORREGIR): cada arte usa
  // distinto el lienzo 240×150 (la moto lo llena, el picop deja aire
  // arriba, el genérico queda grande) → se mide el contorno REAL del
  // dibujo (getBBox, sombra incluida) y se escala y centra en el área
  // libre sobre el título con margen. Se re-mide cuando llega el chunk
  // calcado (MutationObserver) y si el cuadro cambia de tamaño.
  const boxRef = useRef(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !main) return;
    const fit = () => {
      const svg = box.querySelector('svg');
      if (!svg) return;
      let bb;
      try { bb = svg.getBBox(); } catch { return; }
      const W = box.clientWidth, H = box.clientHeight;
      if (!bb || !bb.width || !bb.height || !W || !H) return;
      const k = W / 240;                                    // px por unidad del viewBox
      const s = Math.min((W * 0.9) / (bb.width * k), (H * 0.86) / (bb.height * k), 1.3);
      const cx = (bb.x + bb.width / 2) * k, cy = (bb.y + bb.height / 2) * k;
      svg.style.transformOrigin = `${cx}px ${cy}px`;
      svg.style.transform = `translate(${W / 2 - cx}px, ${H / 2 - cy}px) scale(${s})`;
      svg.style.opacity = '1';
    };
    fit();
    const mo = new MutationObserver(fit);
    mo.observe(box, { childList: true, subtree: true, attributes: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(box);
    return () => { mo.disconnect(); ro?.disconnect(); };
  }, [main?.id, main?.vtype, main?.brand, main?.model]);

  const ink = htp.vehicleInk || '#fff';
  const common = {
    index: 1, square: true, color: htp.vehicle, titleColor: htp.vehicleTitle, ink,
    title: 'Vehículo', sub: 'Administra y consulta tus vehículos', onClick: onOpen,
  };

  if (!main) {
    return <BentoTile {...common} icon={<CarIcon color={htp.vehicleInk} />} />;
  }

  return (
    <BentoTile {...common}>
      {/* Área libre sobre el título: el arte se mide y se centra ahí
          (ver useLayoutEffect); margen negativo = puede asomar un poco
          por los bordes laterales como en la referencia */}
      <div ref={boxRef} aria-hidden style={{ flex: 1, alignSelf: 'stretch', minHeight: 0, position: 'relative', margin: '-6px -8px 4px', pointerEvents: 'none' }}>
        <VehicleArt
          type={main.vtype} body={bodyFor(main.vtype, main.model, main.brand)}
          color={main.color || '#9E9E9E'} width={260}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', opacity: 0, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.28))' }}
        />
      </div>
      <div className="pp-bento-body" style={{ marginTop: 'auto', position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div className="pp-bento-title" style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.2, color: htp.vehicleTitle || 'inherit' }}>
          Vehículo
        </div>
        <div className="pp-bento-sub" style={{ fontSize: 11.5, opacity: 0.9, marginTop: 3, lineHeight: 1.35, fontWeight: 500 }}>
          Administra y consulta tus vehículos
        </div>
      </div>
    </BentoTile>
  );
}
