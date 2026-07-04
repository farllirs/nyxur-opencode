# Aviso de Versión No Oficial

**`@nyxur/opencode` NO es una versión oficial** de [OpenCode](https://opencode.ai) ni está afiliado con [Anomaly](https://anoma.ly) ni sus desarrolladores originales.

## Propósito

Cliente adaptado para ejecutar OpenCode de forma nativa en **Termux (Android)**, eliminando las barreras de instalación típicas en entornos móviles.

## Modificaciones respecto al paquete original

| Aspecto | Original | opencode-termux |
|---|---|---|
| Instalación | Descarga manual del binario | `opencode setup` interactivo |
| Dependencias | Requiere configuración manual | Se instalan automáticamente |
| CLI | Binario nativo | Wrapper Node.js con comandos integrados |
| Agentes | Configuración manual `.md` | Gestor interactivo `/create-agent` |
| Termux | No soportado oficialmente | Detección y adaptación automática |
| Permisos | Configuración manual | Bypass con `/bypass` |
| Actualización | Manual | `/update` integrado |

## Código original

El motor OpenCode pertenece a sus desarrolladores originales y se distribuye bajo los términos de su licencia correspondiente. Este paquete actúa únicamente como un *launcher* que descarga, configura y ejecuta el binario oficial en entornos Android.

## Licencia

Este paquete (el wrapper Node.js, postinstall y documentación) se distribuye bajo **MIT**. El motor OpenCode conserva su licencia original.
