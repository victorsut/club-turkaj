// src/lib/receiptPrinter.js
// FA-lite (D37) — Renderiza el modelo neutro (receiptModel.js) a HTML
// térmico y lo imprime SIN pestaña intermedia: iframe oculto + print().
// El print de iframe no requiere gesto del usuario → permite el
// auto-print al confirmar el canje; solo queda el diálogo de impresión
// de Android, insaltable desde web. Fallback: pestaña con botón
// (requiere gesto del usuario; se usa desde clicks explícitos).

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function lineHtml(l) {
  switch (l.kind) {
    case 'sep':
      return '<div class="rs"></div>';
    case 'center': {
      const size = l.brand ? 24 : (l.small ? 11 : 15);
      const weight = (l.brand || l.bold) ? 'font-weight:bold;' : '';
      const spacing = l.brand ? 'letter-spacing:4px;' : '';
      return '<div class="rc" style="font-size:' + size + 'px;' + weight + spacing + '">' + esc(l.text) + '</div>';
    }
    case 'kv':
      return '<div class="rr"><span>' + esc(l.k) + ':</span><span>' + esc(l.v) + '</span></div>';
    case 'big':
      return '<div class="rc" style="font-size:20px;font-weight:bold;margin:3px 0">' + esc(l.text) + '</div>';
    case 'code':
      return '<div class="rc"><span class="rk">' + esc(l.text) + '</span></div>';
    default:
      return '';
  }
}

function renderReceiptHtml(receipt, { withButton = false } = {}) {
  // Copias separadas por línea de corte con tijera (doble comprobante D29).
  const copiesHtml = receipt.copies
    .map(c => '<div class="copy">' + c.lines.map(lineHtml).join('') + '</div>')
    .join('<div class="cut"><span>&#9986;</span></div>');

  const button = withButton ? '<button id="pb">IMPRIMIR COMPROBANTE</button>' : '';
  const script = withButton
    ? '<scr' + 'ipt>document.getElementById("pb").addEventListener("click",function(){var b=this;b.style.display="none";window.print();setTimeout(function(){b.style.display="block";},3000);});</scr' + 'ipt>'
    : '';

  return '<!DOCTYPE html><html><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(receipt.docTitle) + '</title>'
    + '<style>'
    + '@page{margin:0;size:auto;}'
    + '*{margin:0;padding:0;box-sizing:border-box;}'
    + "body{font-family:'Courier New',monospace;font-size:14px;color:#000;padding:8px 10px;background:#fff;}"
    + '.rc{text-align:center;}'
    + '.rs{border-top:1px dashed #000;margin:8px 0;}'
    + '.rr{display:flex;justify-content:space-between;margin:4px 0;gap:8px;}'
    + '.rk{font-size:19px;font-weight:bold;letter-spacing:3px;border:2px solid #000;padding:5px 12px;display:inline-block;margin:5px 0;}'
    + '.cut{border-top:1px dashed #000;margin:16px 0;text-align:center;}'
    + '.cut span{position:relative;top:-11px;background:#fff;padding:0 8px;font-size:13px;}'
    + '#pb{display:block;width:90%;margin:16px auto;padding:20px;background:#1976D2;color:#fff;border:none;border-radius:12px;font-size:22px;font-weight:bold;cursor:pointer;font-family:sans-serif;}'
    + '@media print{#pb{display:none!important;}}'
    + '</style></head><body>' + button + copiesHtml + script + '</body></html>';
}

// Imprime vía iframe oculto (sin gesto). El iframe queda vivo 60s para
// no matar el diálogo de impresión abierto; luego se limpia solo.
function printViaIframe(receipt) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(renderReceiptHtml(receipt));
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('[Print] iframe print falló:', e);
    }
    setTimeout(() => { try { iframe.remove(); } catch { /* ya removido */ } }, 60000);
  }, 200);
}

// Fallback: pestaña con botón de imprimir (flujo previo a FA-lite).
// Requiere gesto del usuario (window.open) — usar solo desde clicks.
export function printReceiptTab(receipt) {
  const html = renderReceiptHtml(receipt, { withButton: true });
  if (window.Blob && window.URL && window.URL.createObjectURL) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      return true;
    }
    URL.revokeObjectURL(url);
  }
  return false;
}

// Punto de entrada: intenta iframe; si el entorno lo impide y hay
// gesto disponible, cae a la pestaña con botón.
export function printReceipt(receipt, { allowTabFallback = true } = {}) {
  try {
    printViaIframe(receipt);
    return true;
  } catch (e) {
    console.error('[Print] iframe no disponible:', e);
    if (allowTabFallback) return printReceiptTab(receipt);
    return false;
  }
}
