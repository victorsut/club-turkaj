// src/components/ui/QRScanner.jsx
// Full-screen QR scanner overlay using html5-qrcode
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState('');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef('qr-reader-' + Date.now());

  useEffect(() => {
    let scanner = null;
    let mounted = true;

    async function startScanner() {
      try {
        scanner = new Html5Qrcode(containerRef.current);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // Cámara trasera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (mounted) {
              // Vibrar para feedback táctil
              if (navigator.vibrate) navigator.vibrate(200);
              onScan(decodedText);
            }
          },
          () => {} // Ignorar frames sin QR
        );

        // Verificar si tiene flash
        try {
          const caps = scanner.getRunningTrackCameraCapabilities();
          if (caps?.torchFeature?.isSupported()) setHasFlash(true);
        } catch (e) { /* sin flash */ }

      } catch (err) {
        if (mounted) {
          console.error('[QRScanner]', err);
          if (err.toString().includes('NotAllowedError')) {
            setError('Permiso de cámara denegado. Habilitá el acceso en la configuración del navegador.');
          } else if (err.toString().includes('NotFoundError')) {
            setError('No se encontró cámara en este dispositivo.');
          } else {
            setError('Error al iniciar la cámara: ' + (err.message || err));
          }
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const toggleFlash = async () => {
    try {
      const caps = scannerRef.current?.getRunningTrackCameraCapabilities();
      if (caps?.torchFeature) {
        if (flashOn) await caps.torchFeature.disable();
        else await caps.torchFeature.enable();
        setFlashOn(!flashOn);
      }
    } catch (e) { /* ignorar */ }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'rgba(0,0,0,.8)', zIndex: 10,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 12,
          padding: '10px 18px', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'DM Sans'",
        }}>
          ✕ Cerrar
        </button>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans'" }}>
          📷 Escanear QR
        </div>
        {hasFlash && (
          <button onClick={toggleFlash} style={{
            background: flashOn ? '#FBBC04' : 'rgba(255,255,255,.15)',
            border: 'none', borderRadius: 12, padding: '10px 18px',
            color: flashOn ? '#000' : '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'DM Sans'",
          }}>
            {flashOn ? '🔦 On' : '🔦'}
          </button>
        )}
        {!hasFlash && <div style={{ width: 70 }} />}
      </div>

      {/* Camera view */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div id={containerRef.current} style={{ width: '100%', maxWidth: 400 }} />

        {/* Scan guide overlay */}
        {!error && (
          <div style={{
            position: 'absolute', bottom: 40, left: 0, right: 0,
            textAlign: 'center', color: 'rgba(255,255,255,.7)',
            fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'",
          }}>
            Apuntá la cámara al código QR del miembro
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40,
          }}>
            <div style={{
              background: 'rgba(198,40,40,.9)', color: '#fff',
              padding: '24px 28px', borderRadius: 20, textAlign: 'center',
              fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans'",
              maxWidth: 320, lineHeight: 1.5,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              {error}
              <button onClick={onClose} style={{
                display: 'block', width: '100%', marginTop: 16,
                background: '#fff', color: '#C62828', border: 'none',
                borderRadius: 12, padding: '12px 20px', fontSize: 14,
                fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans'",
              }}>
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
