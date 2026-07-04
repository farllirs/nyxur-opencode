import { VERSION, ENGINE_VERSION } from './version.js';
import { colors } from './spinner.js';
import { listAgents, createAgent, deleteAgent, importAgentsFromMarkdown, getAgentsConfig } from './agent.js';
import { resolveConfigPath, loadConfig } from './config.js';
import { getBinaryPath, checkBinary, downloadBinary, installTermuxDeps } from './download.js';
import { getPlatform, getArch, getRunner, checkPkg, isTermux, getEnv } from './termux.js';
import { cmdSetup } from './setup.js';
import { existsSync, unlinkSync, chmodSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN_DIR = join(__dirname, '..', 'bin');
const binaryPath = getBinaryPath(BIN_DIR);

function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

const CHANGELOG = [
  { version: '1.18.1', changes: [
    'Nuevo comando: opencode setup — instalación interactiva completa',
    'Ya no usa npm postinstall (bloqueado por Termux)',
    'Setup guía al usuario con preguntas antes de descargar',
    'Descarga automatizada: curl, tar, glibc-runner, engine, git, python',
    'Paquete npm reducido: 156MB → 14kB (binario ya no incluido)',
    'Actualizado: opencode /update con confirmación previa',
    'Launcher redirige a opencode setup si faltan componentes',
    'Corregidas referencias a usuario y repositorios',
    'Soporte mejorado para skills (git, python, unzip)',
  ]},
  { version: '1.18.0', changes: [
    'Versión centralizada en lib/version.js',
    'Flag --no-banner para modo scripting',
    'Chequeo de versión del engine vs launcher',
    'Comando /changelog con historial de cambios',
    'Comando /doctor --fix repara automáticamente',
    'Bugfix: importAgentesFromMarkdown filtraba permisos deny',
  ]},
  { version: '1.17.4', changes: [
    'Soporte multi-arquitectura (arm64, x64, arm)',
    'Sistema de agentes con sub-agentes',
    'Comandos slash: /create-agent, /agents, /delete-agent',
    'Diagnóstico /doctor',
    'Descarga automática del motor opencode',
    'Modo bypass con --bypass',
  ]},
];

export function showHelp() {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║       OpenCode  COMANDOS             ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);
  const commands = [
    { cmd: 'setup', desc: 'Instalación interactiva completa del sistema' },
    { cmd: '/setup', desc: 'Instalación interactiva completa del sistema' },
    { cmd: '/create-agent', desc: 'Crear un agente personalizado' },
    { cmd: '/agents', desc: 'Listar agentes configurados' },
    { cmd: '/delete-agent', desc: 'Eliminar un agente existente' },
    { cmd: '/import-agents', desc: 'Importar agentes desde archivos .md' },
    { cmd: '/changelog',   desc: 'Mostrar historial de cambios' },
    { cmd: '/fix-perms', desc: 'Reparar permisos y dependencias' },
    { cmd: '/doctor', desc: 'Diagnóstico completo (/doctor --fix repara)' },
    { cmd: '/update', desc: 'Actualizar el launcher desde GitHub' },
    { cmd: '/version', desc: 'Mostrar información de la versión' },
    { cmd: '/help', desc: 'Mostrar esta ayuda' },
    { cmd: '/bypass', desc: 'Iniciar con permisos totales' }
  ];
  commands.forEach(({ cmd, desc }) => {
    console.log(`  ${colors.cyan}${cmd.padEnd(20)}${colors.reset}${desc}`);
  });
  console.log(`\n${colors.dim}Para iniciar OpenCode, ejecuta sin comandos.${colors.reset}`);
  console.log(`${colors.dim}Usa: opencode --agent <nombre> para usar un agente específico${colors.reset}\n`);
}

export function showChangelog() {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║     HISTORIAL DE CAMBIOS            ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);
  for (const entry of CHANGELOG) {
    const isCurrent = entry.version === VERSION;
    const tag = isCurrent ? `${colors.green}← actual${colors.reset}` : '';
    console.log(`${colors.bold}${colors.yellow}v${entry.version}${colors.reset} ${tag}`);
    for (const change of entry.changes) {
      console.log(`  ${colors.green}•${colors.reset} ${change}`);
    }
    console.log('');
  }
}

export function showVersion() {
  console.log(`${colors.cyan}${colors.bold}opencode${colors.reset} ${colors.green}v${VERSION}${colors.reset}`);
  console.log(`${colors.dim}Paquete:${colors.reset} @nyxur/opencode`);
  const binCheck = checkBinary(binaryPath);
  if (binCheck.ok) {
    console.log(`${colors.dim}Motor:${colors.reset} ${binaryPath} (${(binCheck.size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.log(`${colors.yellow}Motor: No descargado (${binCheck.reason})${colors.reset}`);
  }
  console.log(`${colors.dim}Entorno:${colors.reset} ${os.platform()} ${os.arch()}`);
  if (isTermux) {
    console.log(`${colors.dim}Termux:${colors.reset} ${getEnv().TERMUX_PREFIX}`);
    const runner = getRunner();
    if (runner) console.log(`${colors.dim}Runner:${colors.reset} ${runner}`);
  }
  console.log(`${colors.dim}Config:${colors.reset} ${resolveConfigPath(process.cwd())}\n`);
}

export function showDoctor(cwd, fix = false) {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║     DIAGNÓSTICO DEL SISTEMA         ║${colors.reset}`);
  if (fix) console.log(`${colors.cyan}${colors.bold}║     MODO REPARACIÓN AUTOMÁTICA      ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);

  const checks = [];
  const fixes = [];

  checks.push({
    name: 'Entorno Termux',
    ok: isTermux,
    detail: isTermux ? `PREFIX: ${getEnv().TERMUX_PREFIX}` : 'No detectado'
  });

  checks.push({
    name: 'Node.js',
    ok: true,
    detail: process.version
  });

  const runner = getRunner();
  const needsRunner = isTermux && !runner;
  checks.push({
    name: 'glibc-runner',
    ok: !!runner,
    detail: runner ? `Disponible: ${runner}` : 'No instalado (pkg install glibc-runner)'
  });
  if (needsRunner) fixes.push(() => installTermuxDeps());

  const binCheck = checkBinary(binaryPath);
  checks.push({
    name: 'Motor OpenCode',
    ok: binCheck.ok,
    detail: binCheck.ok ? `${(binCheck.size / 1024 / 1024).toFixed(1)} MB` : `Falta: ${binCheck.reason}`
  });
  if (!binCheck.ok) fixes.push(() => {
    console.log(`   ${colors.yellow}➜${colors.reset} Ejecuta: opencode setup\n`);
  });

  const configPath = resolveConfigPath(cwd);
  const { config } = loadConfig(cwd);
  checks.push({
    name: 'Configuración',
    ok: !!configPath,
    detail: Object.keys(config).length > 0 ? `${configPath} (${Object.keys(config).length} claves)` : `${configPath} (vacía)`
  });

  const agentCount = Object.keys(getAgentsConfig(config) || {}).length;
  checks.push({
    name: 'Agentes',
    ok: agentCount > 0,
    detail: agentCount > 0 ? `${agentCount} agente(s) configurado(s)` : 'Ninguno'
  });

  let hasCurl = false;
  try {
    const r = spawnSync('which', ['curl'], { stdio: 'pipe' });
    hasCurl = r.status === 0;
  } catch {}
  checks.push({
    name: 'curl',
    ok: hasCurl,
    detail: hasCurl ? 'Disponible' : 'No instalado (pkg install curl)'
  });
  if (!hasCurl) fixes.push(() => {
    spawnSync('pkg', ['install', 'curl', '-y'], { stdio: 'inherit', timeout: 60000 });
  });

  checks.forEach(c => {
    const icon = c.ok ? `${colors.green}✔${colors.reset}` : `${colors.red}✘${colors.reset}`;
    const label = c.ok ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${icon} ${c.name.padEnd(20)} ${label.padEnd(6)} ${colors.dim}${c.detail}${colors.reset}`);
  });

  const passed = checks.filter(c => c.ok).length;
  console.log(`\n${colors.bold}Resumen:${colors.reset} ${passed}/${checks.length} checks pasados\n`);

  if (fix && fixes.length > 0) {
    console.log(`${colors.yellow}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}║     REPARANDO ${fixes.length} problema(s)...        ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);
    for (const fixFn of fixes) {
      try { fixFn(); } catch (e) {
        console.log(` ${colors.red}✘ Error en reparación: ${e.message}${colors.reset}`);
      }
    }
    console.log(`\n${colors.green}${colors.bold}✔ Reparación completada. Ejecuta /doctor para verificar${colors.reset}\n`);
  } else if (fix && fixes.length === 0) {
    console.log(`${colors.green}${colors.bold}✔ No hay problemas que reparar${colors.reset}\n`);
  }
}

export function cmdFixPerms(cwd) {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║     REPARAR PERMISOS                ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);

  const paths = [
    { desc: 'Binario OpenCode', path: binaryPath, mode: 0o755 },
    { desc: 'Directorio bin/', path: BIN_DIR, mode: 0o755 },
    { desc: 'Directorio de trabajo', path: cwd, mode: 0o755 },
    { desc: 'Config XDG', path: join(os.homedir(), '.config', 'opencode'), mode: 0o755 }
  ];

  paths.forEach(({ desc, path, mode }) => {
    try {
      if (existsSync(path)) {
        chmodSync(path, mode);
        console.log(`${colors.green}✔${colors.reset} ${desc}: ${colors.dim}permisos corregidos${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} ${desc}: ${colors.dim}no existe${colors.reset}`);
      }
    } catch (e) {
      console.log(`${colors.red}✘${colors.reset} ${desc}: ${e.message}`);
    }
  });

  if (isTermux && !getRunner()) {
    installTermuxDeps();
  }

  console.log(`\n${colors.green}${colors.bold}✔ Proceso completado${colors.reset}\n`);
}

export async function cmdUpdate() {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║     ACTUALIZAR LAUNCHER              ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);

  try {
    const cwd = join(os.homedir(), 'nyxur-opencode');
    const r = spawnSync('git', ['pull'], { cwd, stdio: 'pipe', timeout: 30000, encoding: 'utf-8' });
    const out = (r.stdout || '').trim() + (r.stderr || '').trim();
    if (r.status === 0) {
      if (out.includes('Already up to date')) {
        console.log(` ${colors.green}✔${colors.reset} Ya estás en la última versión\n`);
      } else {
        console.log(` ${colors.green}✔${colors.reset} Launcher actualizado desde GitHub\n`);
        console.log(` ${colors.dim}${out.split('\n').slice(0, 3).join('\n ')}${colors.reset}\n`);
        console.log(` ${colors.yellow}⚠${colors.reset} Se requiere reinstalar el paquete npm para aplicar cambios:\n`);
        console.log(`   cd ${cwd} && npm install -g .\n`);
      }
    } else {
      console.log(` ${colors.red}✘${colors.reset} Error al actualizar:\n`);
      console.log(` ${colors.dim}${out}${colors.reset}\n`);
      console.log(` Actualiza manualmente: cd ${cwd} && git pull && npm install -g .\n`);
    }
  } catch (e) {
    console.log(` ${colors.red}✘${colors.reset} Error: ${e.message}\n`);
  }
}

export async function handleSlashCommands(args, cwd) {
  const cmd = args[0];
  if (!cmd || !cmd.startsWith('/')) return false;

  switch (cmd.toLowerCase()) {
    case '/help': showHelp(); return true;
    case '/version': showVersion(); return true;
    case '/changelog': showChangelog(); return true;
    case '/setup':
      await cmdSetup(BIN_DIR);
      return true;
    case '/doctor':
      showDoctor(cwd, args[1] === '--fix');
      return true;
    case '/create-agent': await createAgent(cwd); return true;
    case '/agents': listAgents(cwd); return true;
    case '/delete-agent': await deleteAgent(cwd); return true;
    case '/import-agents': await importAgentsFromMarkdown(cwd); console.log(`${colors.green}✔ Agentes importados${colors.reset}`); return true;
    case '/fix-perms': cmdFixPerms(cwd); return true;
    case '/update': await cmdUpdate(); return true;
    case '/bypass': args.shift(); args.push('--bypass'); return false;
    default:
      console.log(`${colors.red}✘ Comando desconocido: ${cmd}${colors.reset}`);
      console.log(`  Usa ${colors.cyan}/help${colors.reset} para ver los disponibles`);
      return true;
  }
}
