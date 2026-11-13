# TeleDrive — Bot de Telegram (TypeScript + Telegraf v4)

Bot de Telegram multifunción: nube personal, descarga de videos, consultas de divisas, inteligencia artificial y recordatorios.

## Características

### Nube y descargas
- `/cloud` — Explora y recibe tus archivos guardados (imágenes, videos, audios, documentos) con opciones **Todos**, **Único** y **Rango**.
- `/get <enlace>` — Descarga videos de TikTok, Instagram o YouTube.
- Envío directo de imágenes, videos, audios, notas de voz y documentos para guardarlos automáticamente en tu carpeta personal.

### Inteligencia Artificial y Productividad
- `/ask <pregunta>` o `/ia <pregunta>` — Realiza consultas breves y directas a Google Gemini.
- `/recordatorio <mensaje natural>` — Programa recordatorios en lenguaje natural (ej: `/recordatorio revisar el informe mañana a las 8am`).

### Utilidades
- `/dolar [cantidad]` — Consulta la tasa de cambio USD a COP o convierte una cantidad determinada a pesos colombianos.
- `/start` — Registro del usuario y creación de su espacio de almacenamiento.
- `/help` — Guía completa de comandos disponibles.

### Servidor Web Explorador (GlowPic)
- Servidor HTTP integrado (Express) para autenticación y acceso remoto a los archivos almacenados.

## Requisitos
- Node.js v18+
- pnpm o npm

## Instalación y configuración

1. Configura el archivo `.env`:
   ```env
   BOT_TOKEN=tu_token_aqui
   GEMINI_API_KEY=tu_api_key
   DOWNLOADER_API=                  # opcional: endpoint de descarga de videos
   EXPLORER_PORT=3000
   ```

2. Instala dependencias y ejecuta:
   ```bash
   pnpm install
   npm run dev        # desarrollo (tsx + nodemon)
   npm run build      # compilar a dist/
   npm start          # ejecutar compilado
   ```

## Persistencia
Los recordatorios se guardan en `data.json` y los registros de usuarios en `data/registry.json`.
