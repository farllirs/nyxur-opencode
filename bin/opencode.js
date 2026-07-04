#!/data/data/com.termux/files/usr/bin/node

import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

import { VERSION, ENGINE_VERSION } from '../lib/version.js';
import { colors } from '../lib/spinner.js';
import { getPlatform, getArch, getRunner, isTermux, getEnv } from '../lib/termux.js';
import { resolveConfigPath, loadConfig, ensureDirs } from '../lib/config.js';
import { getBinaryPath, checkBinary, downloadBinary } from '../lib/download.js';
import { handleSlashCommands, showVersion } from '../lib/commands.js';
import { interactiveSetup, cmdSetup } from '../lib/setup.js';
import { importAgentsFromMarkdown } from '../lib/agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN_DIR = join(__dirname, '..', 'bin');
const binaryPath = getBinaryPath(BIN_DIR);

const PASTEL = [
  '\x1b[38;2;179;157;219m',
  '\x1b[38;2;129;212;250m',
  '\x1b[38;2;244;143;177m',
  '\x1b[38;2;165;214;167m',
  '\x1b[38;2;206;147;216m',
  '\x1b[38;2;255;204;188m',
  '\x1b[38;2;179;229;252m',
];

const ART = [
  '███╗   ██╗██╗   ██╗██╗  ██╗██╗   ██╗██████╗ ',
  '████╗  ██║╚██╗ ██╔╝╚██╗██╔╝██║   ██║██╔══██╗',
  '██╔██╗ ██║ ╚████╔╝  ╚███╔╝ ██║   ██║██████╔╝',
  '██║╚██╗██║  ╚██╔╝   ██╔██╗ ██║   ██║██╔══██╗',
  '██║ ╚████║   ██║   ██╔╝ ██╗╚██████╔╝██║  ██║',
  '╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝',
];

function showBanner() {
  console.clear();
  const cols = process.stdout.columns || 80;
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  let frame = 0;

  const render = (color) => {
    const lines = [];
    ART.forEach(line => lines.push(color + line + reset));
    lines.push(dim + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + reset);
    lines.push(dim + 'opencode  v' + VERSION + '  ·  Termux/Android' + reset);
    lines.push(dim + 'FORK NO OFICIAL  ·  Runner: ' + (getRunner() || 'ninguno') + reset);
    lines.push(dim + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + reset);
    return lines.join('\n');
  };

  process.stdout.write('\x1b[1;1H' + '\n'.repeat(2));
  process.stdout.write(render(PASTEL[0]));

  const anim = setInterval(() => {
    frame++;
    process.stdout.write('\x1b[1;1H' + '\n'.repeat(2));
    process.stdout.write(render(PASTEL[frame % PASTEL.length]));
  }, 400);

  return () => {
    clearInterval(anim);
    process.stdout.write('\x1b[1;1H' + '\n'.repeat(2));
    process.stdout.write(render(PASTEL[frame % PASTEL.length]));
    process.stdout.write('\n');
  };
}

function ensureSetup() {
  return interactiveSetup(BIN_DIR);
}

function checkEngineVersion(binPath) {
  try {
    const result = spawnSync(binPath, ['--version'], {
      encoding: 'utf-8', timeout: 5000, stdio: 'pipe'
    });
    const out = (result.stdout || '').trim();
    if (out && !out.includes('unknown') && !out.includes(ENGINE_VERSION)) {
      console.log(` ${colors.yellow}⚠${colors.reset} Engine v${ENGINE_VERSION} esperado, binario reporta: ${out}`);
      console.log(` ${colors.dim}  Ejecuta: opencode /update${colors.reset}\n`);
    }
  } catch {}
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const bypassIndex = rawArgs.indexOf('--bypass');
  let isBypass = bypassIndex !== -1;
  if (isBypass) rawArgs.splice(bypassIndex, 1);

  const noBannerIndex = rawArgs.indexOf('--no-banner');
  const isNoBanner = noBannerIndex !== -1;
  if (isNoBanner) rawArgs.splice(noBannerIndex, 1);

  const setupIndex = rawArgs.indexOf('setup');
  const isSetup = setupIndex !== -1;
  if (isSetup) rawArgs.splice(setupIndex, 1);

  const noSetupCommands = ['/help', '/version', '/doctor', '/changelog'];
  const isNoSetupCmd = rawArgs[0] && noSetupCommands.includes(rawArgs[0].toLowerCase());

  if (isSetup) {
    ensureDirs();
    await cmdSetup(BIN_DIR);
    process.exit(0);
  }

  if (rawArgs[0] === '--version' || rawArgs[0] === '-v') {
    showVersion();
    process.exit(0);
  }
  if (rawArgs[0] === '--help' || rawArgs[0] === '-h') {
    const { showHelp } = await import('../lib/commands.js');
    showHelp();
    process.exit(0);
  }

  if (await handleSlashCommands(rawArgs, process.cwd())) {
    process.exit(0);
  }

  // Re-check --bypass after slash commands
  const bypassIdx2 = rawArgs.indexOf('--bypass');
  if (bypassIdx2 !== -1) {
    isBypass = true;
    rawArgs.splice(bypassIdx2, 1);
  }

  let agentFlag = null;
  const agentIdx = rawArgs.indexOf('--agent');
  if (agentIdx !== -1 && rawArgs[agentIdx + 1]) {
    agentFlag = rawArgs[agentIdx + 1];
    rawArgs.splice(agentIdx, 2);
  }

  if (!isNoSetupCmd) {
    await ensureSetup();
  }

  if (!existsSync(binaryPath)) {
    console.log(`\n ${colors.red}✘ Motor no encontrado.${colors.reset}`);
    console.log(`   Descarga manual: https://github.com/anomalyco/opencode/releases`);
    console.log(`   Luego extrae opencode → opencode.bin en: ${BIN_DIR}\n`);
    process.exit(1);
  }

  checkEngineVersion(binaryPath);

  if (!isNoBanner) {
    const stopBanner = showBanner();
    await new Promise(r => setTimeout(r, 800));
    stopBanner();
  }

  const runner = getRunner();
  let spawnCmd = binaryPath;
  let spawnArgs = rawArgs;

  if (runner === 'grun') {
    spawnCmd = 'grun';
    spawnArgs = [binaryPath, ...rawArgs];
  }

  if (agentFlag) {
    spawnArgs.unshift('--agent', agentFlag);
  }

  const env = {
    ...process.env,
    PATH: `${process.env.PATH}:${join(getEnv().TERMUX_PREFIX, 'bin')}`,
    OPENCODE_MANAGED_BY_FARLLIRS: '1',
    TERM: process.env.TERM || 'xterm-256color'
  };

  if (isBypass) {
    env.OPENCODE_CONFIG_CONTENT = JSON.stringify({
      permission: { bash: 'allow', edit: 'allow', read: 'allow', external_directory: 'allow' }
    });
  }

  const child = spawn(spawnCmd, spawnArgs, { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code || 0));
  child.on('error', (err) => {
    console.error(`\n ${colors.red}Error al iniciar OpenCode:${colors.reset} ${err.message}`);
    console.log(` ${colors.dim}Asegúrate de que el binario existe en: ${binaryPath}${colors.reset}`);
    console.log(` ${colors.dim}Descarga manual: https://github.com/anomalyco/opencode/releases${colors.reset}\n`);
    process.exit(1);
  });
}

main().catch(err => {
  console.error(`\n ${colors.red}Error fatal:${colors.reset} ${err.message}\n`);
  process.exit(1);
});
