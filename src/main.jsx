import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './views/App';
import './styles/global.css';
import { registerServiceWorker } from './lib/swRegistration';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
