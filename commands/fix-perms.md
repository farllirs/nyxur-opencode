---
description: Repara permisos del sistema e instala dependencias faltantes para Termux.
---

Ejecuta los siguientes pasos para reparar permisos y dependencias:

1. **Permisos del binario**: `chmod 755 bin/opencode.bin` si existe
2. **Directorio de trabajo**: `chmod 755 .` (directorio actual)
3. **Directorio .opencode**: `chmod -R 755 .opencode/` si existe
4. **Dependencias Termux**: Si se detecta Termux, ejecuta:
   ```
   pkg install glibc-repo glibc-runner -y
   ```
5. **Verificación**: Confirma que `grun` esté disponible en `$PREFIX/bin/grun`

Muestra el resultado de cada paso de forma clara. Si hay errores, indica el comando manual necesario para resolverlos.
