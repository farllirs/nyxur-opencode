# opencode-termux

**OpenCode para Termux** — Cliente adaptado no oficial para ejecutar [OpenCode](https://opencode.ai) de forma nativa en Android a través de Termux, con instalación vía `setup` y gestor de agentes integrado.

```
npm install -g @nyxur/opencode
```

---

## Características

- **Instalación interactiva** — Ejecuta `opencode setup` y el asistente descarga todo lo necesario.
- **Auto-detección** — Si faltan componentes, el launcher te redirige a `opencode setup`.
- **Multi-arquitectura** — Soporte para `arm64`, `x64` y `x86` en Termux.
- **Gestor de agentes** — Crea, lista y elimina agentes personalizados desde el CLI.
- **Modo bypass** — Activa todos los permisos automáticamente con `/bypass`.
- **Actualización integrada** — `/update` descarga e instala la última versión del motor OpenCode.

## Uso

```bash
# Primera vez — instalar todo
opencode setup

# Iniciar OpenCode
opencode

# Usar un agente específico
opencode --agent xzp-dev

# Listar comandos internos
opencode /help
```

### Comandos internos

| Comando | Descripción |
|---|---|
| `setup` / `/setup` | Instalación interactiva completa |
| `/create-agent` | Crear un agente personalizado |
| `/agents` | Listar agentes configurados |
| `/delete-agent` | Eliminar un agente |
| `/fix-perms` | Reparar permisos y dependencias |
| `/update` | Actualizar el motor OpenCode |
| `/bypass` | Iniciar con todos los permisos permitidos |
| `/version` | Mostrar información de la versión |
| `/help` | Mostrar ayuda |

## Variables de entorno

| Variable | Descripción |
|---|---|
| `OPENCODE_MANAGED_BY_FARLLIRS=1` | Se setea automáticamente al iniciar |
| `OPENCODE_CONFIG_CONTENT` | Configuración inline para modo bypass |

## Arquitectura

```
opencode-termux
├── bin/
│   ├── opencode.js     ← Entry point CLI
│   └── opencode.bin    ← Motor OpenCode (descargado vía setup)
├── lib/
│   ├── setup.js        ← Instalación interactiva
│   ├── commands.js     ← Manejador de comandos slash
│   ├── download.js     ← Descarga del motor
│   ├── agent.js        ← Sistema de agentes
│   ├── termux.js       ← Detección de entorno
│   ├── config.js       ← Configuración XDG
│   ├── spinner.js      ← UI/animaciones
│   └── version.js      ← Versión centralizada
├── postinstall.js      ← Solo informativo
├── package.json
└── README.md
```

## Nota

Este paquete es una **adaptación no oficial** de OpenCode para Termux/Android. No está afiliado con los desarrolladores originales.
