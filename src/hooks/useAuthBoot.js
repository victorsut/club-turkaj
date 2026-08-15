// src/hooks/useAuthBoot.js
// Arranque de la app — extraído de App.jsx en la división del
// 15-ago-2026 (regla de 500 líneas), lógica VERBATIM: el efecto de
// carga inicial (listener de Google OAuth + getSession + limpieza del
// hash + services/bootLoader) y setUserFromSession (SEC.C.1: la
// sesión de Google prueba la identidad server-side vía
// create_member_session_oauth). Recibe los refs anti-carrera de
// useStaffData — por eso App.jsx llama useStaffData ANTES que este
// hook (los refs son estables; el orden de registro de efectos es
// indiferente: las guardas de sbConnected/sesión de useStaffData ya
// toleraban cualquier orden de llegada respecto al boot).
import { useEffect } from 'react';
import { sb } from '../lib/supabaseClient';
import { createMemberSessionOauth } from '../services';
import { loadFromSupabase } from '../services/bootLoader';
import { localDate, utcToLocal } from '../lib/dates';

export default function useAuthBoot({
  viewRef,
  setMe, setCusts, setAuthScreen, setView, setGoogleStep, setRegProfile,
  bootCustsRef, custsFullRef, opsFullRef,
  setRewards, setStores, setPromos, setStations, setCfg,
  setRaffleCal, setCrossYearWins, setOperators,
  setOpRatings, setSbConnected, setSbLoading,
}) {
  // ===== AUTH: Set user from Supabase session =====
  function setUserFromSession(u) {
    if (!u) return;
    const name = u.user_metadata?.full_name || u.email || 'Usuario';
    const email = u.email || '';
    const avatar = u.user_metadata?.avatar_url || '';
    const provider = u.app_metadata?.provider || 'google';

    function buildExisting(m) {
      const parseV = (v) => { if (!v) return []; if (Array.isArray(v)) return v; if (typeof v === 'object') return Object.values(v); try { return JSON.parse(v); } catch { return []; } };
      return {
        // avatar: la BD manda — puede tener la foto PERSONALIZADA de Mi
        // Cuenta; la de Google solo es fallback (1-ago)
        id: m.id, name: m.name, nickname: m.nickname || '', email: m.email || email, avatar: m.avatar_url || avatar || '',
        phone: m.phone || '', dpi: m.dpi || '', plate: m.plate || '',
        nit: m.nit || '', bday: m.birthday || '',
        address: m.address || null,
        points: m.points || 0, gallons: parseFloat(m.gallons) || 0,
        spent: parseFloat(m.spent) || 0, visits: m.visits || 0,
        tickets: m.tickets || 0, redeemed: m.redeemed_count || 0,
        referrals: m.referral_count || 0,
        registered: utcToLocal(m.created_at) || '',
        lastBuy: utcToLocal(m.last_buy) || '',
        station: m.last_station || '',
        cardId: m.card_code || m.physical_cards?.[0]?.card_code || m.card_id || '',
        vehicles: parseV(m.vehicles),
        supabaseUser: true, authProvider: provider,
      };
    }

    if (sb) {
      console.log('[Auth] Looking up member with auth_provider_id:', u.id);

      // Helper: intentar login con resultado de members
      function handleMemberResult(data) {
        if (data?.length > 0) {
          console.log('[Auth] ✅ Existing member found:', data[0].name, '→ logged in');
          const existing = buildExisting(data[0]);
          // (El avatar de Google lo persiste create_member_session_oauth)
          setMe(existing);
          setCusts(p => p.find(c => c.id === existing.id) ? p : [...p, existing]);
          setAuthScreen('logged'); setView('client');
          return true;
        }
        return false;
      }

      // Helper: mostrar registro (solo si no se encontro nada)
      function showRegistration() {
        console.log('[Auth] ❌ No member found → showing registration');
        setMe({
          id: u.id, name, email, avatar,
          phone: '', dpi: '', plate: '', nit: '', bday: '',
          points: 0, gallons: 0, spent: 0, visits: 0, tickets: 0,
          redeemed: 0, referrals: 0, registered: localDate(),
          lastBuy: '', station: '', cardId: '', supabaseUser: true, authProvider: provider,
        });
        setRegProfile(p => ({ ...p, name, email }));
        setAuthScreen('googleProfile'); setView('client');
      }

      // SEC.C.1: la sesión de Google prueba la identidad SERVER-side —
      // create_member_session_oauth busca por auth_provider_id, hace el
      // vínculo por email si aplica, persiste el avatar y emite la
      // sesión de miembro. Sustituye a los 3 SELECT directos (members
      // ya no expone PII por la API abierta).
      createMemberSessionOauth(avatar).then((res) => {
        if (res.ok && res.member) {
          handleMemberResult([res.member]);
          return;
        }
        if (res.notFound) { showRegistration(); return; }
        console.error('[Auth] oauth session:', res.error);
      });
    }
  }

  // ===== SUPABASE DATA LOADING =====
  useEffect(() => {
    if (!sb) { setSbLoading(false); return; }
    let mounted = true;

    // Auth state change listener (only for client/member view)
    const authSub = sb.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (viewRef.current !== 'client') return; // Ignore Google auth for admin/operator
      console.log('[Auth]', event, session?.user?.email || 'no session');
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
        setUserFromSession(session.user);
        // (El toast "👋 Bienvenido" se quitó a pedido del dueño: OAuth
        // re-emite SIGNED_IN en cada apertura y saludaba siempre.)
      }
      if (event === 'SIGNED_OUT') {
        setMe(null); setAuthScreen('login'); setGoogleStep('welcome');
      }
    });

    // Catch existing session (only for client view)
    if (viewRef.current === 'client') {
      sb.auth.getSession().then(({ data: { session } }) => {
        console.log('[Auth] getSession:', session?.user?.email || 'no session');
        if (mounted && session?.user) {
          setUserFromSession(session.user);
        }
      });
    }

    // Clean OAuth hash from URL
    if (window.location.hash?.includes('access_token')) {
      setTimeout(() => {
        window.history?.replaceState(null, '', window.location.pathname);
      }, 1000);
    }

    // Carga inicial (extraída a services/bootLoader.js en la división
    // etapa 2): recibe los setters/refs y aborta sets tras el unmount.
    loadFromSupabase({
      isMounted: () => mounted,
      bootCustsRef, custsFullRef, opsFullRef,
      setRewards, setStores, setPromos, setStations, setCfg,
      setRaffleCal, setCrossYearWins, setCusts, setOperators,
      setOpRatings, setSbConnected, setSbLoading,
    });
    return () => {
      mounted = false;
      authSub?.data?.subscription?.unsubscribe();
    };
  }, []);
}
