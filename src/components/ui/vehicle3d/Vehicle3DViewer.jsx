// src/components/ui/vehicle3d/Vehicle3DViewer.jsx
// F6 E2-3D — Visor three.js: tornamesa por ARRASTRE (con inercia y
// auto-rotación en reposo) + iluminación dinámica (luz clave con
// sombras, luz de contorno que ORBITA lento) y recoloreo en vivo.
// Este archivo y three.js viajan en su PROPIO chunk (React.lazy desde
// Vehicle3DSheet) — el bundle base del cliente no crece.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildNavi } from './NaviModel.js';

// Registro de modelos con arte 3D (crecerá con la lista del dueño)
const BUILDERS = { m_navi: buildNavi };
export const has3D = (bodyKey) => !!BUILDERS[bodyKey];

export default function Vehicle3DViewer({ body = 'm_navi', color = '#C62828', style }) {
  const hostRef = useRef(null);
  const apiRef = useRef(null); // { recolor }

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !BUILDERS[body]) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';

    // Tone mapping cinematográfico — clave para que la pintura y el
    // metal se vean "de estudio" y no plástico plano
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0, 3.6, 18.5);
    camera.lookAt(0, 1.35, 0);

    // ── Iluminación de AMBIENTE (reflejos reales en pintura/cromo) ──
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;   // reflejos sí, colores lavados no
    pmrem.dispose();

    // ── Luces: clave con sombra + contorno ORBITANTE ──
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -2;
    key.shadow.radius = 5;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd4ff, 0.55);
    scene.add(rim);

    // ── Modelo sobre tornamesa + piso receptor de sombra ──
    const turntable = new THREE.Group();
    scene.add(turntable);
    const { group, recolor } = BUILDERS[body](color);
    turntable.add(group);
    apiRef.current = { recolor };
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 40),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── Tornamesa por arrastre, inercia y auto-rotación ──
    let yaw = -0.55, vel = 0, dragging = false, lastX = 0, idleAt = 0, t = 0;
    const down = (e) => { dragging = true; lastX = e.clientX; renderer.domElement.style.cursor = 'grabbing'; renderer.domElement.setPointerCapture?.(e.pointerId); };
    const move = (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; vel = dx * 0.0075; yaw += vel; idleAt = performance.now(); };
    const up = () => { dragging = false; renderer.domElement.style.cursor = 'grab'; };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', up);

    const resize = () => {
      const w = host.clientWidth || 300, h = host.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    renderer.setAnimationLoop(() => {
      t += 0.016;
      if (!dragging) {
        yaw += vel; vel *= 0.94;                       // inercia
        if (performance.now() - idleAt > 2500) yaw += 0.004; // reposo
      }
      turntable.rotation.y = yaw;
      // luz de contorno orbitando lento = brillos que se mueven solos
      rim.position.set(Math.cos(t * 0.4) * 6, 3.5, Math.sin(t * 0.4) * 6);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointercancel', up);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      scene.environment?.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  // Recoloreo en vivo sin reconstruir la escena
  useEffect(() => { apiRef.current?.recolor?.(color); }, [color]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%', ...style }} />;
}
