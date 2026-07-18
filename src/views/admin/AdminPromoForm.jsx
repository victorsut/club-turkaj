// src/views/admin/AdminPromoForm.jsx
// R1b.2 (D33) — Formulario bottom-sheet de promociones con los campos
// visuales: categoría (chips de la vista PROMOCIONES), vigencia
// mostrada, condiciones, sujeto de imagen (Storage vía serverless) y
// vínculo opcional con una regla del motor PROMO-1. Preview en vivo
// de la card compuesta en 4:3 (vista PROMOCIONES) y 1:1 (home).
import { useEffect, useState } from 'react';
import { inputStyle, btnYellow, adminTheme as AT } from '../../constants/styles';
import PromoCard from '../../components/ui/PromoCard';
import { uploadPromoImage, fetchPromoRules } from '../../services';

const GRADIENTS = [
  { label: 'Dorado',    value: 'linear-gradient(135deg,#FBBC04,#FFD540)' },
  { label: 'Rojo',      value: 'linear-gradient(135deg,#E53935,#EF9A9A)' },
  { label: 'Verde',     value: 'linear-gradient(135deg,#2E7D32,#66BB6A)' },
  { label: 'Azul',      value: 'linear-gradient(135deg,#1565C0,#42A5F5)' },
  { label: 'Morado',    value: 'linear-gradient(135deg,#6A1B9A,#CE93D8)' },
  { label: 'Naranja',   value: 'linear-gradient(135deg,#E65100,#FFA726)' },
  { label: 'Galaxia',   value: 'radial-gradient(ellipse at 20% 30%,#0d0d1a 0%,#050508 60%,#000 100%)' },
  { label: 'Turquesa',  value: 'linear-gradient(135deg,#00695C,#4DB6AC)' },
];
const CATEGORIES = [
  { v: '',            label: 'Sin categoría (solo en "Todas")' },
  { v: 'combustible', label: 'Combustible' },
  { v: 'tienda',      label: 'Tienda' },
  { v: 'servicios',   label: 'Servicios' },
];

const label = { fontSize: 11, fontWeight: 700, color: AT.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 };
const darkInput = { ...inputStyle, background: '#333', border: `1px solid ${AT.border}`, color: AT.txt };

// Selector de color compacto por bloque de texto (swatches + custom).
// A nivel de módulo para no remontar los inputs en cada render.
const ColorRow = ({ title, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <div style={{ width: 92, fontSize: 11, fontWeight: 700, color: AT.sub, flexShrink: 0 }}>{title}</div>
    {['#ffffff', '#0D0D0D', '#FBBC04', '#E53935'].map(c => (
      <div key={c} onClick={() => onChange(c)} style={{
        width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
        border: value === c ? '2px solid #FBBC04' : `2px solid ${AT.border}`,
      }} />
    ))}
    <input type="color" value={value} onChange={e => onChange(e.target.value)}
      style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${AT.border}`, background: 'none', cursor: 'pointer', padding: 1 }} />
  </div>
);

function seedForm(promo) {
  if (!promo || promo === 'new') return {
    title: '', desc: '', icon: '', bg_gradient: GRADIENTS[0].value,
    title_color: '#ffffff', desc_color: '#ffffff', conditions_color: '#ffffff',
    sort_order: '0', active: true,
    image_url: null, category: '', valid_until: '', conditions: '', promo_rule_id: '',
  };
  const base = promo.color || '#ffffff';
  return {
    title: promo.title || '', desc: promo.desc || '', icon: promo.icon || '',
    bg_gradient: promo.bg || GRADIENTS[0].value,
    title_color: promo.text_colors?.title || base,
    desc_color: promo.text_colors?.desc || base,
    conditions_color: promo.text_colors?.conditions || base,
    sort_order: String(promo.sort_order ?? 0), active: promo.active !== false,
    image_url: promo.image_url || null, category: promo.category || '',
    valid_until: promo.valid_until || '', conditions: promo.conditions || '',
    promo_rule_id: promo.promo_rule_id || '',
  };
}

export default function AdminPromoForm({ promo, saving, onCancel, onSubmit, fire }) {
  const isNew = promo === 'new';
  const [f, setF] = useState(() => seedForm(promo));
  const [uploading, setUploading] = useState(false);
  const [rules, setRules] = useState([]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Reglas del motor para el vínculo opcional (documental en v1)
  useEffect(() => {
    fetchPromoRules().then(({ data }) => { if (data) setRules(data); });
  }, []);

  const pickImage = async (file) => {
    if (!file) return;
    setUploading(true);
    const { data: url, error } = await uploadPromoImage(file);
    setUploading(false);
    if (error) { fire('❌ ' + error.message); return; }
    set('image_url', url);
  };

  const submit = () => {
    if (!f.title.trim()) { fire('❌ El título es obligatorio'); return; }
    onSubmit({
      title:       f.title.trim(),
      description: f.desc.trim(),
      icon:        f.icon.trim(),
      bg_gradient: f.bg_gradient,
      text_color:  f.title_color,   // color general/legacy = el del título
      text_colors: { title: f.title_color, desc: f.desc_color, conditions: f.conditions_color },
      sort_order:  parseInt(f.sort_order) || 0,
      image_url:   f.image_url || null,
      category:    f.category || null,
      valid_until: f.valid_until || null,
      conditions:  f.conditions.trim() || null,
      promo_rule_id: f.promo_rule_id || null,
      ...(isNew ? { active: f.active } : {}),
    });
  };

  // Objeto para el preview (mismo shape que consume PromoCard)
  const preview = {
    title: f.title || 'Título de la promo', desc: f.desc, icon: f.icon,
    bg: f.bg_gradient, color: f.title_color, image_url: f.image_url,
    text_colors: { title: f.title_color, desc: f.desc_color, conditions: f.conditions_color },
    conditions: f.conditions, valid_until: f.valid_until || null,
  };

  // Dimensiones REALES de las cards en el dispositivo (la app clampa a
  // 480px de ancho): vista PROMOCIONES = (ancho - padding 14×2 - gap 12)/2;
  // cuadro del home = (ancho - padding 14×2 - gap 10)/2. Las fuentes son
  // px fijos, así que el preview a tamaño real muestra el quiebre de
  // línea y el recorte EXACTOS que verá el cliente.
  const vw = Math.min(typeof window !== 'undefined' ? window.innerWidth : 480, 480);
  const promoCardW = Math.round((vw - 28 - 12) / 2);
  const homeTileW  = Math.round((vw - 28 - 10) / 2);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={() => !saving && !uploading && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: AT.card, border: '1px solid #FBBC04',
          borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480,
          maxHeight: '92vh', overflowY: 'auto', padding: '20px 20px 40px',
        }}
      >
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 4, margin: '0 auto 20px' }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: AT.txt, marginBottom: 16 }}>
          {isNew ? '➕ Nueva promoción' : '✏️ Editar promoción'}
        </div>

        {/* Los tres textos van ENCIMA de la imagen de fondo: Enter agrega
            saltos de línea que la card respeta (pre-line) — acomodá el
            texto para no tapar el arte y controlalo en el preview. */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Título * <span style={{ textTransform: 'none' }}>(Enter = salto de línea)</span></div>
          <textarea value={f.title} rows={2} placeholder={'Ej: 2x Puntos\nen Diésel'}
            onChange={e => set('title', e.target.value)}
            style={{ ...darkInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.35 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Descripción <span style={{ textTransform: 'none' }}>(Enter = salto de línea)</span></div>
          <textarea value={f.desc} rows={2} placeholder={'Ej: Todos los\nmiércoles'}
            onChange={e => set('desc', e.target.value)}
            style={{ ...darkInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.35 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Condiciones / restricciones <span style={{ textTransform: 'none' }}>(Enter = salto de línea)</span></div>
          <textarea value={f.conditions} rows={2} placeholder="Ej: Solo pago en efectivo"
            onChange={e => set('conditions', e.target.value)}
            style={{ ...darkInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.35 }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Categoría</div>
            <select value={f.category} onChange={e => set('category', e.target.value)} style={darkInput}>
              {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Válido hasta</div>
            <input type="date" value={f.valid_until} onChange={e => set('valid_until', e.target.value)} style={darkInput} />
          </div>
        </div>

        {/* Imagen de fondo (Storage) */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Imagen de fondo <span style={{ textTransform: 'none' }}>(900×1200 px, 3:4 — ocupa TODA la card; en el home 1:1 se recorta centrada)</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{
              flex: 1, padding: 11, borderRadius: 12, border: `1px dashed ${AT.border}`,
              textAlign: 'center', cursor: uploading ? 'wait' : 'pointer',
              color: AT.sub, fontSize: 12.5, fontWeight: 700, background: '#2b2b2b',
            }}>
              {uploading ? '⏳ Subiendo...' : f.image_url ? '🔁 Reemplazar imagen' : '📷 Subir imagen'}
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                disabled={uploading}
                onChange={e => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {f.image_url && (
              <button onClick={() => set('image_url', null)} style={{
                padding: '10px 12px', borderRadius: 10, border: `1px solid ${AT.border}`,
                background: 'none', color: '#EF5350', fontFamily: "'DM Sans'", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>
                Quitar
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: AT.sub, marginTop: 6 }}>
            {f.image_url
              ? 'Los textos van encima de la imagen — usá Enter en los campos para que no tapen el arte.'
              : 'Sin imagen, la card usa el degradado y el ícono emoji.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Ícono (emoji)</div>
            <input value={f.icon} placeholder="🎉" onChange={e => set('icon', e.target.value)} style={darkInput} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>Orden</div>
            <input type="number" value={f.sort_order} onChange={e => set('sort_order', e.target.value)} style={darkInput} />
          </div>
        </div>

        {/* Gradiente */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Color de fondo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {GRADIENTS.map(g => (
              <div key={g.value} onClick={() => set('bg_gradient', g.value)} style={{
                height: 36, borderRadius: 10, background: g.value, cursor: 'pointer',
                border: f.bg_gradient === g.value ? '2px solid #FBBC04' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)',
              }}>{g.label}</div>
            ))}
          </div>
        </div>

        {/* Color por bloque de texto (para convivir con el arte del fondo) */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Color por bloque de texto</div>
          <ColorRow title="Título" value={f.title_color} onChange={v => set('title_color', v)} />
          <ColorRow title="Descripción" value={f.desc_color} onChange={v => set('desc_color', v)} />
          <ColorRow title="Condiciones" value={f.conditions_color} onChange={v => set('conditions_color', v)} />
        </div>

        {/* Vínculo con regla del motor (documental en v1) */}
        <div style={{ marginBottom: 12 }}>
          <div style={label}>Regla del motor vinculada <span style={{ textTransform: 'none' }}>(opcional)</span></div>
          <select value={f.promo_rule_id} onChange={e => set('promo_rule_id', e.target.value)} style={darkInput}>
            <option value="">Sin vínculo</option>
            {rules.map(r => <option key={r.id} value={r.id}>{r.name}{r.active ? '' : ' (inactiva)'}</option>)}
          </select>
        </div>

        {/* Activa — solo en CREATE (en edit se gestiona desde la lista) */}
        {isNew && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div onClick={() => set('active', !f.active)} style={{
              width: 44, height: 24, borderRadius: 12, background: f.active ? '#FBBC04' : '#555',
              position: 'relative', cursor: 'pointer', transition: 'background .2s',
            }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: f.active ? 23 : 3, transition: 'left .2s' }} />
            </div>
            <span style={{ fontSize: 13, color: AT.txt, fontWeight: 600 }}>{f.active ? 'Activa' : 'Inactiva'}</span>
          </div>
        )}

        {/* Preview en vivo A TAMAÑO REAL del dispositivo: los quiebres de
            línea y el recorte del home son exactamente los del cliente */}
        <div style={{ marginBottom: 16 }}>
          <div style={label}>Vista previa · tamaño real en el dispositivo</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: promoCardW, flexShrink: 0 }}>
              <PromoCard promo={preview} ratio="3:4" />
              <div style={{ fontSize: 10, color: AT.sub, marginTop: 5, textAlign: 'center' }}>Vista Promociones</div>
            </div>
            <div style={{ width: homeTileW, flexShrink: 0 }}>
              <PromoCard promo={preview} ratio="1:1" />
              <div style={{ fontSize: 10, color: AT.sub, marginTop: 5, textAlign: 'center' }}>Cuadro del home</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${AT.border}`, background: 'none', color: AT.sub, fontFamily: "'DM Sans'", fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={submit} disabled={saving || uploading} style={{ ...btnYellow, flex: 2, padding: 12, fontSize: 14, opacity: (saving || uploading) ? .7 : 1 }}>
            {saving ? 'Guardando...' : isNew ? 'Crear promoción' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
