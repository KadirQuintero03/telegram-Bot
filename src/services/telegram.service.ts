import { Context } from 'telegraf';

export class TelegramService {
  /**
   * Verifica si el bot es administrador del chat
   */
  static async isBotAdmin(ctx: Context): Promise<boolean> {
    try {
      if (!ctx.chat) return false;
      const botId = ctx.botInfo?.id;
      if (!botId) return false;
      const member = await ctx.telegram.getChatMember(ctx.chat.id, botId);
      return member.status === 'administrator' || member.status === 'creator';
    } catch {
      return false;
    }
  }

  /**
   * Verifica si el usuario que ejecuta el comando es administrador del chat
   */
  static async isUserAdmin(ctx: Context): Promise<boolean> {
    try {
      if (!ctx.chat || !ctx.from) return false;
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      return member.status === 'administrator' || member.status === 'creator';
    } catch {
      return false;
    }
  }

  /**
   * Verifica si el chat es un grupo o supergrupo
   */
  static isGroup(ctx: Context): boolean {
    return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  }
}
