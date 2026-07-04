---
description: Activa el modo bypass con todos los permisos en "allow" para sesiones sin restricciones.
---

Activa el modo de permisos totales configurando todas las herramientas como `"allow"`.

**Método 1 — Configuración global (persistente):**
Agrega o actualiza en `opencode.jsonc`:
```jsonc
{
  "permission": {
    "bash": "allow",
    "edit": "allow",
    "read": "allow",
    "external_directory": "allow"
  }
}
```

**Método 2 — Variable de entorno (sesión actual):**
El flag `--bypass` inyecta `OPENCODE_CONFIG_CONTENT` con todos los permisos habilitados solo para la sesión actual.

Confirma que los permisos están activados y advierte sobre los riesgos de seguridad si es necesario.
