# DC-Tuner Studio

Aplicación web de tuning y telemetría para ECUs Speeduino y MegaSquirt (MS2/MS3).

Incluye dashboard en vivo, tablas VE y de encendido 16×16, AFR objetivo, datalogger,
gráficas, diagnóstico, puntos de restauración y herramientas de auto tune.

![DC-Tuner Studio — estación de tuning ECU](https://raw.githubusercontent.com/DebianS4/DC-TunerStudio-W/main/public/dc-tuner-download-hero.png)

## Descarga oficial

Página de descarga: **[debians4.github.io/DC-TunerStudio-W](https://debians4.github.io/DC-TunerStudio-W/download/)**

- [Descargar DC-Tuner Studio para Windows](https://debians4.github.io/DC-TunerStudio-W/downloads/DC-Tuner-Studio-Windows.zip)
- [Descargar el código fuente](https://debians4.github.io/DC-TunerStudio-W/downloads/dc-tuner-studio-source.zip)

## Contenido

- `src/`: aplicación web React/TanStack.
- `convex/`: autenticación y backend Convex.
- `electron/`: configuración para crear el paquete Windows.
- `public/downloads/`: descarga web incluida por el proyecto.
- `releases/dc-tuner-studio-windows.zip`: instalador/scripts para Windows.
- `releases/dc-tuner-studio-source.zip`: copia del código fuente recibido.
- `DC-TunerStudio.bat`: lanzador Windows configurado con la URL pública de GitHub Pages.

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

## Publicación web

La página pública se publica en: https://debians4.github.io/DC-TunerStudio-W/

## Windows

Descomprime `releases/dc-tuner-studio-windows.zip` y ejecuta `Instalar DC-Tuner Studio.bat`.
Se requiere Chrome o Edge para la conexión Web Serial con la ECU.

El lanzador Windows ya apunta a la URL pública definitiva de GitHub Pages.

## Nota de configuración

El proyecto usa Convex para funciones de autenticación/backend y variables de entorno para
secretos de ejecución o firma. No se incluyen claves privadas en este repositorio.
