import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './views/App';
import './styles/global.css';
import { registerServiceWorker } from './lib/swRegistration';

// Code splitting (14-ago): si un chunk dinámico falla al cargar (deploy
// entre medio → el hash viejo ya no existe en Vercel), recargar trae el
// index nuevo con los hashes vigentes en lugar de dejar la vista rota.
// Guard de 60s: sin red la recarga no arregla nada — evitar el bucle.
window.addEventListener('vite:preloadError', (e) => {
  let last = 0;
  try { last = +sessionStorage.getItem('pp_chunk_reload') || 0; } catch { /* sin storage */ }
  if (Date.now() - last < 60000) return;
  try { sessionStorage.setItem('pp_chunk_reload', String(Date.now())); } catch { /* sin storage */ }
  e.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
