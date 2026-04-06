/**
 * Satış asistanı API (FastAPI) — proje içi sales-agent-api/, uvicorn 127.0.0.1:8000
 * İsteğe bağlı: SALES_AGENT_DIR ile başka yol
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const posRoot = path.join(__dirname, '..');
const bundledDir = path.join(posRoot, 'sales-agent-api');
const agentDir = process.env.SALES_AGENT_DIR
  ? path.resolve(process.env.SALES_AGENT_DIR)
  : bundledDir;

if (!fs.existsSync(agentDir) || !fs.existsSync(path.join(agentDir, 'app', 'main.py'))) {
  console.error('');
  console.error('[sales-agent] Klasör bulunamadı veya app/main.py yok:', agentDir);
  console.error('  Varsayılan: pos-website/sales-agent-api (tek repo içi)');
  console.error('  Özel yol için: set SALES_AGENT_DIR=D:\\...');
  console.error('');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const venvPython = isWin
  ? path.join(agentDir, '.venv', 'Scripts', 'python.exe')
  : path.join(agentDir, '.venv', 'bin', 'python');

const uvicornArgs = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'];

let cmd;
let args;
let useShell = false;
if (fs.existsSync(venvPython)) {
  cmd = venvPython;
  args = uvicornArgs;
  console.log('[sales-agent] venv:', venvPython);
} else {
  cmd = isWin ? 'py' : 'python3';
  args = isWin ? ['-3', ...uvicornArgs] : uvicornArgs;
  useShell = isWin;
  console.warn('[sales-agent] .venv yok; py/python ile deneniyor. Sorun olursa: cd sales-agent-api && python -m venv .venv');
}

const child = spawn(cmd, args, {
  cwd: agentDir,
  stdio: 'inherit',
  shell: useShell,
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

child.on('error', function (err) {
  console.error('[sales-agent]', err.message);
  process.exit(1);
});

child.on('exit', function (code) {
  process.exit(code == null ? 1 : code);
});
