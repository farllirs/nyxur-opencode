/* ── Gestión de configuración ────────────────────────────── */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

/**
 * Parsea JSONC (JSON con comentarios) eliminando:
 * - Comentarios de línea // y bloque /* * /
 * - Comas finales en objetos/arrays
 */
export function parseJSONC(text) {
  // Eliminar comentarios // y /* */
  const cleaned = text
    .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m)
    // Eliminar comas finales antes de } o ]
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(cleaned);
}

const XDG_CONFIG  = join(homedir(), '.config', 'opencode');
const XDG_DATA    = join(homedir(), '.local', 'share', 'opencode');
const XDG_STATE   = join(homedir(), '.local', 'state', 'opencode');
const XDG_CACHE   = join(homedir(), '.cache', 'opencode');

/**
 * Busca opencode.jsonc con prioridad:
 *   1. XDG_CONFIG_HOME/opencode/opencode.jsonc  (~/.config/opencode/opencode.jsonc)
 *   2. <cwd>/opencode.jsonc  (proyecto-local)
 *   3. <cwd>/.opencode/config.jsonc
 */
export function resolveConfigPath(cwd) {
  const xdgPath = join(XDG_CONFIG, 'opencode.jsonc');
  if (existsSync(xdgPath)) return xdgPath;
  const localPath = join(cwd, 'opencode.jsonc');
  if (existsSync(localPath)) return localPath;
  const dotPath = join(cwd, '.opencode', 'config.jsonc');
  if (existsSync(dotPath)) return dotPath;
  return xdgPath; // fallback a XDG
}

export function loadConfig(cwd) {
  const path = resolveConfigPath(cwd);
  try {
    if (existsSync(path))
      return { config: parseJSONC(readFileSync(path, 'utf-8')), path };
  } catch (e) {
    // Si falla el JSONC, intentar JSON normal como fallback
    try {
      if (existsSync(path))
        return { config: JSON.parse(readFileSync(path, 'utf-8')), path };
    } catch {}
  }
  return { config: {}, path };
}

export function saveConfig(config, filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2));
}

export function loadAgents(cwd) {
  return loadConfig(cwd).config.agents || {};
}

export function getAgentsDir() {
  return join(XDG_DATA, 'agents');
}

export function ensureDirs() {
  [XDG_CONFIG, XDG_DATA, XDG_STATE, XDG_CACHE].forEach(d => mkdirSync(d, { recursive: true }));
}

export { XDG_CONFIG, XDG_DATA, XDG_STATE, XDG_CACHE };
