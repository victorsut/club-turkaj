-- ============================================================
-- 20260725b — WiFi por estación (red + clave)
-- ============================================================
-- Pedido del dueño (25-jul-2026): el modal WiFi del cliente detecta
-- por geolocalización en qué estación está (o cerca) y muestra la
-- red y contraseña de ESA estación, con opción de copiar la clave.
-- Editable desde Admin → Configuración (la tabla stations ya tiene
-- política RLS abierta de escritura — igual que schedule).
--
-- NULL en wifi_ssid/wifi_password = la estación no ofrece WiFi por
-- app y el modal cae al flujo actual (el operador entrega la clave).
-- ============================================================

ALTER TABLE stations ADD COLUMN IF NOT EXISTS wifi_ssid text;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS wifi_password text;

COMMENT ON COLUMN stations.wifi_ssid IS
'Nombre de la red WiFi de la estación. NULL = sin WiFi autoservicio (el operador entrega la clave).';
COMMENT ON COLUMN stations.wifi_password IS
'Contraseña de la red WiFi de la estación. Visible para clientes PLATINO/BLACK cerca de la estación.';

-- Valores iniciales (dueño, 25-jul-2026)
UPDATE stations SET wifi_ssid = 'TURKAJ 1 RED PUBLIC', wifi_password = 'T12urk@j345' WHERE name = 'Turkaj I';
UPDATE stations SET wifi_ssid = 'TURKAJ 2 RED PUBLIC', wifi_password = 'T12urk@j345' WHERE name = 'Turkaj II';
UPDATE stations SET wifi_ssid = 'TURKAJ 3 RED PUBLI',  wifi_password = 'T12urk@j345' WHERE name = 'Turkaj III';
