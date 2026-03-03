// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { sMono, GAL3, clientTheme } from '../../constants/styles';
import Badge from '../../components/ui/Badge';
import QRCode from '../../components/ui/QRCode';
import TierDeco from '../../components/ui/TierDeco';
import GalaxyDust from '../../components/ui/GalaxyDust';
import InactivityWarning from '../../components/ui/InactivityWarning';
import { Clock } from '../../components/ui/Icons';

export default function ClientHome(ctx) {
  const { me, gT, cfg, cTier, TH, activePromos, promoIdx, setPromoIdx,
    mySurveyCount, doSurvey, showHist, setShowHist,
    showInvite, setShowInvite, showRedeemed, setShowRedeemed,
    showWifi, setShowWifi, showMap, setShowMap,
    activityLog, custs, redeemedList } = ctx;

  if (!me) return null;

  const cStatY = {
    background: cTier.name === 'BLACK' ? GAL3
      : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#E0E0E0,#EEEEEE,#E0E0E0)' : '#F5F5F5',
    borderRadius: 14, padding: 14, textAlign: 'center',
    border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)'
      : cTier.name === 'PLATINO' ? '1px solid #BDBDBD' : '1px solid #eee',
    position: 'relative', overflow: 'hidden',
  };

  const cSec = {
    padding: '12px 20px 6px', fontSize: 11, fontWeight: 800,
    color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.4)' : '#BDBDBD',
    textTransform: 'uppercase', letterSpacing: 1.5,
  };

  // QR styles by tier
  const qrStyles = {
    ORO: { bg: 'linear-gradient(135deg,#FBBC04,#FFD540,#FBBC04)', border: '2px solid #E6A800', shadow: '0 8px 32px rgba(251,188,4,.3)', txtCol: 'rgba(0,0,0,.4)' },
    PLATINO: { bg: 'linear-gradient(135deg,#9E9E9E,#BDBDBD,#CFD8DC,#BDBDBD)', border: '2px solid #1565C0', shadow: '0 6px 24px rgba(21,101,192,.25)', txtCol: 'rgba(255,255,255,.7)' },
    BLACK: { bg: 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)', border: 'none', shadow: '0 16px 56px rgba(0,0,0,.7)', txtCol: 'rgba(255,255,255,.35)', isBlack: true },
  };
  const qrS = qrStyles[cTier.name];

  // Activity history
  const myActs = activityLog?.[me.id] || [];
  const cols = {
    compra: cTier.name === 'BLACK' ? '#81C784' : '#2E7D32',
    canje: cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0',
    evento: cTier.name === 'BLACK' ? '#FBBC04' : TH.pri,
    rifa: cTier.name === 'BLACK' ? '#CE93D8' : '#7B1FA2',
    encuesta: cTier.name === 'BLACK' ? '#FBBC04' : TH.pri,
    registro: cTier.name === 'BLACK' ? '#FBBC04' : TH.pri,
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Inactivity warning */}
      <InactivityWarning lastBuy={me.lastBuy} />

      {/* Header: Welcome + Points */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {me.avatar ? (
            <img src={me.avatar} style={{ width: 44, height: 44, borderRadius: 14, border: `2px solid ${TH.pri}` }} alt="" />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: cTier.bg, color: cTier.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18,
            }}>
              {me.name?.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
              {me.name}
            </div>
            <Badge t={cTier} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...sMono, fontSize: 24, fontWeight: 800, color: cTier.name === 'BLACK' ? '#FFD54F' : TH.pri }}>
              {me.points}
            </div>
            <div style={{ fontSize: 10, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.4)' : '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              puntos
            </div>
          </div>
        </div>
      </div>

      {/* Stats row: Visits, Invite, Raffle Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 12px', margin: '12px 0' }}>
        <div style={cStatY}>
          {cTier.name === 'BLACK' && <GalaxyDust n={10} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ ...sMono, fontSize: 22 }}>{me.visits}</div>
            <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>Visitas</div>
          </div>
        </div>

        <div onClick={() => setShowInvite(true)} style={{
          ...cStatY, cursor: 'pointer',
          background: cTier.name === 'BLACK' ? GAL3 : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#C8E6C9,#E8F5E9,#C8E6C9)' : '#E8F5E9',
          border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : '1px solid #C8E6C9',
        }}>
          {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 22 }}>👥</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 800, color: cTier.name === 'BLACK' ? '#81C784' : '#2E7D32' }}>Invitar amigo</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: cTier.name === 'BLACK' ? '#66BB6A' : '#43A047' }}>+{cfg.referralPts}pts</div>
          </div>
        </div>

        <div style={{
          ...cStatY,
          background: cTier.name === 'BLACK' ? GAL3 : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#E1BEE7,#F3E5F5,#E1BEE7)' : '#F3E5F5',
          border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : '1px solid #E1BEE7',
        }}>
          {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ ...sMono, fontSize: 22, color: cTier.name === 'BLACK' ? '#CE93D8' : '#7B1FA2' }}>{me.tickets}</div>
            <div style={{ fontSize: 10, color: cTier.name === 'BLACK' ? '#BA68C8' : '#7B1FA2', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>Boletos Rifa</div>
          </div>
        </div>
      </div>

      {/* Quick action row: WiFi, Baños, Estaciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 12px', margin: '6px 0 12px' }}>
        <div onClick={() => setShowWifi(true)} style={{
          ...cStatY, cursor: 'pointer',
          background: cTier.name === 'BLACK' ? GAL3 : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#BBDEFB,#E3F2FD,#BBDEFB)' : '#E3F2FD',
          border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : '1px solid #BBDEFB',
        }}>
          {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 22 }}>📶</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 800, color: cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0', marginTop: 4 }}>Código WiFi</div>
          </div>
        </div>

        <div style={{
          ...cStatY, opacity: cTier.bath ? 1 : .5,
          background: cTier.name === 'BLACK' ? GAL3 : cTier.bath ? '#FFF8E1' : '#F5F5F5',
          border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : cTier.bath ? '1px solid #FFE082' : '1px solid #E0E0E0',
        }}>
          {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 22 }}>🚻</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 800, color: cTier.bath ? (cTier.name === 'BLACK' ? '#FFD54F' : '#F57F17') : '#BDBDBD', marginTop: 4 }}>
              {cTier.bath ? 'Acceso baños' : 'PLATINO+'}
            </div>
          </div>
        </div>

        <div onClick={() => setShowMap(true)} style={{
          ...cStatY, cursor: 'pointer',
          background: cTier.name === 'BLACK' ? GAL3 : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#FFCDD2,#FFEBEE,#FFCDD2)' : '#FFEBEE',
          border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : '1px solid #FFCDD2',
        }}>
          {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 22 }}>📍</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 800, color: cTier.name === 'BLACK' ? '#EF5350' : '#C62828', marginTop: 4 }}>Estaciones</div>
          </div>
        </div>
      </div>

      {/* Survey button */}
      <div onClick={doSurvey} style={{
        margin: '8px 12px 12px', padding: 16,
        background: cTier.name === 'BLACK' ? GAL3 : cTier.name === 'PLATINO' ? 'linear-gradient(135deg,#BBDEFB,#E3F2FD)' : '#E3F2FD',
        borderRadius: 16,
        border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.08)' : '1px solid #BBDEFB',
        cursor: mySurveyCount >= cfg.surveyDaily ? 'default' : 'pointer',
        opacity: mySurveyCount >= cfg.surveyDaily ? .5 : 1,
        position: 'relative', overflow: 'hidden',
      }}>
        {cTier.name === 'BLACK' && <GalaxyDust n={8} />}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
              Encuesta de satisfacción Shell
            </div>
            <div style={{ fontSize: 11, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.6)' : '#757575', marginTop: 2 }}>
              {mySurveyCount >= cfg.surveyDaily
                ? '✅ ¡Completaste todas! Boleto bonus ganado'
                : `${mySurveyCount}/${cfg.surveyDaily} hoy · +${cfg.surveyPts} pts c/u`}
            </div>
            <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)', marginTop: 6 }}>
              <div style={{
                height: '100%', borderRadius: 2, width: `${(mySurveyCount / cfg.surveyDaily) * 100}%`,
                background: mySurveyCount >= cfg.surveyDaily ? '#FFD54F' : (cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0'),
                transition: 'width .3s ease',
              }} />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0', ...sMono }}>
              +{cfg.surveyPts} pts
            </div>
            {mySurveyCount >= cfg.surveyDaily && (
              <div style={{ fontSize: 10, fontWeight: 800, color: '#FFD54F', marginTop: 2 }}>🎟️ +1</div>
            )}
          </div>
        </div>
      </div>

      {/* My QR */}
      <div style={cSec}>Mi QR</div>
      <div style={{ textAlign: 'center', padding: '8px 20px 16px' }}>
        <div style={{
          background: qrS.bg, border: qrS.border, boxShadow: qrS.shadow,
          borderRadius: 24, padding: '28px 20px', position: 'relative', overflow: 'hidden',
          display: 'inline-block', minWidth: 220,
        }}>
          <TierDeco name={cTier.name} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: qrS.txtCol, marginBottom: 12 }}>
              {cTier.icon} {cTier.name}
            </div>
            <QRCode code={me.cardId || me.dpi || me.id} sz={150} scanColor={TH.pri} />
            <div style={{ fontSize: 11, color: qrS.txtCol, marginTop: 12, fontWeight: 600 }}>
              Mostrá tu código en cada compra
            </div>
            {me.cardId && (
              <div style={{ marginTop: 8, padding: '6px 14px', borderRadius: 10, background: 'rgba(0,0,0,.08)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>💳</span>
                <span style={{ ...sMono, fontSize: 11, fontWeight: 800, color: qrS.txtCol }}>{me.cardId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History toggle */}
      <div style={{ padding: '0 20px 16px' }}>
        <button onClick={() => setShowHist(!showHist)} style={{
          width: '100%', background: cTier.name !== 'ORO' ? TH.cardBg : '#FAFAFA',
          border: cTier.name !== 'ORO' ? TH.cardBorder : '1px solid #eee',
          borderRadius: 14, padding: 14, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
        }}>
          <Clock /> Historial {showHist ? '▲' : '▼'}
        </button>
      </div>

      {/* Activity history */}
      {showHist && (
        <div style={{ animation: 'fadeUp .3s ease', background: cTier.name !== 'ORO' ? TH.histBg : undefined }}>
          {myActs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#9E9E9E', fontSize: 13 }}>
              Sin actividad registrada aún
            </div>
          ) : (
            myActs.slice(0, 20).map((a, i) => {
              const dt = a.date || '';
              const dd = dt.length >= 10 ? `${dt.substring(8, 10)}/${dt.substring(5, 7)}` : dt;
              const pts = typeof a.pts === 'string' ? parseInt(a.pts, 10) : (a.pts || 0);
              const col = cols[a.type] || cols.evento;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px',
                  borderBottom: `1px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.04)' : '#F0F0F0'}`,
                  animation: `slideIn .3s ${i * 0.03}s both`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.05)' : `${col}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {a.type === 'compra' ? '⛽' : a.type === 'canje' ? '🎁' : a.type === 'rifa' ? '🎟️' : a.type === 'encuesta' ? '📋' : '⭐'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: cTier.name === 'BLACK' ? '#E0E0E0' : '#424242', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.desc}
                    </div>
                    <div style={{ fontSize: 10, color: '#9E9E9E', ...sMono, marginTop: 2 }}>{dd}</div>
                  </div>
                  {pts !== 0 && (
                    <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: pts > 0 ? col : '#C62828', flexShrink: 0 }}>
                      {pts > 0 ? '+' : ''}{pts}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* My Redemptions button */}
      <div style={{ padding: '0 20px 16px' }}>
        <button onClick={() => setShowRedeemed(true)} style={{
          width: '100%', background: cTier.name !== 'ORO' ? TH.cardBg : '#FAFAFA',
          border: cTier.name !== 'ORO' ? TH.cardBorder : '1px solid #eee',
          borderRadius: 14, padding: 14, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
        }}>
          🎁 Mis Canjes ({redeemedList.length})
        </button>
      </div>
    </div>
  );
}
