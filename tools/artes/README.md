# Arneses de calco de los artes de vehículos (F6)

Herramientas con las que se generaron los 50 artes SVG de `src/components/ui/*Trace.js` y
`*Art.jsx` a partir de las referencias en `REFERENCIAS INTERFAZ/VEHÍCULOS/`. Vivían en
scratchpads temporales y en `backups/tools/` (ignorado en git, borrado); se recuperaron el
3-sep-2026 reproduciendo los transcripts de las sesiones y se verificaron regenerando
artes de producción **byte a byte idénticos** (ape, mazda3, grace, xr, zeta, civic y todos
los `*Art.jsx` de gen-arts-mix / gen-arts-auto).

## Instalación

```
cd tools/artes && npm install     # instala potrace aquí; sharp se toma del node_modules raíz
```

Los scripts usan rutas absolutas `C:/proyectos/club-turkaj/...` (referencias, salida a `src/`).

## motor/ — trazadores (escriben `src/components/ui/<key>Trace.js`)

| Script | Modelos | Uso |
|---|---|---|
| `trace-mix.cjs` | Tanda 9 (microbuses, moto taxis, camiones ligeros) + Mazda 3 y Yaris recalcados (E1.23) | `node trace-mix.cjs <key>` |
| `trace-motos.cjs` | 19 motos (estado E1.22, 2-sep) | `node trace-motos.cjs <key>` |
| `trace-autos.js` | Autos livianos, SUV y picops (estado E1.20b, 28-ago) | `node trace-autos.js <key>` |
| `gen-arts-mix.cjs` / `gen-arts-auto.js` | Generan los `*Art.jsx` desde `MODELS` del trazador correspondiente | `node gen-arts-mix.cjs` |
| `verify-*.js`, `verify2.js` | Render de verificación sobre fondo oscuro | |
| `motas.cjs` | Detector de motas claras (tinta clara del arte donde la ref es fondo/pieza oscura) — E1.23b | |
| `sample9.cjs`, `regions9.cjs`, `encerrados9.cjs`, `zoom-mix.cjs`, `crop9.cjs` | Muestreo de anclas, regiones, huecos encerrados y recortes de la tanda 9 | |
| `region.js`, `sample.js`, `rims.js`, `whites.js`, `ambers.js`, `contact.js`, `zoom*.js` | Utilidades de muestreo de la tanda de autos | |
| `add-configs.js`, `add-picops.js`, `fix-configs.js`, `recal-e117.js`, `e118-lamps.js`, `set-verify.js` | Parches históricos que construyeron las configs de autos (ya aplicados) | |
| `trace-*-dbg.js` | Copias instrumentadas: `DBGPX="x,y;x,y" node trace-autos-dbg.js <key>` imprime la clase del píxel en cada etapa sin escribir a `src/` | |

Cada trazador deja `<key>-trace.svg` y `<key>-cls.png` (mapa de clases) en esta carpeta; están ignorados.

## comparador/ — fidelidad ref vs arte

- `comparador.mjs <salida.json> [keys…]`: SSR de los `*Art.jsx` de producción 1:1 sobre la referencia
  (vite + sharp); lee `models.json` (fuente única: key, Art, ref, categoría, nombre, [color fijo]).
- `analizar.mjs [keys…]`: manchas de diff erosionadas 2px por componente → `analisis.json`
  (`const MIN` = umbral de píxeles; 120 = fino).
- `recortes.mjs`, `comparar.mjs` (vs `baseline-e119.json`), `template.html` (visor: inyectar el JSON en `/*__DATA__*/[]`).

## historico/

Primera tanda de motos (18–22 ago): `trace.js` (Navi), `trace-gn.js` (GN125), `trace-multi.js`
(Boxer, Pulsar, Activa, CGL, CRF, GNH, XR, Zeta, Dita, DM, FT, DR, EN, XTZ — incluye las configs
de **Pulsar, CGL y DR** que se creían perdidas), `22ago-*` y snapshots `*.pre-e120.js`.
Sus `require` de potrace aún apuntan al scratchpad original; ajustarlos a `require('potrace')` si se reutilizan.

## Reglas del pipeline (ver memoria del proyecto)

Cero profundidad dibujada (solo degradados por material), verificar sobre fondo oscuro, anclas
medidas por muestreo, fondo vota calificado ≥60 %, despeckle consciente de `mergeInto`, hueco interno
umbral 235, `fillRule` evenodd, sin redondear, dilatación 2px (override por clase con `dilateClasses`),
verificar SIEMPRE con `analizar.mjs` **y** `motas.cjs`.
