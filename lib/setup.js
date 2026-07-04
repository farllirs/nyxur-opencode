import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import readline from 'readline';
import { colors } from './spinner.js';
import { getBinaryPath, checkBinary, installTermuxDeps } from './download.js';
import { getPlatform, getArch, getRunner, isTermux, checkPkg } from './termux.js';
import { ensureDirs } from './config.js';
import { VERSION, ENGINE_VERSION } from './version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMMANDS_DIR = join(__dirname, '..', 'commands');
const SKILLS_DIR = join(homedir(), '.config', 'opencode', 'skills');

function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

const REQUIRED = [
  { name: 'curl', pkg: 'curl', desc: 'Descargas' },
  { name: 'tar', pkg: 'tar', desc: 'Extracción archivos' },
  { name: 'git', pkg: 'git', desc: 'Clonar repositorios' },
  { name: 'python3', pkg: 'python', desc: 'Scripts Python' },
  { name: 'unzip', pkg: 'unzip', desc: 'Extraer archivos ZIP' },
  { name: 'ripgrep', pkg: 'ripgrep', desc: 'Búsqueda rápida en archivos' },
  { name: 'jq', pkg: 'jq', desc: 'Procesar JSON' },
  { name: 'yq', pkg: 'yq', desc: 'Procesar YAML' },
];

function checkPackages(list) {
  const missing = [];
  for (const p of list) {
    if (!checkPkg(p.name)) missing.push(p);
  }
  return missing;
}

function installPkg(pkgName) {
  const r = spawnSync('pkg', ['install', pkgName, '-y'], { stdio: 'pipe', timeout: 120000 });
  return r.status === 0;
}

export async function cmdSetup(binDir) {
  console.log(`\n${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║        INSTALACIÓN DE OpenCode          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);
  console.log(` ${colors.dim}◈${colors.reset} Plataforma: ${getPlatform()}-${getArch()}`);
  console.log(` ${colors.dim}◈${colors.reset} Termux: ${isTermux ? 'Sí' : 'No'}`);
  console.log(` ${colors.dim}◈${colors.reset} Engine: v${ENGINE_VERSION}\n`);

  ensureDirs();

  const missingPkgs = checkPackages(REQUIRED);
  const needsRunner = isTermux && !getRunner();
  const binaryPath = getBinaryPath(binDir);
  const binCheck = checkBinary(binaryPath);
  const needsBinary = !binCheck.ok;

  if (missingPkgs.length === 0 && !needsRunner && !needsBinary) {
    console.log(` ${colors.green}✔${colors.reset} Todos los componentes necesarios están instalados.\n`);
    return true;
  }

  console.log(` ${colors.yellow}⚠${colors.reset} Componentes pendientes:\n`);
  console.log(` ${colors.bold}Paquetes:${colors.reset}`);
  if (missingPkgs.length > 0) missingPkgs.forEach(p => console.log(`   ${colors.red}•${colors.reset} ${p.name} — ${p.desc}`));
  if (needsRunner) console.log(`   ${colors.red}•${colors.reset} glibc-runner — Ejecutar binarios glibc`);
  if (needsBinary) console.log(`   ${colors.red}•${colors.reset} Motor OpenCode — Engine v${ENGINE_VERSION}`);
  console.log('');

  const ans = await question(` ${colors.green}?${colors.reset} ¿Instalar todos los componentes ahora? [Y/n] `);
  if (ans.toLowerCase() === 'n' || ans.toLowerCase() === 'no') {
    console.log(`\n ${colors.yellow}⚠${colors.reset} Puedes ejecutar 'opencode setup' cuando quieras.\n`);
    return false;
  }

  for (const p of missingPkgs) {
    process.stdout.write(` ${colors.dim}→${colors.reset} Instalando ${p.name}... `);
    const ok = installPkg(p.pkg);
    if (ok) {
      process.stdout.write(`${colors.green}✔${colors.reset}\n`);
    } else {
      process.stdout.write(`${colors.red}✘${colors.reset}\n`);
      console.log(`   ${colors.red}Error. Instala manualmente: pkg install ${p.pkg}${colors.reset}`);
    }
  }

  if (needsRunner) {
    process.stdout.write(` ${colors.dim}→${colors.reset} Instalando dependencias glibc... `);
    const ok = installTermuxDeps();
    process.stdout.write(ok ? `${colors.green}✔${colors.reset}\n` : `${colors.red}✘${colors.reset}\n`);
  }

  if (needsBinary) {
    console.log(`\n ${colors.yellow}⚠${colors.reset} Motor OpenCode no encontrado.\n`);
    console.log(`   Descárgalo manualmente desde:\n`);
    console.log(`   ${colors.cyan}https://github.com/anomalyco/opencode/releases${colors.reset}\n`);
    console.log(`   Busca ${colors.bold}opencode-linux-${getArch()}.tar.gz${colors.reset}, extrae y renombra el binario como:`);
    console.log(`   ${colors.cyan}${binaryPath}${colors.reset}\n`);
  }

  process.stdout.write(` ${colors.dim}→${colors.reset} Instalando skills... `);
  try {
    mkdirSync(SKILLS_DIR, { recursive: true });
    if (existsSync(COMMANDS_DIR)) {
      const files = readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
      for (const f of files) {
        copyFileSync(join(COMMANDS_DIR, f), join(SKILLS_DIR, f));
      }
      process.stdout.write(`${colors.green}✔${colors.reset} (${files.length} skills)\n`);
    } else {
      process.stdout.write(`${colors.yellow}⚠ skills dir no encontrado${colors.reset}\n`);
    }
  } catch (e) {
    process.stdout.write(`${colors.red}✘ ${e.message}${colors.reset}\n`);
  }

  console.log(`\n${colors.green}${colors.bold}✔ Instalación completada${colors.reset}`);
  console.log(` ${colors.dim}Ejecuta 'opencode' para iniciar OpenCode${colors.reset}\n`);
  return true;
}

export async function interactiveSetup(binDir) {
  const binaryPath = getBinaryPath(binDir);
  const binCheck = checkBinary(binaryPath);
  const needsBinary = !binCheck.ok;
  const needsRunner = isTermux && !getRunner();

  if (!needsBinary && !needsRunner) return true;

  console.log(`\n${colors.bold}${colors.yellow}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}║   CONFIGURACIÓN INCOMPLETA              ║${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}╚══════════════════════════════════════════╝${colors.reset}\n`);
  console.log(` Faltan componentes necesarios para ejecutar OpenCode.\n`);
  if (needsRunner) console.log(` ${colors.yellow}•${colors.reset} glibc-runner (no instalado)`);
  if (needsBinary) console.log(` ${colors.yellow}•${colors.reset} Motor OpenCode (no descargado)`);
  console.log(`\n Ejecuta: ${colors.cyan}opencode setup${colors.reset}`);
  console.log(` Para una instalación completa de todos los componentes.\n`);
  return false;
}
