---
description: Lista y gestiona los agentes personalizados configurados en el proyecto.
---

Lee el archivo `opencode.jsonc` del directorio actual y lista todos los agentes registrados en la sección `agents`.

Para cada agente muestra:
- **Nombre**
- **Rol** — Descripción principal
- **Proveedor y modelo**
- **Temperatura**
- **Herramientas** habilitadas

Si existen archivos en `.opencode/agents/`, listalos también e indica si hay discrepancias con lo registrado en `opencode.jsonc`.

Al finalizar, pregunta si se desea:
- Crear un nuevo agente con `/create-agent`
- Eliminar uno existente

Sé conciso y directo.
