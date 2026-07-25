// src/components/ui/QRScanner.jsx
// Full-screen QR scanner overlay using html5-qrcode.
// Valida formato CT[OPB]D-NNNNN antes de emitir onScan; con
// `acceptRedemptions` también acepta códigos de canje TK-XXXXXX
// (QR del premio en OpRedeem).
// Permite ingreso manual como fallback (cámara denegada o QR raspado).
import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { isValidCardCode, isValidRedemptionCode } from '../../lib/cardCodes';

const HEADER_BTN = {
  background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 12,
  padding: '10px 14px', color: '#fff', fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: "'DM Sans'",
};

export default function QRScanner({ onScan, onClose, acceptRedemptions = false }) {
  const [mode, setMode] = useState('scanning'); // 'scanning' | 'manual'
  // Validación según el caller: tarjeta siempre; canje TK solo si el
  // caller lo pide (OpRedeem). Ref para el callback estable del scanner.
  const isAccepted = useCallback(
    (t) => isValidCardCode(t) || (acceptRedemptions && isValidRedemptionCode(t)),
    [acceptRedemptions],
  );
  const isAcceptedRef = useRef(isAccepted);
  useEffect(() => { isAcceptedRef.current = isAccepted; }, [isAccepted]);
  const [error, setError] = useState('');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState(null);
  const [manualInput, setManualInput] = useState('');

  const scannerRef = useRef(null);
  const containerRef = useRef('qr-reader-' + Date.now());
  // Refs para el callback estable de Html5Qrcode (evita closures stale)
  const mountedRef = useRef(true);
  const invalidLockRef = useRef(false);
  const invalidTimeoutRef = useRef(null);
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const clearInvalidMsg = useCallback(() => {
    if (invalidTimeoutRef.current) {
      clearTimeout(invalidTimeoutRef.current);
      invalidTimeoutRef.current = null;
    }
    invalidLockRef.current = false;
    setInvalidMsg(null);
  }, []);

  // Arranca/detiene el scanner según el modo.
  useEffect(() => {
    if (mode !== 'scanning') return undefined;

    mountedRef.current = true;
    let scanner = null;

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
            if (!mountedRef.current) return;
            // Debounce: mientras el mensaje "QR no válido" esté en pantalla,
            // ignorar nuevas detecciones (evita spam si el QR ajeno queda
            // en frame y se re-detecta a 10 fps).
            if (invalidLockRef.current) return;

            if (isAcceptedRef.current(decodedText)) {
              if (navigator.vibrate) navigator.vibrate(200);
              onScanRef.current?.(decodedText);
            } else {
              invalidLockRef.current = true;
              setInvalidMsg('QR no válido — seguí escaneando');
              invalidTimeoutRef.current = setTimeout(() => {
                invalidLockRef.current = false;
                invalidTimeoutRef.current = null;
                if (mountedRef.current) setInvalidMsg(null);
              }, 1500);
            }
          },
          () => {} // ignorar frames sin QR
        );

        // Verificar si tiene flash
        try {
          const caps = scanner.getRunningTrackCameraCapabilities();
          if (caps?.torchFeature?.isSupported()) setHasFlash(true);
        } catch (e) { /* sin flash */ }

      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[QRScanner]', err);
        if (err.toString().includes('NotAllowedError')) {
          setError('Permiso de cámara denegado. Habilitá el acceso en la configuración del navegador o usá "Ingresar manual".');
        } else if (err.toString().includes('NotFoundError')) {
          setError('No se encontró cámara en este dispositivo. Usá "Ingresar manual".');
        } else {
          setError('Error al iniciar la cámara: ' + (err.message || err));
        }
      }
    }

    setError('');
    setHasFlash(false);
    setFlashOn(false);
    startScanner();

    return () => {
      mountedRef.current = false;
      clearInvalidMsg();
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [mode, clearInvalidMsg]);

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

  const switchToManual = () => setMode('manual');
  const switchToScanning = () => {
    setManualInput('');
    setMode('scanning');
  };

  const handleManualConfirm = () => {
    const trimmed = manualInput.trim().toUpperCase();
    if (!isAccepted(trimmed)) return; // botón ya estaba deshabilitado
    if (navigator.vibrate) navigator.vibrate(200);
    onScan(trimmed);
  };

  const manualValid = isAccepted(manualInput);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'rgba(0,0,0,.8)', zIndex: 10, gap: 8,
      }}>
        <button onClick={onClose} style={HEADER_BTN}>✕ Cerrar</button>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans'" }}>
          {mode === 'scanning' ? '📷 Escanear QR' : '⌨️ Código manual'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mode === 'scanning' && (
            <>
              <button onClick={switchToManual} style={HEADER_BTN} title="Ingresar código manualmente">⌨️</button>
              {hasFlash && (
                <button onClick={toggleFlash} style={{
                  ...HEADER_BTN,
                  background: flashOn ? '#FBBC04' : 'rgba(255,255,255,.15)',
                  color: flashOn ? '#000' : '#fff',
                }}>
                  {flashOn ? '🔦 On' : '🔦'}
                </button>
              )}
            </>
          )}
          {mode === 'manual' && (
            <button onClick={switchToScanning} style={HEADER_BTN} title="Volver al escáner">📷</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'scanning' && (
          <>
            <div id={containerRef.current} style={{ width: '100%', maxWidth: 400 }} />

            {/* Mensaje transitorio "QR no válido" */}
            {invalidMsg && (
              <div style={{
                position: 'absolute', top: 20, left: 20, right: 20,
                background: 'rgba(255,167,38,.95)', color: '#0D0D0D',
                padding: '14px 20px', borderRadius: 14, textAlign: 'center',
                fontSize: 14, fontWeight: 800, fontFamily: "'DM Sans'",
                boxShadow: '0 4px 16px rgba(0,0,0,.3)', zIndex: 5,
              }}>
                ⚠️ {invalidMsg}
              </div>
            )}

            {/* Hint inferior */}
            {!error && !invalidMsg && (
              <div style={{
                position: 'absolute', bottom: 40, left: 0, right: 0,
                textAlign: 'center', color: 'rgba(255,255,255,.7)',
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'",
              }}>
                {acceptRedemptions ? 'Apuntá la cámara al QR del miembro o del premio' : 'Apuntá la cámara al código QR del miembro'}
              </div>
            )}

            {/* Error de cámara — fallback al ingreso manual */}
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
                  <button onClick={switchToManual} style={{
                    display: 'block', width: '100%', marginTop: 16,
                    background: '#fff', color: '#C62828', border: 'none',
                    borderRadius: 12, padding: '12px 20px', fontSize: 14,
                    fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans'",
                  }}>
                    ⌨️ Ingresar manual
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'manual' && (
          <div style={{
            width: '100%', maxWidth: 360, padding: '0 24px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              color: '#fff', fontSize: 16, fontWeight: 800,
              fontFamily: "'DM Sans'", textAlign: 'center', marginBottom: 4,
            }}>
              {acceptRedemptions ? 'Ingresá el código de la tarjeta o del canje' : 'Ingresá el código de la tarjeta'}
            </div>
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.toUpperCase())}
              placeholder={acceptRedemptions ? 'CTOD-12345 o TK-ABC123' : 'CTOD-12345'}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '16px 18px', borderRadius: 14,
                border: manualValid ? '2px solid #4CAF50' : '2px solid rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,.08)', color: '#fff',
                fontSize: 22, fontWeight: 800, textAlign: 'center',
                fontFamily: 'monospace', letterSpacing: 2, outline: 'none',
              }}
            />
            <button
              onClick={handleManualConfirm}
              disabled={!manualValid}
              style={{
                width: '100%', padding: 16, borderRadius: 14, border: 'none',
                background: manualValid ? '#FBBC04' : 'rgba(255,255,255,.15)',
                color: manualValid ? '#0D0D0D' : 'rgba(255,255,255,.4)',
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 900,
                cursor: manualValid ? 'pointer' : 'not-allowed',
                boxShadow: manualValid ? '0 4px 16px rgba(251,188,4,.35)' : 'none',
              }}
            >
              ✓ Confirmar
            </button>
            <button
              onClick={switchToScanning}
              style={{
                width: '100%', padding: 14, borderRadius: 14,
                border: '1px solid rgba(255,255,255,.2)', background: 'transparent',
                color: 'rgba(255,255,255,.7)', fontFamily: "'DM Sans'",
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              📷 Volver al escáner
            </button>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,.4)',
              textAlign: 'center', fontFamily: "'DM Sans'", marginTop: 4,
            }}>
              {acceptRedemptions
                ? 'Tarjeta: CTOD/CTPD/CTBD + 5 dígitos · Canje: TK + código'
                : 'Formato: CTOD/CTPD/CTBD seguido de 5 dígitos'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
