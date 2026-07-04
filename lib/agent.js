/* ── Sistema de Agentes ──────────────────────────────────── */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { loadConfig, saveConfig, getAgentsDir } from './config.js';
import { colors } from './spinner.js';
import readline from 'readline';

/* ── IO auxiliar ────────────────────────────────────────── */
function question(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

/* ── Formato ────────────────────────────────────────────── */

/**
 * Convierte un agente del formato local (con mode/color/provider/model/temperature)
 * al formato estándar que espera el engine opencode.
 */
export function toEngineFormat(agentConfig) {
  const engine = { ...agentConfig };
  // Mapeo de campos locales → engine
  if (agentConfig.provider) engine.provider = agentConfig.provider;
  if (agentConfig.model) engine.model = agentConfig.model;
  if (agentConfig.temperature !== undefined) engine.temperature = agentConfig.temperature;

  // Permisos → tools (si está en formato de permisos)
  if (agentConfig.permission && !agentConfig.tools) {
    const toolMap = {
      bash: 'bash', edit: 'edit', read: 'read', write: 'write',
      glob: 'glob', grep: 'grep', webfetch: 'webfetch', websearch: 'websearch',
      list: 'list'
    };
    engine.tools = Object.entries(agentConfig.permission)
      .filter(([, v]) => v === 'allow')
      .map(([k]) => toolMap[k])
      .filter(Boolean);
  }

  // mode → no se pasa al engine (es interno)
  delete engine.mode;
  delete engine.color;

  return engine;
}

/**
 * Agrega metadatos (mode, color) para la UI del launcher.
 */
export function fromEngineFormat(engineConfig, meta = {}) {
  return {
    ...engineConfig,
    mode: meta.mode || 'all',
    color: meta.color || '#0055ff'
  };
}

/* ── CRUD ────────────────────────────────────────────────── */

/* ── Helper: soporta config.agents (plural) y config.agent (singular) ── */
export function getAgentsConfig(config) {
  return config.agents || config.agent || {};
}

export function setAgentsConfig(config, agents) {
  if (config.agents !== undefined) config.agents = agents;
  else config.agent = agents;
}

export function listAgents(cwd) {
  const { config, path } = loadConfig(cwd);
  const agents = getAgentsConfig(config);
  const names = Object.keys(agents);

  if (names.length === 0) {
    console.log(` ${colors.yellow}No hay agentes configurados${colors.reset}`);
    console.log(` Usa ${colors.cyan}/create-agent${colors.reset} para crear uno\n`);
    return;
  }

  names.forEach(name => {
    const a = agents[name];
    const toolsList = a.tools || (a.permission ? Object.keys(a.permission) : []);
    console.log(`  ${colors.green}${name}${colors.reset}`);
    if (a.description) console.log(`    Rol: ${a.description}`);
    if (a.provider) console.log(`    Provider: ${a.provider}`);
    if (a.model) console.log(`    Modelo: ${a.model}`);
    if (a.temperature !== undefined) console.log(`    Temperatura: ${a.temperature}`);
    if (toolsList.length > 0) console.log(`    Tools: ${toolsList.join(', ')}`);
    if (a.mode) console.log(`    Modo: ${a.mode}`);
    if (a.subAgents) console.log(`    Sub-agentes: ${a.subAgents.join(', ')}`);
    console.log('');
  });

  console.log(`${colors.dim}Archivo de configuración: ${path}${colors.reset}\n`);
}

export async function createAgent(cwd) {
  console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}║     CREAR NUEVO AGENTE              ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════╝${colors.reset}\n`);

  const name = await question(`${colors.green}?${colors.reset} Nombre del agente: `);
  if (!name) { console.log(`${colors.red}✘ Nombre requerido${colors.reset}`); return; }

  const description = await question(`${colors.green}?${colors.reset} Descripción/Rol: `);

  // Lista de proveedores
  console.log(`\n${colors.yellow}Proveedores:${colors.reset}`);
  const providers = [
    { id: 'opencode', label: 'OpenCode (Zen)' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'google', label: 'Google AI' },
    { id: 'groq', label: 'Groq' },
    { id: 'together', label: 'Together AI' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'local', label: 'Local (ollama, etc.)' }
  ];
  providers.forEach((p, i) => console.log(`  ${colors.cyan}${i + 1}${colors.reset}) ${p.label}`));
  const pIdx = parseInt(await question(`\n${colors.green}?${colors.reset} Proveedor [1]: `)) || 1;
  const provider = providers[Math.max(0, Math.min(pIdx - 1, providers.length - 1))].id;

  // Modelo
  const defaultModel = provider === 'opencode' ? 'big-pickle'
    : provider === 'anthropic' ? 'claude-sonnet-4-20250514'
    : provider === 'openai' ? 'gpt-4o'
    : 'custom';
  const model = await question(`${colors.green}?${colors.reset} Modelo [${defaultModel}]: `) || defaultModel;

  // Temperatura
  const tempStr = await question(`${colors.green}?${colors.reset} Temperatura (0.0-1.0) [0.7]: `);
  const temperature = tempStr ? parseFloat(tempStr) : 0.7;

  // Herramientas
  console.log(`\n${colors.yellow}Herramientas (separadas por coma):${colors.reset}`);
  const allTools = ['bash', 'edit', 'read', 'glob', 'grep', 'write', 'webfetch', 'websearch', 'list'];
  console.log(`  ${colors.dim}Disponibles: ${allTools.join(', ')}${colors.reset}`);
  const toolsStr = await question(`${colors.green}?${colors.reset} Herramientas [todas]: `);
  const tools = toolsStr ? toolsStr.split(',').map(t => t.trim()).filter(Boolean) : allTools;

  // Modo de operación
  console.log(`\n${colors.yellow}Modos de operación:${colors.reset}`);
  const modes = [
    { id: 'all', desc: 'Puede ejecutar cualquier tarea (autónomo)' },
    { id: 'primary', desc: 'Agente principal con límites controlados' },
    { id: 'sub', desc: 'Sub-agente, solo responde cuando otro agente lo invoca' }
  ];
  modes.forEach((m, i) => console.log(`  ${colors.cyan}${i + 1}${colors.reset}) ${m.id} — ${m.desc}`));
  const mIdx = parseInt(await question(`\n${colors.green}?${colors.reset} Modo [1]: `)) || 1;
  const mode = modes[Math.max(0, Math.min(mIdx - 1, modes.length - 1))].id;

  // Reglas personalizadas
  console.log(`\n${colors.yellow}Reglas personalizadas (opcional):${colors.reset}`);
  console.log(`  ${colors.dim}Una por línea, línea vacía para terminar${colors.reset}`);
  const rules = [];
  while (true) {
    const r = await question(`  ${colors.cyan}>${colors.reset} `);
    if (!r) break;
    rules.push(r);
  }

  // Color
  const color = await question(`${colors.green}?${colors.reset} Color HEX [auto]: `) || undefined;

  // Construir config
  const agentConfig = {
    description: description || undefined,
    provider,
    model,
    temperature,
    tools,
    mode,
    rules: rules.length > 0 ? rules : undefined,
    color: color || undefined
  };

  // Guardar en config
  const { config, path } = loadConfig(cwd);
  const agents = getAgentsConfig(config);
  agents[name] = agentConfig;
  setAgentsConfig(config, agents);
  saveConfig(config, path);

  // También guardar copia en agents dir
  const agentsDir = getAgentsDir();
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(join(agentsDir, `${name}.json`), JSON.stringify(agentConfig, null, 2));

  console.log(`\n${colors.green}${colors.bold}✔ Agente '${name}' creado exitosamente${colors.reset}`);
  console.log(`  ${colors.dim}Config: ${path}${colors.reset}`);
  console.log(`  ${colors.dim}Usa: opencode --agent ${name}${colors.reset}\n`);
}

export async function deleteAgent(cwd) {
  const { config, path } = loadConfig(cwd);
  const agents = getAgentsConfig(config);
  const names = Object.keys(agents);

  if (names.length === 0) {
    console.log(` ${colors.yellow}No hay agentes para eliminar${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}Agentes disponibles:${colors.reset}`);
  names.forEach((n, i) => console.log(`  ${colors.cyan}${i + 1}${colors.reset}) ${n}`));

  const idx = parseInt(await question(`\n${colors.green}?${colors.reset} Número a eliminar: `)) || 0;
  const name = names[idx - 1];
  if (!name) { console.log(`${colors.red}✘ Selección inválida${colors.reset}`); return; }

  delete agents[name];
  setAgentsConfig(config, agents);
  saveConfig(config, path);

  // Limpiar archivo suelto
  const agentFile = join(getAgentsDir(), `${name}.json`);
  if (existsSync(agentFile)) unlinkSync(agentFile);

  console.log(`${colors.green}✔ Agente '${name}' eliminado${colors.reset}`);
}

export async function importAgentsFromMarkdown(cwd) {
  const agentsDir = getAgentsDir();
  if (!existsSync(agentsDir)) return;

  const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return;

  const { config, path } = loadConfig(cwd);
  const agents = getAgentsConfig(config);

  for (const file of files) {
    const name = file.replace(/\.md$/, '');
    const content = readFileSync(join(agentsDir, file), 'utf-8');

    // Parse frontmatter simple
    const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) continue;

    const frontmatter = {};
    const lines = match[1].split('\n');
    let currentKey = null;
    for (const line of lines) {
      const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
      if (kv) {
        currentKey = kv[1];
        frontmatter[currentKey] = kv[2].replace(/^"(.*)"$/, '$1');
      } else if (currentKey && line.startsWith('  ')) {
        // Continuación multilínea (como description larga)
        frontmatter[currentKey] += '\n' + line.trim();
      }
    }

    // Parse permisos anidados
    const permMatch = content.match(/^permission:\n([\s\S]*?)^\w/m);
    if (permMatch) {
      const permLines = permMatch[1].split('\n').filter(l => l.trim());
      frontmatter.permission = {};
      for (const pl of permLines) {
        const pm = pl.match(/^\s{2}(\w+):\s*(\w+)/);
        if (pm) frontmatter.permission[pm[1]] = pm[2];
      }
    }

    if (frontmatter.description) {
      agents[name] = {
        description: frontmatter.description,
        provider: frontmatter.provider || 'opencode',
        model: frontmatter.model || undefined,
        temperature: frontmatter.temperature ? parseFloat(frontmatter.temperature) : undefined,
        mode: frontmatter.mode || 'all',
        color: frontmatter.color || undefined,
        tools: frontmatter.permission
          ? Object.entries(frontmatter.permission)
              .filter(([, v]) => v === 'allow')
              .map(([k]) => k)
          : ['bash', 'edit', 'read'],
        rules: content.replace(/^---[\s\S]*?---\n?/, '').trim().split('\n').filter(Boolean)
      };
    }
  }

  setAgentsConfig(config, agents);
  saveConfig(config, path);
}

/* ── Sub-agentes ────────────────────────────────────────── */

/**
 * Resuelve la cadena de sub-agentes para un agente dado.
 * Si un agente tiene `subAgents: ["nombre1", "nombre2"]`, se resuelven.
 */
export function resolveAgentChain(agentName, agents) {
  const chain = [];
  const visited = new Set();
  let current = agentName;

  while (current && !visited.has(current)) {
    visited.add(current);
    const agent = agents[current];
    if (!agent) break;
    chain.push({ name: current, config: agent });
    if (agent.subAgents && Array.isArray(agent.subAgents)) {
      current = agent.subAgents[0]; // sigue la cadena principal
    } else {
      break;
    }
  }

  return chain;
}
