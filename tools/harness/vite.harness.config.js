import base from '../../vite.config.js';
export default { ...base, server: { ...base.server, port: 3100, strictPort: true, open: false } };
