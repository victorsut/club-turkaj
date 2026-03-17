// src/components/ui/QRCode.jsx
// Generates a real QR code via qrserver.com API

export default function QRCode({ code, sz = 140, scanColor = '#FBBC04' }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${sz}x${sz}&data=${encodeURIComponent(code || 'CLUB-TURKAJ')}&margin=0`;

  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: 24,
      display: 'inline-block', boxShadow: '0 4px 24px rgba(0,0,0,.06)',
      position: 'relative',
    }}>
      {/* Scan line animation */}
      <div style={{
        position: 'absolute', left: 16, right: 16, height: 2,
        background: scanColor, boxShadow: `0 0 10px ${scanColor}`,
        animation: 'scan 2s linear infinite', zIndex: 10,
      }} />

      <img src={qrUrl} width={sz} height={sz} alt={`QR: ${code}`}
        style={{ display: 'block', borderRadius: 4 }} />

      <div style={{
        textAlign: 'center', marginTop: 8, fontSize: 11,
        fontWeight: 800, color: '#424242', letterSpacing: 1,
      }}>
        {code}
      </div>
    </div>
  );
}

// Mini QR for redemption codes (SVG-based, no API)
export function MiniQR({ code, color = '#2E7D32' }) {
  const s = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const isFinder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      const fill = isFinder || ((s * (r * 9 + c + 1) * 7 + r * 13 + c * 17) % 3 !== 0);
      if (fill) cells.push(<rect key={`${r}-${c}`} x={c * 10 + 5} y={r * 10 + 5} width={8} height={8} rx={1.5} fill={color} />);
    }
  }
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {cells}
      <rect x={0} y={0} width={100} height={100} fill="none" stroke={color} strokeWidth={2} rx={8} />
    </svg>
  );
}
