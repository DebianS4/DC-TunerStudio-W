# DC-Tuner Studio

Aplicación web de tuning y telemetría para ECUs Speeduino y MegaSquirt (MS2/MS3).

Incluye dashboard en vivo, tablas VE y de encendido 16×16, AFR objetivo, datalogger,
gráficas, diagnóstico, puntos de restauración y herramientas de auto tune.

## Contenido

- `src/`: aplicación web React/TanStack.
- `convex/`: autenticación y backend Convex.
- `electron/`: configuración para crear el paquete Windows.
- `public/downloads/`: descarga web incluida por el proyecto.
- `releases/dc-tuner-studio-windows.zip`: instalador/scripts para Windows.
- `releases/dc-tuner-studio-source.zip`: copia del código fuente recibido.
- `DC-TunerStudio.bat`: lanzador Windows recibido; actualmente conserva la URL original de Macaly.

## Desarrollo

Requisitos: Node.js y npm.

```bash
npm ci
npm run dev
```

La aplicación de desarrollo queda disponible en `http://localhost:3000`.

## Verificación y compilación

```bash
npm test
npm run build
```

## Windows

Descomprime `releases/dc-tuner-studio-windows.zip` y ejecuta `Instalar DC-Tuner Studio.bat`.
Se requiere Chrome o Edge para la conexión Web Serial con la ECU.

> Antes de distribuir el lanzador Windows con una nueva publicación, actualiza la variable
> `APPURL` de `DC-TunerStudio.bat` y del paquete Windows con la URL definitiva del sitio.

## Nota de configuración

El proyecto usa Convex para funciones de autenticación/backend y variables de entorno para
secretos de ejecución o firma. No se incluyen claves privadas en este repositorio.
