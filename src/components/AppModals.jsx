// src/components/AppModals.jsx
// Capa de MODALES DE NIVEL RAÍZ — extraída de App.jsx en la división
// del 15-ago-2026 (regla de 500 líneas), lógica VERBATIM: los sheets
// y modales que escapan del overflow:hidden del lienzo (confirmación
// de canje desde operador, sheet de canje, sheet de compra, QR del
// miembro, ganador de rifa, bono de día especial), el Toast global y
// el aviso de nueva versión. El estado del modal de GANADOR DE RIFA
// (raffleWin + su efecto R1b.4) también vive acá: este componente es
// su único consumidor. Los estados de cierre animado (rcClosing /
// qrClosing) y sus close* QUEDAN en App.jsx porque el botón físico de
// volver (useBackLayer) los registra allá.
import { useState, useEffect } from 'react';
import { sb } from '../lib/supabaseClient';
import { markRaffleWinnerSeen } from '../services';
import SpecialDayBonusModal from './SpecialDayBonusModal';
import UpdateAvailable from './UpdateAvailable';
import Toast from './ui/Toast';
import RaffleWinnerModal from './RaffleWinnerModal';
import RedeemConfirmRequestModal from './RedeemConfirmRequestModal';
import RedeemConfirmSheet from './RedeemConfirmSheet';
import PurchaseConfirmSheet from './PurchaseConfirmSheet';
import ClientQrSheet from './ClientQrSheet';

export default function AppModals({
  ctx, toast,
  rcClosing, closeRedeemConfirm,
  qrClosing, closeQR,
  setRewardQrCloseSignal, reloadMyRedemptions,
  specialBonusModal, setSpecialBonusModal,
  crossYearWins, setCrossYearWins,
}) {
  const {
    me, isC, dark, fire, cTier, gT, cfg,
    stations, stores, redeem, addPurchase,
    raffleCal, setRaffleCal,
    pendingRedeemConfirm, setPendingRedeemConfirm,
    redeemConfirm, setRedeemConfirm,
    purchaseConfirm, setPurchaseConfirm,
    showQR,
  } = ctx;

  // R1b.4 Rifa — modal de ganador: si el sorteo (draw_due_raffles) me
  // marcó ganador de una rifa que aún no he visto, felicitar UNA vez.
  // La marca de "visto" vive en el SERVIDOR (winner_seen_at — fix
  // 25-jul: con solo localStorage reaparecía en cada dispositivo);
  // localStorage queda como guarda instantánea secundaria.
  const [raffleWin, setRaffleWin] = useState(null);
  useEffect(() => {
    if (!me?.id || (!raffleCal.length && !crossYearWins.length)) return;
    try {
      // Rifa multi-año (8-ago): el pool incluye las sorteadas de OTROS
      // años (la de diciembre se sortea en enero del año siguiente y ya
      // no vive en los 12 slots del año en curso — sin esto el ganador
      // nunca veía su felicitación al cruzar el año).
      const pool = [...raffleCal, ...crossYearWins];
      const win = pool.find(r => r?.winnerId === me.id && r.drawnAt && r.dbId
        && !r.winnerSeenAt
        && !localStorage.getItem(`pp_rafwin_${r.dbId}`));
      if (win) setRaffleWin(win);
    } catch { /* localStorage no disponible */ }
  }, [me?.id, raffleCal, crossYearWins]);

  return (
    <>
      {/* ── Modal confirmación de canje desde operador (dispositivo del
          MIEMBRO) — RedeemConfirmRequestModal responde por RPC ── */}
      {pendingRedeemConfirm && isC && me && (
        <RedeemConfirmRequestModal
          pending={pendingRedeemConfirm}
          dark={dark}
          fire={fire}
          onClose={() => setPendingRedeemConfirm(null)}
          onConfirmed={() => {
            // Pedido del dueño (29-jul): si el QR del premio quedó
            // abierto tras el escaneo, cerrarlo al confirmar.
            setRewardQrCloseSignal(s => s + 1);
            // La entrega se concreta en el POS un instante después
            // (poll de 2s + RPC): recargar los canjes para que el
            // pendiente pase a RECOGIDO sin reabrir la app.
            setTimeout(reloadMyRedemptions, 6000);
          }}
        />
      )}

      {/* ── Sheet confirmación de canje (nivel raíz) ── */}
      {redeemConfirm && isC && me && (
        <RedeemConfirmSheet
          data={redeemConfirm}
          me={me}
          dark={dark}
          closing={rcClosing}
          stations={stations}
          stores={stores}
          onClose={closeRedeemConfirm}
          onConfirm={(reward) => { setRedeemConfirm(null); redeem(reward); }}
        />
      )}

      {/* ── Sheet confirmación de compra (nivel raíz, escapa overflow:hidden) ── */}
      {purchaseConfirm && (
        <PurchaseConfirmSheet
          data={purchaseConfirm}
          gT={gT}
          cfg={cfg}
          onClose={() => setPurchaseConfirm(null)}
          addPurchase={addPurchase}
        />
      )}

      {/* ── Sheet del código QR del miembro (botón central) ── */}
      {showQR && isC && me && (
        <ClientQrSheet
          me={me}
          tierName={cTier.name}
          dark={dark}
          closing={qrClosing}
          onClose={closeQR}
        />
      )}

      {/* Toast (FORMATO GENERAL — severidad e ícono en Toast.jsx) */}
      <Toast toast={toast} dark={isC && dark} />

      {/* ── Modal de ganador de la rifa mensual (R1b.4) ── */}
      {raffleWin && isC && me && (
        <RaffleWinnerModal
          cal={raffleWin}
          name={me.name}
          stations={stations}
          isBlack={dark}
          onClose={() => {
            // Marca de visto en el SERVIDOR (cross-device) + localStorage
            // como guarda instantánea. Reflejar en raffleCal local para
            // que el efecto no lo re-encuentre antes del próximo fetch.
            try { localStorage.setItem(`pp_rafwin_${raffleWin.dbId}`, '1'); } catch { /* noop */ }
            // SEC.C.4: raffle_calendar perdió la escritura abierta (el
            // premio y hasta el winner_id eran editables) — el RPC solo
            // deja al GANADOR marcar su propia felicitación.
            if (sb) markRaffleWinnerSeen(raffleWin.dbId);
            setRaffleCal(p => p.map(r => r?.dbId === raffleWin.dbId
              ? { ...r, winnerSeenAt: new Date().toISOString() } : r));
            // Rifa multi-año: la ganada puede vivir en el pool de otros años
            setCrossYearWins(p => p.map(r => r?.dbId === raffleWin.dbId
              ? { ...r, winnerSeenAt: new Date().toISOString() } : r));
            setRaffleWin(null);
          }}
        />
      )}

      {/* ── Modal celebrativo de bono por día especial (FB.6.2c) ── */}
      <SpecialDayBonusModal
        open={specialBonusModal.open}
        events={specialBonusModal.events}
        bonus={specialBonusModal.bonus}
        memberName={specialBonusModal.memberName}
        tier={me ? cTier : null}
        dark={dark}
        onClose={() => setSpecialBonusModal(prev => ({ ...prev, open: false }))}
      />

      {/* Aviso de nueva version disponible (Service Worker) */}
      <UpdateAvailable />
    </>
  );
}
