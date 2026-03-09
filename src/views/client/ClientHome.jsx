// src/views/client/ClientHome.jsx
// Main client dashboard: tier card, stats, survey, QR, promo carousel, history
import { useState, useEffect, useCallback } from 'react';
import { sMono, GAL3, clientTheme } from '../../constants/styles';
import { CARD_PREFIX } from '../../constants/config';
import { tierProgress } from '../../lib/tierSystem';
import Badge from '../../components/ui/Badge';
import QRCode from '../../components/ui/QRCode';
import TierDeco from '../../components/ui/TierDeco';
import GalaxyDust from '../../components/ui/GalaxyDust';
import InactivityWarning from '../../components/ui/InactivityWarning';
import { Clock, Logout } from '../../components/ui/Icons';

export default function ClientHome(ctx) {
  const { me, gT, cfg, cTier, TH, activePromos, promoIdx, setPromoIdx,
    mySurveyCount, doSurvey, showHist, setShowHist,
    showInvite, setShowInvite, showRedeemed, setShowRedeemed,
    showWifi, setShowWifi, showMap, setShowMap, stations,
    showSurveys, setShowSurveys, fire,
    activityLog, custs, redeemedList, logout } = ctx;

  if (!me) return null;

  // Survey timer: wait 90 seconds before granting points
  const [surveyPending, setSurveyPending] = useState(null); // { openedAt, stationName }
  const [surveyCountdown, setSurveyCountdown] = useState(0);
  const SURVEY_WAIT = 90; // 1.5 minutes in seconds

  useEffect(() => {
    if (!surveyPending) { setSurveyCountdown(0); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - surveyPending.openedAt) / 1000);
      const remaining = Math.max(0, SURVEY_WAIT - elapsed);
      setSurveyCountdown(remaining);
      if (remaining <= 0) clearInterval(iv);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [surveyPending]);

  // Auto-cancel or auto-claim when user returns to the app
  useEffect(() => {
    if (!surveyPending) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const elapsed = Math.floor((Date.now() - surveyPending.openedAt) / 1000);
      if (elapsed >= SURVEY_WAIT) {
        // Timer completed — auto-claim points
        doSurvey();
        setSurveyPending(null);
        setShowSurveys(false);
        fire(`✅ Encuesta completada · +${cfg.surveyPts} pts`);
      } else {
        // Returned too early — cancel
        setSurveyPending(null);
        fire('❌ Encuesta cancelada · Permanecé al menos 1:30 min en la página');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [surveyPending, doSurvey, cfg.surveyPts, fire, setShowSurveys]);

  // Codigo de tarjeta con prefijo dinamico segun tier actual
  const tierPrefix = CARD_PREFIX[cTier.name] || 'CTOD';
  const displayCode = (() => {
    const c = me.cardId;
    if (c) {
      const m = c.match(/^CT[OPB]D-(\d+)$/);
      if (m) return tierPrefix + '-' + m[1];
    }
    // Fallback: extraer solo digitos del UUID para generar codigo numerico
    const digits = String(me.id).replace(/[^0-9]/g, '');
    return tierPrefix + '-' + digits.slice(-5).padStart(5, '0');
  })();

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
  const myRedeemed = (redeemedList || []).filter(rd => rd.memberId === me.id);
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
          <button onClick={logout} title="Cerrar sesión" style={{
            width: 36, height: 36, borderRadius: 10,
            background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F5',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #E0E0E0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#9E9E9E',
          }}>
            <Logout />
          </button>
        </div>
      </div>

      {/* Tier Card */}
      {(() => {
        const pg = tierProgress(me.gallons, cTier);
        const tierBg = cTier.name === 'BLACK'
          ? 'radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #050508 40%, #000 100%)'
          : cTier.name === 'PLATINO'
          ? 'linear-gradient(135deg,#9E9E9E 0%,#BDBDBD 30%,#CFD8DC 60%,#BDBDBD 100%)'
          : 'linear-gradient(135deg,#FBBC04 0%,#FFD540 50%,#FBBC04 100%)';
        const tierShadow = cTier.name === 'BLACK'
          ? '0 12px 40px rgba(0,0,0,.6)'
          : cTier.name === 'PLATINO'
          ? '0 6px 24px rgba(21,101,192,.2)'
          : '0 8px 32px rgba(251,188,4,.25)';
        const tierBorder = cTier.name === 'BLACK'
          ? 'none'
          : cTier.name === 'PLATINO'
          ? '2px solid #1565C0'
          : '2px solid #E6A800';
        const txtCol = cTier.color;
        const barBg = cTier.name === 'BLACK' ? 'rgba(255,255,255,.15)' : cTier.name === 'PLATINO' ? 'rgba(0,0,0,.15)' : 'rgba(0,0,0,.08)';
        const barFill = cTier.name === 'BLACK' ? '#fff' : cTier.name === 'PLATINO' ? '#1565C0' : '#000';
        const sepCol = cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : cTier.name === 'PLATINO' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.06)';

        const bens = [
          { i: '⛽', t: `1 pt por cada Q${cfg.qPerPt}` },
          ...(cTier.discount > 0 ? [{ i: '💰', t: `Descuento Q${cTier.discount.toFixed(2)}/galón` }] : []),
          ...(cTier.redeemDisc > 0 ? [{ i: '🏷️', t: `-${Math.round(cTier.redeemDisc * 100)}% en canje de premios` }] : []),
          { i: '📶', t: 'WiFi ilimitado' },
          ...(cTier.bath ? [{ i: '🚻', t: 'Acceso a baños' }] : []),
          { i: '🎂', t: `${cTier.evtPts} pts en eventos especiales` },
          { i: '🎟️', t: `Rifa mensual (${cfg.ticketPts} pts = 1 boleto)` },
        ];

        return (
          <div style={{
            borderRadius: 20, padding: 20, margin: '10px 20px',
            background: tierBg, color: txtCol,
            position: 'relative', overflow: 'hidden',
            boxShadow: tierShadow, border: tierBorder,
          }}>
            <TierDeco name={cTier.name} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              {/* Tier name + base gallons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>{cTier.icon} {cTier.name}</div>
                {cTier.base > 0 && <div style={{ fontSize: 11, opacity: .6, fontWeight: 700 }}>{cTier.base}+ gls</div>}
              </div>

              {/* Benefits */}
              {bens.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: `1px solid ${sepCol}`,
                  fontSize: 13, fontWeight: 600,
                }}>
                  <span style={{ width: 28, textAlign: 'center' }}>{b.i}</span>
                  <span>{b.t}</span>
                </div>
              ))}

              {/* Progress bar */}
              {cTier.next && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: .6, marginBottom: 6, fontWeight: 700 }}>
                    <span>Siguiente: {cTier.next}</span>
                    <span style={sMono}>{me.gallons.toFixed(0)}/{cTier.target} gal</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: barBg }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${pg}%`,
                        background: barFill,
                        transition: 'width 1s ease',
                      }} />
                    </div>
                    {pg > 0 && (
                      <div style={{
                        position: 'absolute', top: -18,
                        left: `${Math.min(pg, 95)}%`, transform: 'translateX(-50%)',
                        fontSize: 10, fontWeight: 800, ...sMono, whiteSpace: 'nowrap',
                      }}>
                        {me.gallons.toFixed(0)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, opacity: .5, marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
                    Faltan {cTier.rem} galones para {cTier.next}
                  </div>
                </div>
              )}
              {!cTier.next && (
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, fontWeight: 700, opacity: .6 }}>
                  ⭐ ¡Nivel máximo alcanzado! · {me.gallons.toFixed(0)} galones
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
      <div onClick={() => {
        if (mySurveyCount >= cfg.surveyDaily) return;
        setShowSurveys(true);
      }} style={{
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
            <QRCode code={displayCode} sz={150} scanColor={TH.pri} />
            <div style={{ fontSize: 11, color: qrS.txtCol, marginTop: 12, fontWeight: 600 }}>
              Mostrá tu código en cada compra
            </div>
            {(
              <div style={{ marginTop: 8, padding: '6px 14px', borderRadius: 10, background: 'rgba(0,0,0,.08)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>💳</span>
                <span style={{ ...sMono, fontSize: 11, fontWeight: 800, color: qrS.txtCol }}>{displayCode}</span>
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
                    {a.type === 'registro' ? '🎉' : a.type === 'compra' ? '⛽' : a.type === 'canje' ? '🎁' : a.type === 'rifa' ? '🎟️' : a.type === 'encuesta' ? '📋' : '⭐'}
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

      {/* My Redemptions toggle */}
      <div style={{ padding: '0 20px 16px' }}>
        <button onClick={() => setShowRedeemed(!showRedeemed)} style={{
          width: '100%', background: cTier.name !== 'ORO' ? TH.cardBg : '#FAFAFA',
          border: cTier.name !== 'ORO' ? TH.cardBorder : '1px solid #eee',
          borderRadius: 14, padding: 14, fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
        }}>
          🎁 Mis Canjes ({myRedeemed.length}) {showRedeemed ? '▲' : '▼'}
        </button>
      </div>

      {/* Redeemed list */}
      {showRedeemed && (
        <div style={{ animation: 'fadeUp .3s ease', padding: '0 20px 16px' }}>
          {myRedeemed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9E9E9E', fontSize: 13 }}>
              Aún no has canjeado premios
            </div>
          ) : (
            myRedeemed.map((rd, i) => (
              <div key={rd.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < myRedeemed.length - 1 ? `1px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.04)' : '#F0F0F0'}` : 'none',
                animation: `slideIn .3s ${i * 0.03}s both`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.05)' : '#E3F2FD',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {rd.reward?.icon || '🎁'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: cTier.name === 'BLACK' ? '#E0E0E0' : '#424242' }}>
                    {rd.reward?.name || 'Premio'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9E9E9E', ...sMono, marginTop: 2 }}>
                    {rd.date} · Código: {rd.code}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...sMono, fontSize: 13, fontWeight: 800, color: '#C62828' }}>
                    -{rd.cost} pts
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, marginTop: 2,
                    color: rd.collected ? '#2E7D32' : '#FF8F00',
                  }}>
                    {rd.collected ? '✅ Recogido' : '⏳ Pendiente'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Stations modal */}
      {showMap && (
        <div onClick={() => setShowMap(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'fadeUp .25s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: cTier.name === 'BLACK' ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 380, width: '100%', padding: '24px 20px',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⛽</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                Nuestras Estaciones
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>Gasolineras Turkaj</div>
            </div>

            {(stations.length > 0 ? stations : [
              { name: 'Turkaj I', address: '' },
              { name: 'Turkaj II', address: '' },
              { name: 'Turkaj III', address: '' },
            ]).filter(s => s.active !== false).map((s, i, arr) => (
              <div key={s.id || s.name} style={{
                padding: '14px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#F0F0F0'}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: cTier.name === 'BLACK' ? 'rgba(251,188,4,.1)' : '#FFF8E1',
                    border: cTier.name === 'BLACK' ? '1px solid rgba(251,188,4,.2)' : '1px solid #FFE082',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    ⛽
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: cTier.name === 'BLACK' ? '#FFD54F' : '#0D0D0D' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: cTier.name === 'BLACK' ? 'rgba(255,255,255,.5)' : '#757575', marginTop: 3, lineHeight: 1.4 }}>
                      {s.address ? `📍 ${s.address}` : 'Dirección no disponible'}
                    </div>
                    {/* Navigation buttons */}
                    {(s.lat && s.lng) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                            background: cTier.name === 'BLACK' ? 'rgba(66,133,244,.15)' : '#E8F0FE',
                            border: cTier.name === 'BLACK' ? '1px solid rgba(66,133,244,.3)' : '1px solid #C5DAF6',
                            fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                            color: cTier.name === 'BLACK' ? '#8AB4F8' : '#1A73E8',
                          }}>
                          🗺️ Google Maps
                        </a>
                        <a href={`https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                            background: cTier.name === 'BLACK' ? 'rgba(51,208,219,.12)' : '#E0F7FA',
                            border: cTier.name === 'BLACK' ? '1px solid rgba(51,208,219,.3)' : '1px solid #B2EBF2',
                            fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans'",
                            color: cTier.name === 'BLACK' ? '#33D0DB' : '#00838F',
                          }}>
                          🚗 Waze
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setShowMap(false)} style={{
              width: '100%', marginTop: 16, padding: 14, borderRadius: 14,
              background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
              cursor: 'pointer',
            }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Survey station selection modal */}
      {showSurveys && (
        <div onClick={() => setShowSurveys(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'fadeUp .25s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: cTier.name === 'BLACK' ? '#1A1A2E' : '#fff',
            borderRadius: 24, maxWidth: 380, width: '100%', padding: '24px 20px',
            border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                Encuesta Shell
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>
                Seleccioná la estación donde cargaste combustible
              </div>
              <div style={{ ...sMono, fontSize: 12, fontWeight: 800, color: cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0', marginTop: 8 }}>
                {mySurveyCount}/{cfg.surveyDaily} hoy · +{cfg.surveyPts} pts por encuesta
              </div>
            </div>

            {(() => {
              // Resolve last station name (could be UUID, name, or empty)
              const raw = me.station || '';
              const fromId = (stations || []).find(st => st.id === raw)?.name || '';
              const lastName = fromId || raw;

              return [
                { name: 'Turkaj I', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700531' },
                { name: 'Turkaj II', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700717' },
                { name: 'Turkaj III', url: 'https://tellshell.shell.com/GTM?source=smartQR&s=10700211' },
              ].map((s) => {
                const isLast = lastName && lastName === s.name;
                return (
                <div key={s.name}
                  onClick={() => {
                    if (surveyPending) return; // already waiting
                    window.open(s.url, '_blank');
                    setSurveyPending({ openedAt: Date.now(), stationName: s.name });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 12px', marginBottom: 8, borderRadius: 16,
                    cursor: surveyPending ? 'default' : 'pointer',
                    opacity: surveyPending ? (surveyPending.stationName === s.name ? 1 : 0.4) : 1,
                    background: isLast
                      ? (cTier.name === 'BLACK' ? 'rgba(251,188,4,.1)' : '#FFF8E1')
                      : (cTier.name === 'BLACK' ? 'rgba(255,255,255,.04)' : '#F9F9F9'),
                    border: isLast
                      ? (cTier.name === 'BLACK' ? '2px solid rgba(251,188,4,.3)' : '2px solid #FFE082')
                      : (cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.06)' : '1px solid #eee'),
                    transition: 'transform .15s',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: cTier.name === 'BLACK' ? 'rgba(100,181,246,.1)' : '#E3F2FD',
                    border: cTier.name === 'BLACK' ? '1px solid rgba(100,181,246,.2)' : '1px solid #BBDEFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    ⛽
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 800,
                      color: cTier.name === 'BLACK' ? (isLast ? '#FFD54F' : '#E0E0E0') : '#0D0D0D',
                    }}>
                      {s.name}
                    </div>
                    {isLast && (
                      <div style={{
                        fontSize: 10, fontWeight: 800, marginTop: 3,
                        color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        📍 Última visita
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10,
                    background: surveyPending?.stationName === s.name
                      ? (cTier.name === 'BLACK' ? 'rgba(251,188,4,.15)' : '#FFF8E1')
                      : (cTier.name === 'BLACK' ? 'rgba(100,181,246,.15)' : '#E3F2FD'),
                    color: surveyPending?.stationName === s.name
                      ? (cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500')
                      : (cTier.name === 'BLACK' ? '#64B5F6' : '#1565C0'),
                  }}>
                    {surveyPending?.stationName === s.name ? '⏳ Esperando' : 'Llenar →'}
                  </div>
                </div>
              );
              });
            })()}

            {/* Pending survey: countdown */}
            {surveyPending && (
              <div style={{
                background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.06)' : '#FFF8E1',
                borderRadius: 16, padding: 16, marginBottom: 8, textAlign: 'center',
                border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #FFE082',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: cTier.name === 'BLACK' ? '#FFD54F' : '#F0A500', marginBottom: 6 }}>
                  ⏳ Completá la encuesta de {surveyPending.stationName}
                </div>
                <div style={{ ...sMono, fontSize: 28, fontWeight: 900, color: cTier.name === 'BLACK' ? '#fff' : '#0D0D0D' }}>
                  {Math.floor(surveyCountdown / 60)}:{String(surveyCountdown % 60).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 4 }}>
                  Permanecé en la página de Shell · Los puntos se asignan al volver
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 2, overflow: 'hidden', background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)', marginTop: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 1s linear',
                    width: `${((SURVEY_WAIT - surveyCountdown) / SURVEY_WAIT) * 100}%`,
                    background: cTier.name === 'BLACK' ? '#FFD54F' : '#FBBC04',
                  }} />
                </div>
              </div>
            )}

            <button onClick={() => { if (!surveyPending) setShowSurveys(false); else { setSurveyPending(null); setShowSurveys(false); } }} style={{
              width: '100%', marginTop: 8, padding: 14, borderRadius: 14,
              background: cTier.name === 'BLACK' ? 'rgba(255,255,255,.08)' : '#F5F5F5',
              border: cTier.name === 'BLACK' ? '1px solid rgba(255,255,255,.1)' : '1px solid #eee',
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
              color: cTier.name === 'BLACK' ? '#ccc' : '#424242',
              cursor: 'pointer',
            }}>
              {surveyPending ? 'Cancelar' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
