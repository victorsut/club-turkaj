// src/views/admin/AdminRaffleForm.jsx
// Form de rifa (8-ago-2026) — movido de Premios y Festivos a la vista
// RIFA (pedido del dueño) y rediseñado al FORMATO GENERAL: modal
// oscuro centrado (patrón ReasonModal), SIN emojis — la FOTOGRAFÍA
// REAL del premio es OBLIGATORIA (se sube al bucket promo-images vía
// /api/upload-promo-image con sesión de admin; el emoji prize_icon
// sobrevive solo como dato de fallback del cliente, sin UI).
// Configuraciones completas acordadas: mes/año, premio, valor Q,
// costo del boleto (vacío = global), plazo y estación de reclamo
// (D22) y detalle privado para el ganador.
import { useState } from 'react';
import { adminTheme as AT, inputStyleDark, sMono } from '../../constants/styles';
import { getAdminToken } from '../../services/sessionTokens';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MAX_IMG_BYTES = 2 * 1024 * 1024; // espeja el límite del bucket

const lbl = { display: 'block', fontSize: 11, fontWeight: 800, color: '#9E9E9E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: .8 };
const hint = { fontSize: 10.5, color: '#777', marginTop: 5, lineHeight: 1.5 };
const selDark = { ...inputStyleDark, appearance: 'none', fontSize: 13, padding: '10px 12px' };

export default function AdminRaffleForm({ editRaf, existing = [], stations = [], cfg, saving, onCancel, onSave, fire }) {
  const [form, setForm] = useState(() => editRaf ? {
    month: String(editRaf.month), year: String(editRaf.year),
    prize_name: editRaf.prize_name || '', prize_value: editRaf.prize_value != null ? String(editRaf.prize_value) : '',
    prize_image_url: editRaf.prize_image_url || '', prize_detail: editRaf.prize_detail || '',
    ticket_points: editRaf.ticket_points != null ? String(editRaf.ticket_points) : '',
    claim_days: editRaf.claim_days != null ? String(editRaf.claim_days) : '',
    claim_station_id: editRaf.claim_station_id || '',
  } : {
    month: '', year: String(new Date().getFullYear()),
    prize_name: '', prize_value: '', prize_image_url: '', prize_detail: '',
    ticket_points: '', claim_days: '', claim_station_id: '',
  });
  const [uploading, setUploading] = useState(false);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // ── Subir la FOTO real del premio (base64 → endpoint con service key) ──
  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      fire('Formato no soportado — usá JPEG, PNG o WebP'); return;
    }
    if (file.size > MAX_IMG_BYTES) { fire('La foto supera 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const base64 = String(reader.result).split(',')[1];
        const res = await fetch('/api/upload-promo-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: getAdminToken()?.token ?? null, contentType: file.type, data: base64 }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) throw new Error(json.error || 'No se pudo subir la foto');
        set('prize_image_url')(json.url);
      } catch (err) {
        fire('Error al subir la foto: ' + err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.month || !form.prize_name.trim() || !form.prize_value) {
      fire('Mes, premio y valor son obligatorios'); return;
    }
    // Regla del dueño (8-ago): toda rifa lleva FOTOGRAFÍA REAL del premio.
    if (!form.prize_image_url) { fire('La fotografía real del premio es obligatoria'); return; }
    const m = parseInt(form.month), y = parseInt(form.year);
    const dup = existing.find(r => r.month === m && r.year === y && r.id !== editRaf?.id);
    if (dup) { fire(`Ya existe una rifa para ${MONTHS[m - 1]} ${y} (${dup.prize_name})`); return; }
    onSave({
      month: m, year: y,
      prize_name: form.prize_name.trim(),
      // Fallback del CLIENTE (sin UI en admin — FORMATO GENERAL sin emojis)
      prize_icon: editRaf?.prize_icon || '🎁',
      prize_value: parseFloat(form.prize_value),
      prize_image_url: form.prize_image_url,
      prize_detail: (form.prize_detail || '').trim() || null,
      ticket_points: form.ticket_points ? parseInt(form.ticket_points) : null,
      // D22: plazo/estación de reclamo (vacío = defaults 15 días / Turkaj 1)
      claim_days: form.claim_days ? parseInt(form.claim_days) : null,
      claim_station_id: form.claim_station_id || null,
    });
  };

  const busy = saving || uploading;

  return (
    <div onClick={() => !busy && onCancel()} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: AT.bg, border: `1px solid ${AT.border}`,
        borderRadius: 20, padding: 24, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 16 }}>
          {editRaf ? 'Editar rifa' : 'Nueva rifa'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Mes *</label>
            <select value={form.month} onChange={e => set('month')(e.target.value)} style={selDark}>
              <option value="">Seleccionar</option>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Año *</label>
            <input value={form.year} onChange={e => set('year')(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="2026" inputMode="numeric" maxLength={4} style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Premio *</label>
          <input value={form.prize_name} onChange={e => set('prize_name')(e.target.value)}
            placeholder="Ej: Bocina JBL Charge 5" style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Valor estimado (Q) *</label>
            <input value={form.prize_value} onChange={e => set('prize_value')(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Ej: 1500" inputMode="decimal" style={{ ...inputStyleDark, ...sMono, fontSize: 13, padding: '10px 12px' }} />
          </div>
          <div>
            <label style={lbl}>Costo del boleto (pts)</label>
            <input value={form.ticket_points} onChange={e => set('ticket_points')(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={`Global: ${cfg?.ticketPts ?? 5}`} inputMode="numeric" style={{ ...inputStyleDark, ...sMono, fontSize: 13, padding: '10px 12px' }} />
          </div>
        </div>

        {/* ── FOTO REAL del premio (obligatoria — regla del dueño 8-ago) ── */}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Fotografía real del premio *</label>
          {form.prize_image_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={form.prize_image_url} alt="Premio"
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 14, border: `1px solid ${AT.border}`, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'transparent', color: '#64B5F6', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                  {uploading ? 'Subiendo...' : 'Cambiar foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} disabled={busy} style={{ display: 'none' }} />
                </label>
                <button onClick={() => set('prize_image_url')('')} disabled={busy}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${AT.border}`, background: 'transparent', color: '#EF5350', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '22px 16px', borderRadius: 14, cursor: uploading ? 'default' : 'pointer',
              border: `1.5px dashed ${AT.border}`, color: uploading ? '#777' : '#9E9E9E',
              fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 700,
            }}>
              {uploading ? 'Subiendo foto...' : 'Elegir foto del premio (JPEG, PNG o WebP, máx 2 MB)'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} disabled={uploading} style={{ display: 'none' }} />
            </label>
          )}
          <div style={hint}>El cliente ve esta foto en su pestaña Rifa — usá una foto real del artículo.</div>
        </div>

        {/* ── D22: plazo y estación de reclamo del ganador ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          <div>
            <label style={lbl}>Plazo para reclamar (días)</label>
            <input value={form.claim_days} onChange={e => set('claim_days')(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="15 (default)" inputMode="numeric" style={{ ...inputStyleDark, ...sMono, fontSize: 13, padding: '10px 12px' }} />
          </div>
          <div>
            <label style={lbl}>Estación de reclamo</label>
            <select value={form.claim_station_id} onChange={e => set('claim_station_id')(e.target.value)} style={selDark}>
              <option value="">{(stations[0]?.name || 'Turkaj 1') + ' (default)'}</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...hint, marginBottom: 12 }}>
          El premio del ganador vence pasado el plazo (desde el sorteo) y ya no puede entregarse.
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>Detalle para el ganador (opcional)</label>
          <textarea value={form.prize_detail} onChange={e => set('prize_detail')(e.target.value)} rows={4}
            placeholder="Ej: Bocina Bluetooth JBL nueva en caja. Pasá a recogerla en Turkaj I (7a Av 6-10 Z1) presentando tu código de canje y tu DPI."
            style={{ ...inputStyleDark, fontSize: 13, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          <div style={hint}>Solo lo ve el GANADOR en su notificación: descripción del regalo y dónde recogerlo.</div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={busy} style={{
            flex: 1, padding: 13, borderRadius: 12, cursor: 'pointer',
            border: `1px solid ${AT.border}`, background: 'transparent', color: '#9E9E9E',
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700,
          }}>Cancelar</button>
          <button onClick={save} disabled={busy} style={{
            flex: 2, padding: 13, borderRadius: 12, cursor: 'pointer', border: 'none',
            background: '#FBBC04', color: '#0D0D0D', opacity: busy ? .7 : 1,
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 800,
          }}>
            {saving ? 'Guardando...' : editRaf ? 'Guardar cambios' : 'Crear rifa'}
          </button>
        </div>
      </div>
    </div>
  );
}
