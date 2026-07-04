/* ── Entorno Termux / Sistema ────────────────────────────── */
import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

const TERMUX_PREFIX = process.env.PREFIX || '/data/data/com.termux/files/usr';
const isTermux = !!(
  process.env.PREFIX ||
  process.env.TERMUX_VERSION ||
  existsSync('/data/data/com.termux')
);

export function getEnv() {
  return { TERMUX_PREFIX, isTermux };
}

export function getPlatform() {
  return os.platform() === 'android' ? 'linux' : os.platform();
}

export function getArch() {
  const a = os.arch();
  if (a === 'arm64') return 'arm64';
  if (a === 'x64') return 'x64';
  if (a === 'arm') return 'arm';
  return a;
}

export function getRunner() {
  if (!isTermux) return null;
  if (existsSync(join(TERMUX_PREFIX, 'bin', 'grun'))) return 'grun';
  return null;
}

export function checkPkg(name) {
  try { execSync(`which ${name} 2>/dev/null`, { stdio: 'pipe' }); return true; }
  catch { return false; }
}

export { TERMUX_PREFIX, isTermux };
