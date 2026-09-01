#  TeleDrive — Bot de Telegram (TypeScript + Telegraf v4)

Bot de Telegram multifunción: nube personal, descarga de videos, productividad y monitoreo del sistema.

## Características

### Nube y descargas
-  `/cloud` — Explora y recibe tus archivos guardados (imágenes, videos, audios, documentos) con opciones **Todos**, **Único** y **Rango**
-  `/get <enlace>` — Descarga videos de TikTok, Instagram o YouTube
-  Envío de imágenes/videos/audios/documentos para guardarlos

### Productividad (Módulo 1)
-  `/recordatorio <mensaje natural>` — Programa recordatorios en lenguaje natural (ej: `recuérdame revisar el correo mañana a las 8am`)
-  `/gasto <cantidad> <descripción>` — Registra gastos y los clasifica automáticamente con IA
-  `/gastos_resumen` — Resumen de gastos de los últimos 7 días + resumen semanal automático los domingos

### Sistema (Módulo 2)
-  `/estado` — Métricas del sistema (CPU, RAM, disco), multiplataforma
-  `/ejecutar <comando>` — Ejecuta comandos de terminal (solo administrador, basado en `ADMIN_ID`)

### Utilidades
-  `/clima <ciudad>` — Clima en tiempo real
-  `/tra <texto>` — Traducción al español
-  `/dolar [cantidad]` — Dólar a COP
-  `/tran` — Transcripción de audios
-  `/ask` — Preguntas a Gemini
-  `/phone`,  `/web` — Acceso web a tus archivos
-  `/borrar` — Administración de grupos

## Requisitos
- Node.js v18+
- pnpm

## Instalación y configuración

1. Copia `example.env` a `.env` y completa las variables:
   ```env
   BOT_TOKEN=tu_token_aqui
   GEMINI_API_KEY=tu_api_key
   ADMIN_ID=tu_telegram_id         # requerido para /ejecutar
   DOWNLOADER_API=                  # opcional: servicio de descarga
   EMAIL_HOST / EMAIL_USER / EMAIL_PASS  # para /email
   ```

2. Instala y ejecuta:
   ```bash
   pnpm install
   npm run dev        # desarrollo (tsx + nodemon)
   npm run build      # compilar a dist/
   npm start          # ejecutar compilado
   ```

## Persistencia
Los recordatorios y gastos se guardan en `data.json` (excluido del repositorio vía `.gitignore`).
