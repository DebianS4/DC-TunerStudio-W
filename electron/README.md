# DC-Tuner Studio para Windows con Electron

Guía para generar tu propio `.exe` (instalador NSIS) de DC-Tuner Studio. No incluye ni
redistribuye TunerStudio MS: empaqueta únicamente este proyecto.

## Cómo funciona

- La app se compila como sitio estático (sin servidor ni base de datos).
- Electron sirve esos archivos con un protocolo propio `app://dc-tuner/`, así las rutas
  absolutas (`/assets/...`) siguen funcionando sin levantar ningún servidor local.
- Cualquier ruta desconocida cae en `index.html`, de modo que `/fuel`, `/charts`, etc.
  abren bien incluso sin recargar.
- Web Serial está habilitado: el diálogo de puerto USB funciona dentro de la ventana.

## Requisitos

- Node.js 20 o superior.
- Windows para generar el instalador (o Linux/macOS con Wine para el target win).

## Paso 1: compilar la app web

En la raíz del proyecto:

```bash
STATIC_BUILD=1 npm run build
```

El resultado queda en `.output/public`.

## Paso 2: copiar el build dentro de Electron

Windows (PowerShell):

```powershell
Remove-Item -Recurse -Force electron\web -ErrorAction SilentlyContinue
New-Item -ItemType Directory electron\web | Out-Null
Copy-Item -Recurse .output\public\* electron\web
```

Linux/macOS:

```bash
rm -rf electron/web && mkdir -p electron/web
cp -r .output/public/. electron/web/
```

Debe existir `electron/web/index.html`. Si falta, la app muestra un aviso en consola.

## Paso 3: instalar dependencias de Electron

```bash
cd electron
npm install
```

## Paso 4: probar antes de empaquetar

```bash
npm start
```

Se abre una ventana con DC-Tuner Studio. Comprueba que carga, que navega entre secciones
y que el botón Conectar ECU abre el selector de puerto.

## Paso 5: generar el instalador

```bash
npm run dist
```

Sale en `electron/release/DC-Tuner-Studio-Setup-1.0.0.exe`.

- Instalador con acceso directo en escritorio y menú Inicio.
- Nombre, icono y fabricante ya configurados como DC-Tuner Studio.
- Versión portable: `npm run dist:portable`.

## Opción rápida: compilar en GitHub

El repositorio incluye `.github/workflows/windows-build.yml`. GitHub compila el `.exe` por ti:

1. Sube el proyecto a un repositorio de GitHub.
2. Pestaña **Actions** → **Build Windows installer** → **Run workflow**.
3. Al terminar, entra en la ejecución y descarga el artefacto **DC-Tuner-Studio-Windows**.
4. Dentro está `DC-Tuner-Studio-Setup-1.0.0.exe`.

También se genera automáticamente al subir un tag `v*` (por ejemplo `git tag v1.0.0 && git push --tags`)
y en ese caso el `.exe` queda publicado en **Releases** del repositorio.

Notas del workflow:

- Usa `windows-latest` y Node 20, así que el instalador se compila para Windows real.
- `CSC_IDENTITY_AUTO_DISCOVERY=false` evita intentar firmar el ejecutable.
- No requiere claves ni secretos: es una app 100% cliente.

## Firma del ejecutable

Windows SmartScreen muestra "aplicación desconocida" mientras el `.exe` no esté firmado con un
certificado de firma de código. Eso no se puede inventar: hace falta comprar un certificado
(OV o EV) a una autoridad como Sectigo, DigiCert o Certum y verificar tu identidad.

Cuando lo tengas:

1. Exporta el certificado a `.pfx` (o `.p12`).
2. En GitHub: Settings → Secrets and variables → Actions, crea dos secretos:
   - `WIN_CSC_LINK`: el `.pfx` en base64 (`certutil -encode certificado.pfx cert.txt`).
   - `WIN_CSC_KEY_PASSWORD`: la contraseña del `.pfx`.
3. Vuelve a lanzar **Build Windows installer**. El workflow ya pasa esos secretos a
   `electron-builder`, que firma el `.exe` y el instalador.

Sin esos secretos el build sigue funcionando, simplemente el `.exe` queda sin firmar.

Certificado autofirmado: sirve para probar el flujo, pero **no** elimina el aviso de SmartScreen
en otros equipos, porque Windows no confía en él.

## Rutas y archivos importantes

| Archivo | Para qué sirve |
| --- | --- |
| `electron/main.cjs` | Ventana, protocolo `app://`, permisos de Web Serial |
| `electron/package.json` | Metadatos, dependencias y configuración de electron-builder |
| `electron/build/icon.ico` | Icono del ejecutable y de los accesos directos |
| `electron/web/` | Copia del build estático de la app |

## Ajustes habituales

- **Cambiar la URL de datos:** todo vive en el navegador (localStorage) y en la ECU por
  USB; no hay endpoints que configurar.
- **Icono:** reemplaza `electron/build/icon.ico` por otro `.ico` con varios tamaños.
- **Versión:** cambia `version` en `electron/package.json`; el nombre del instalador la usa.
- **Ancho de ventana:** `width`, `height`, `minWidth` y `minHeight` en `main.cjs`.
- **Abrir en el navegador del sistema:** el handler de `setWindowOpenHandler` ya envía los
  enlaces externos al navegador.

## Notas

- El build estático necesita `STATIC_BUILD=1`; sin esa variable el prerender no se genera.
- No se usa Convex ni ninguna API de servidor: la app es 100% cliente.
- La escritura de mapas en la ECU está deshabilitada; el enlace serie solo lee telemetría.
