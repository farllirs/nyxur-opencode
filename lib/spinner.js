/* ── UI: Spinners y animaciones para terminal ───────────── */
const FRAMES   = ['◴', '◷', '◶', '◵'];
const COLORS   = ['\x1b[36m', '\x1b[38;5;51m', '\x1b[38;5;87m', '\x1b[32m'];
const BAR_W    = 15;
const MAX_LEN  = 52;
const colors   = {
  cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m'
};

function progressBar(pct) {
  const f = Math.floor(pct / 100 * BAR_W);
  return '\x1b[2m' + '█'.repeat(f) + '░'.repeat(BAR_W - f) + '\x1b[0m';
}

/** Spinner cronometrado (operaciones de duración conocida) */
export async function spinTimed(n, total, text, ms) {
  const padded = text.padEnd(MAX_LEN);
  let i = 0, start = Date.now();
  const id = setInterval(() => {
    const e = Math.min((Date.now() - start) / ms * 100, 100);
    const c = COLORS[Math.floor(i / 2) % COLORS.length];
    process.stdout.write(`\r ${c}${FRAMES[i % 4]}\x1b[0m [${n}/${total}] ${padded} ${progressBar(e)} ${Math.floor(e)}%`);
    i++;
  }, 80);
  return new Promise(r => setTimeout(() => {
    clearInterval(id);
    process.stdout.write(`\r \x1b[32m✔\x1b[0m [${n}/${total}] ${padded} ${progressBar(100)} 100%\n`);
    r();
  }, ms));
}

/** Spinner indeterminado (descarga, npm install, etc.) */
export function spinIndeterminate(n, total, text) {
  const padded = text.padEnd(MAX_LEN);
  const barStates = ['\x1b[2m[━━━⬡━━━]\x1b[0m', '\x1b[2m[━━⬡━━━━]\x1b[0m', '\x1b[2m[━⬡━━━━━]\x1b[0m', '\x1b[2m[⬡━━━━━━]\x1b[0m'];
  let i = 0;
  const id = setInterval(() => {
    const c = COLORS[Math.floor(i / 2) % COLORS.length];
    process.stdout.write(`\r ${c}${FRAMES[i % 4]}\x1b[0m [${n}/${total}] ${padded} ${barStates[i % 4]}`);
    i++;
  }, 120);
  return {
    succeed(msg) {
      clearInterval(id);
      process.stdout.write(`\r \x1b[32m✔\x1b[0m [${n}/${total}] ${padded} ${progressBar(100)} 100%\n`);
      if (msg) process.stdout.write(` ${colors.dim}${msg}${colors.reset}\n`);
    },
    fail(msg) {
      clearInterval(id);
      process.stdout.write(`\r \x1b[33m⚠\x1b[0m [${n}/${total}] ${padded} ERROR\n`);
      if (msg) process.stdout.write(` ${colors.dim}${msg}${colors.reset}\n`);
    }
  };
}

export { colors, progressBar };
