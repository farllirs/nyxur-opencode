import { spawnSync } from 'child_process';
import readline from 'readline';
import { colors } from './spinner.js';
import { getBinaryPath, checkBinary, downloadBinary, installTermuxDeps } from './download.js';
import { getPlatform, getArch, getRunner, isTermux, checkPkg } from './termux.js';
import { ensureDirs } from './config.js';
import { VERSION, ENGINE_VERSION } from './version.js';

function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

const REQUIRED = [
  { name: 'curl', pkg: 'curl', desc: 'Descargas', critical: true },
  { name: 'tar', pkg: 'tar', desc: 'Extracción archivos', critical: true },
];

const OPTIONAL = [
  { name: 'git', pkg: 'git', desc: 'Clonar repositorios (skills)', critical: false },
  { name: 'python3', pkg: 'python', desc: 'Ejecutar scripts Python (skills)', critical: false },
  { name: 'unzip', pkg: 'unzip', desc: 'Extraer archivos ZIP', critical: false },
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

  const missingRequired = checkPackages(REQUIRED);
  const missingOptional = checkPackages(OPTIONAL);
  const needsRunner = isTermux && !getRunner();
  const binaryPath = getBinaryPath(binDir);
  const binCheck = checkBinary(binaryPath);
  const needsBinary = !binCheck.ok;

  if (missingRequired.length === 0 && !needsRunner && !needsBinary && missingOptional.length === 0) {
    console.log(` ${colors.green}✔${colors.reset} Todos los componentes necesarios están instalados.\n`);
    return true;
  }

  console.log(` ${colors.yellow}⚠${colors.reset} Componentes pendientes:\n`);

  const essentialItems = [];
  if (missingRequired.length > 0) essentialItems.push(...missingRequired);
  if (needsRunner) essentialItems.push({ name: 'glibc-runner', desc: 'Ejecutar binarios glibc', critical: true });
  if (needsBinary) essentialItems.push({ name: 'Motor OpenCode', desc: `Engine v${ENGINE_VERSION}`, critical: true });

  if (essentialItems.length > 0) {
    console.log(` ${colors.bold}Esenciales:${colors.reset}`);
    essentialItems.forEach(p => console.log(`   ${colors.red}•${colors.reset} ${p.name} — ${p.desc}`));
    console.log('');
  }

  if (missingOptional.length > 0) {
    console.log(` ${colors.bold}Opcionales (para skills):${colors.reset}`);
    missingOptional.forEach(p => console.log(`   ${colors.yellow}•${colors.reset} ${p.name} — ${p.desc}`));
    console.log('');
  }

  const ans = await question(` ${colors.green}?${colors.reset} ¿Instalar todos los componentes ahora? [Y/n] `);
  if (ans.toLowerCase() === 'n' || ans.toLowerCase() === 'no') {
    console.log(`\n ${colors.yellow}⚠${colors.reset} Puedes ejecutar 'opencode setup' cuando quieras.\n`);
    return false;
  }

  const toInstall = [...missingRequired, ...missingOptional];
  for (const p of toInstall) {
    process.stdout.write(` ${colors.dim}→${colors.reset} Instalando ${p.name}... `);
    const ok = installPkg(p.pkg);
    if (ok) {
      process.stdout.write(`${colors.green}✔${colors.reset}\n`);
    } else {
      process.stdout.write(`${colors.red}✘${colors.reset}\n`);
      if (p.critical) {
        console.log(`   ${colors.red}Error crítico. Instala manualmente: pkg install ${p.pkg}${colors.reset}\n`);
        return false;
      }
    }
  }

  if (needsRunner) {
    process.stdout.write(` ${colors.dim}→${colors.reset} Instalando dependencias glibc... `);
    const ok = installTermuxDeps();
    process.stdout.write(ok ? `${colors.green}✔${colors.reset}\n` : `${colors.red}✘${colors.reset}\n`);
  }

  if (needsBinary) {
    console.log(`\n ${colors.dim}→${colors.reset} Descargando motor OpenCode...\n`);
    const ok = downloadBinary(binDir);
    if (!ok) {
      console.log(`\n ${colors.red}✘${colors.reset} Error al descargar el motor.`);
      console.log(`   Puedes intentar más tarde con: opencode /update\n`);
      return false;
    }
    console.log(` ${colors.green}✔${colors.reset} Motor v${ENGINE_VERSION} descargado\n`);
  }

  console.log(`${colors.green}${colors.bold}✔ Instalación completada${colors.reset}`);
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
