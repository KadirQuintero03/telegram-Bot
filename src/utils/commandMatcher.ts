/**
 * Construye la expresión regular usada para reconocer un comando con
 * prefijo "!" (en vez del "/" nativo de Telegram).
 *
 * Telegram únicamente resalta como "comando" (entidad bot_command) los
 * mensajes que inician con "/". Al usar "!" el mensaje llega como texto
 * plano, así que el bot lo reconoce manualmente comparando el inicio del
 * texto con esta expresión regular en vez de usar bot.command().
 *
 * Soporta opcionalmente el sufijo "@nombre_del_bot" (útil en grupos)
 * y no distingue mayúsculas/minúsculas.
 */
export function commandTrigger(name: string): RegExp {
  return new RegExp(`^/${name}(?:@\\w+)?(?:\\s|$)`, 'i');
}

/**
 * Extrae los argumentos de un comando "!nombre argumentos...",
 * de forma equivalente a como se hacía antes con "/nombre argumentos...".
 */
export function getCommandArgs(text: string): string {
  return text.split(/\s+/).slice(1).join(' ');
}
