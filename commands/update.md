---
description: Verifica la versión del motor OpenCode y lo actualiza si es necesario.
---

Proceso de actualización del motor OpenCode:

1. **Versión actual**: Ejecuta `opencode /version` o lee el binario en `bin/opencode.bin`
2. **Versión disponible**: Consulta https://github.com/anomalyco/opencode/releases para la última versión
3. **Comparación**: Si la versión remota es superior a la local, procede con la actualización
4. **Descarga**: Obtén el binario para `linux-arm64` (o `linux-x64`) desde GitHub Releases
5. **Extracción**: Descomprime y reemplaza `bin/opencode.bin`
6. **Permisos**: `chmod 755 bin/opencode.bin`

Si ya está actualizado, confírmalo. Si no, indica los pasos o sugiere ejecutar `opencode /update` directamente.
