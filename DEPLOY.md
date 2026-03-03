# Club Turkaj v2 — Guía Rápida de Despliegue

## 1. Instalar dependencias
```bash
npm install
```

## 2. Desarrollo local
```bash
npm run dev
# → http://localhost:3000
```

## 3. Build para producción
```bash
npm run build
# → carpeta dist/ lista para deploy
```

## 4. Desplegar en Vercel

### Opción A: CLI
```bash
npx vercel --prod
```

### Opción B: Dashboard
1. Subir a GitHub: `git push origin main`
2. Ir a [vercel.com](https://vercel.com) → Import Project
3. Framework: **Vite**
4. Environment Variables:
   - `VITE_SUPABASE_URL` → tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon key
5. Deploy

## 5. Verificar post-deploy
- [ ] App carga sin errores en consola
- [ ] Supabase conectado (miembros reales aparecen)
- [ ] Login cliente/operador/admin funciona
- [ ] Funciona en WhatsApp in-app browser
- [ ] Animaciones BLACK tier visibles

## Estructura del proyecto
```
club-turkaj/
├── index.html          ← Entry HTML (Vite)
├── package.json        ← Deps: React 18 + Supabase
├── vite.config.js      ← Vite config + chunk splitting
├── vercel.json         ← SPA routing
├── .env.example        ← Variables requeridas
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx              ← Entry point
    ├── styles/global.css     ← Animations + resets
    ├── lib/                  ← Supabase client, tier system
    ├── constants/            ← Config, styles
    ├── hooks/                ← useSupabaseData, useToast
    ├── services/             ← Auth, data, RPC
    ├── components/ui/        ← 9 shared components
    └── views/
        ├── App.jsx           ← Main orchestrator
        ├── admin/            ← 7 admin views
        ├── operator/         ← 5 operator views
        ├── client/           ← 6 client views
        └── shared/           ← Catalog, Rules
```
