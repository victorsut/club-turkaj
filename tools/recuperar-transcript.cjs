// Reproduce Write/Edit/Bash de transcripts JSONL de Claude Code (~/.claude/projects/<proyecto>/*.jsonl)
// dentro de un sandbox para RECUPERAR archivos que vivian en scratchpads borrados.
// Uso: node tools/recuperar-transcript.cjs <carpeta-sandbox> <t1.jsonl> [t2.jsonl ...]
// Preparar antes: <sandbox>/shim con no-ops (git npm npx curl kill sleep gh) y un shim de node que solo deje pasar
// "node -e" / "node -"; sembrar <sandbox>/repo/src y los scratchpads que si sobrevivan en <sandbox>/sp/<8 hex>.
// Origen: sesion 3-sep-2026 (recuperacion de tools/artes). Ver memoria arneses-artes-recuperados.
// Replay cronológico de Write/Edit/Bash de varios transcripts dentro de un sandbox W.
// Uso: node replay3.cjs <W> <transcript1.jsonl> [transcript2.jsonl ...]
const fs = require('fs'), path = require('path'), cp = require('child_process');
const [,, Wraw, ...jsonls] = process.argv;
const W = Wraw.replace(/\\/g, '/');
const SHIM = W + '/shim';
const log = fs.createWriteStream(W + '/replay.log', { flags: 'a' });
const L = (s) => { log.write(s + '\n'); };

function rewrite(s) {
  if (!s) return s;
  return s
    .replace(/C:[\\/]{1,2}Users[\\/]{1,2}gasol[\\/]{1,2}AppData[\\/]{1,2}Local[\\/]{1,2}Temp[\\/]{1,2}claude[\\/]{1,2}C--proyectos-club-turkaj[\\/]{1,2}([0-9a-f]{8})[0-9a-f-]{28}[\\/]{1,2}scratchpad/g, (m, id) => `${W}/sp/${id}`)
    .replace(/\$TMP_SCRATCH/g, `${W}/sp/tmp`)
    .replace(/(?:C:[\\/]{1,2}proyectos[\\/]{1,2}club-turkaj|\/c\/proyectos\/club-turkaj)/g, `${W}/repo`)
    .replace(/C:[\\/]{1,2}Users[\\/]{1,2}gasol[\\/]{1,2}\.claude[\\/]{1,2}projects[\\/]{1,2}C--proyectos-club-turkaj[\\/]{1,2}memory/g, `${W}/memory`)
    .replace(/(^|[\s"'=(])\/tmp\//g, `$1${W}/tmp/`);
}

// eventos
const events = [];
for (const j of jsonls) {
  const results = new Map();
  const lines = fs.readFileSync(j, 'utf8').split('\n').filter(Boolean);
  const tmp = [];
  for (const l of lines) {
    let o; try { o = JSON.parse(l); } catch { continue; }
    const c = o.message && o.message.content; if (!Array.isArray(c)) continue;
    for (const it of c) {
      if (it.type === 'tool_use' && ['Write', 'Edit', 'Bash', 'PowerShell'].includes(it.name)) tmp.push({ id: it.id, name: it.name, input: it.input, ts: o.timestamp || '' });
      if (it.type === 'tool_result') results.set(it.tool_use_id, { err: !!it.is_error, txt: typeof it.content === 'string' ? it.content : JSON.stringify(it.content || '').slice(0, 400) });
    }
  }
  for (const e of tmp) { e.res = results.get(e.id); e.src = j; events.push(e); }
}
// cada sesión arranca en la raíz del repo (el cwd de la herramienta Bash no persiste entre sesiones)
let lastSrc = null;
events.sort((a, b) => a.ts.localeCompare(b.ts));
L(`# ${events.length} eventos`);

let cwd = `${W}/repo`;
const cwdFile = `${W}/.cwd`;
const bashExe = 'C:/Program Files/Git/bin/bash.exe';
let n = 0;
for (const e of events) {
  n++;
  if (e.src !== lastSrc) { cwd = `${W}/repo`; lastSrc = e.src; L(`# --- sesion ${path.basename(e.src).slice(0, 8)}: cwd reiniciado a repo`); }
  const tag = `[${e.ts.slice(0, 19)}] #${n} ${e.name}`;
  if (e.name === 'Write') {
    const fp = rewrite(e.input.file_path);
    if (!fp.startsWith(W)) { L(`${tag} SKIP fuera del sandbox: ${fp}`); continue; }
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, e.input.content);
    L(`${tag} write ${fp}`);
  } else if (e.name === 'Edit') {
    const fp = rewrite(e.input.file_path);
    if (!fp.startsWith(W)) { L(`${tag} SKIP fuera del sandbox: ${fp}`); continue; }
    if (!fs.existsSync(fp)) { L(`${tag} EDIT sin archivo: ${fp}`); continue; }
    const cur = fs.readFileSync(fp, 'utf8');
    const { old_string, new_string, replace_all } = e.input;
    if (!cur.includes(old_string)) { L(`${tag} EDIT no encaja (${e.res && e.res.err ? 'tambien fallo en el original' : 'OJO: en el original SI aplico'}): ${fp} old="${old_string.slice(0, 70).replace(/\n/g, '\\n')}"`); continue; }
    fs.writeFileSync(fp, replace_all ? cur.split(old_string).join(new_string) : cur.replace(old_string, () => new_string));
    L(`${tag} edit ${fp}`);
  } else if (e.name === 'Bash') {
    const cmd = rewrite(e.input.command || '');
    const to = /until|while|sleep [0-9]{2,}/.test(cmd) ? 8000 : 60000;
    const script = `cd "${cwd}" 2>/dev/null || cd "${W}/repo"\n${cmd}\n__rc=$?\npwd > "${cwdFile}"\nexit $__rc\n`;
    fs.writeFileSync(`${W}/.cmd.sh`, script);
    let out = '', rc = 0;
    try {
      out = cp.execFileSync(bashExe, [`${W}/.cmd.sh`], { env: { ...process.env, PATH: `${SHIM.split('/').join('\\')};${process.env.PATH}`, TMP_SCRATCH: `${W}/sp/tmp` }, timeout: to, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (err) { rc = err.status == null ? 'TIMEOUT/SIGNAL' : err.status; out = ((err.stdout || '') + (err.stderr || '')).toString(); }
    try { const c = fs.readFileSync(cwdFile, 'utf8').trim(); if (c) cwd = c; } catch {}
    L(`${tag} rc=${rc} (orig ${e.res ? (e.res.err ? 'ERROR' : 'ok') : '?'}) :: ${cmd.replace(/\s+/g, ' ').slice(0, 160)}`);
    if (rc !== 0) L(`    out: ${out.replace(/\s+/g, ' ').slice(0, 300)}`);
  } else {
    L(`${tag} SKIP PowerShell: ${(e.input.command || '').slice(0, 120)}`);
  }
}
log.end();
console.log('listo:', n, 'eventos ->', W + '/replay.log');
