# 🤖 Bot de Telegram — TypeScript + Telegraf v4

Bot de Telegram con consulta de clima, traducción y administración de grupos. 100% gratuito.

## Características

- 🌤 `/clima` — Clima en tiempo real vía Open-Meteo (sin API key)
- 🌐 `/traducir` — Traducción automática al español vía MyMemory
- 🗑 `/borrar` — Elimina mensajes en grupos (solo administradores)
- 📋 `/start` y `/help` — Bienvenida y ayuda

## Requisitos

- Node.js v18 o superior
- npm v8 o superior

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo de ejemplo: `cp .env.example .env`
2. Edita `.env` y coloca tu token de Telegram

```env
BOT_TOKEN=tu_token_aqui
NODE_ENV=development
LOG_LEVEL=info
MAX_DELETE_MESSAGES=100
WEATHER_CACHE_TTL_MINUTES=10
```

## Ejecución

```bash
# Modo desarrollo (con recarga automática)
npm run dev

# Compilar para producción
npm run build

# Ejecutar compilado
npm start
```
