// src/components/ui/PasswordInput.jsx
// Campo de contraseña con UN solo ojo (14-ago, reporte del dueño: en
// los logins aparecían DOS — el nuestro + el nativo del navegador).
// Edge se apaga por CSS (::-ms-reveal en global.css); Samsung Internet
// pinta su ojo dentro de todo type="password" y NO es removible por
// CSS → ahí el campo vive como type="text" enmascarado con
// -webkit-text-security y el único ojo es el nuestro.
// Reemplaza el patrón repetido en los 8 campos de contraseña de la app.
import { useState } from 'react';
import { Eye, EyeOff } from './Icons';

const SAMSUNG = typeof navigator !== 'undefined' && /SamsungBrowser/i.test(navigator.userAgent);

export default function PasswordInput({
  value, onChange, style, wrapStyle, leftIcon, buttonColor = '#9E9E9E', ...rest
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', ...wrapStyle }}>
      {leftIcon}
      <input
        type={!SAMSUNG && !show ? 'password' : 'text'}
        value={value}
        onChange={onChange}
        style={{ ...style, ...(SAMSUNG && !show ? { WebkitTextSecurity: 'disc' } : {}) }}
        {...rest}
      />
      <button type="button" onClick={() => setShow(p => !p)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: buttonColor, display: 'flex', padding: 2,
        }}>
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
