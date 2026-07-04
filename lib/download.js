import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, renameSync, chmodSync, statSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { spinIndeterminate } from './spinner.js';
import { getPlatform, getArch, checkPkg, isTermux } from './termux.js';
import { ENGINE_VERSION } from './version.js';

export function getBinaryPath(binDir) {
  return join(binDir, 'opencode.bin');
}

export function installTermuxDeps() {
  const s = spinIndeterminate(1, 2, 'Instalando dependencias del sistema...');
  try {
    spawnSync('pkg', ['install', 'glibc-repo', 'glibc-runner', '-y'], {
      stdio: 'pipe', timeout: 120000
    });
    s.succeed();
    return true;
  } catch {
    s.fail('Ejecuta: pkg install glibc-repo glibc-runner -y');
    return false;
  }
}

export function downloadBinary(binDir, version = ENGINE_VERSION) {
  const binaryPath = getBinaryPath(binDir);
  const platform = getPlatform();
  const arch = getArch();

  if (!checkPkg('curl')) {
    const s = spinIndeterminate(1, 2, 'Instalando curl...');
    try {
      spawnSync('pkg', ['install', 'curl', '-y'], { stdio: 'pipe', timeout: 60000 });
      if (checkPkg('curl')) { s.succeed(); }
      else { s.fail('Instala curl: pkg install curl'); return false; }
    } catch { s.fail(); return false; }
  }

  const extension = platform === 'linux' ? '.tar.gz' : '.zip';
  const filename = `opencode-${platform}-${arch}${extension}`;
  const url = `https://github.com/anomalyco/opencode/releases/download/v${version}/${filename}`;
  const tmpFile = join(os.tmpdir(), filename);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const s = spinIndeterminate(1, 2, `Descargando motor v${version} (intento ${attempt}/3)...`);
    try {
      const result = spawnSync('curl', ['-sL', '-o', tmpFile, url], {
        stdio: 'pipe', timeout: 120000
      });
      if (result.status !== 0 || !existsSync(tmpFile) || statSync(tmpFile).size === 0) {
        s.fail(`Intento ${attempt} fallido`);
        if (attempt < 3) continue;
        console.log(`  URL: ${url}`);
        console.log(`  Descarga manual: curl -L -o ${filename} ${url}`);
        console.log(`  Luego extrae y mueve a: ${binaryPath}`);
        return false;
      }

      const sizeMB = (statSync(tmpFile).size / 1024 / 1024).toFixed(1);
      s.succeed(`Motor descargado (${sizeMB} MB)`);

      const s2 = spinIndeterminate(2, 2, 'Extrayendo...');
      mkdirSync(binDir, { recursive: true });

      if (platform === 'linux') {
        spawnSync('tar', ['-xzf', tmpFile, '-C', binDir], { stdio: 'pipe', timeout: 30000 });
      } else {
        spawnSync('unzip', ['-q', '-o', tmpFile, '-d', binDir], { stdio: 'pipe', timeout: 30000 });
      }

      const extractedFile = join(binDir, 'opencode' + (platform === 'windows' ? '.exe' : ''));
      if (existsSync(extractedFile)) {
        if (existsSync(binaryPath)) unlinkSync(binaryPath);
        renameSync(extractedFile, binaryPath);
      }
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
      chmodSync(binaryPath, 0o755);

      s2.succeed();
      return true;
    } catch (err) {
      if (existsSync(tmpFile)) { try { unlinkSync(tmpFile); } catch {} }
      if (attempt < 3) continue;
      s.fail(`Error tras 3 intentos: ${err.message}`);
    }
  }
  return false;
}

export function checkBinary(binaryPath) {
  if (!existsSync(binaryPath)) return { ok: false, reason: 'not_found' };
  try {
    const stat = statSync(binaryPath);
    if (stat.size < 1024 * 1024) return { ok: false, reason: 'too_small', size: stat.size };
    return { ok: true, size: stat.size };
  } catch {
    return { ok: false, reason: 'stat_error' };
  }
}
