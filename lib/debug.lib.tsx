/**
 * Класс для логирования и обработки ошибок.
 * Позволяет логировать события с разными уровнями (`info`, `warn`, `error`)
 * и выбрасывать ошибки.
 * 
 * Примеры вызова:
 * new Debug(ctx, "Инфо сообщение", "info");
 * new Debug(ctx, "Сообщение об ошибке", "error", "ERROR_CODE");
 * throw new Debug(ctx, "Сообщение об ошибке и создание исключения", "error", "ERROR_CODE");
 */

export class Debug extends Error {
    /**
     * Код ошибки (если ошибка была выброшена).
     */
    code?: string;
  
    /**
     * Префикс для логов в ctx.account.log.
     */
    static logPrefix: string = "[DEBUG]";
  
    /**
     * Создаёт новый объект лога или ошибки.
     *
     * @param {RichUgcCtx} ctx - Контекст.
     * @param {string} message - Сообщение для лога или ошибки.
     * @param {"info" | "warn" | "error"} [configLevel] - Уровень логирования из конфигурации.
     * @param {"info" | "warn" | "error"} [level] - Уровень логирования (`info`, `warn`, `error`).
     * @param {string} [code] - Код ошибки (опционально, только для выбрасываемых ошибок).
     */
    constructor(ctx: RichUgcCtx, message: string, configLevel?: "info" | "warn" | "error", level?: "info" | "warn" | "error", code?: string) {
      super(message);
      this.code = code;
      this.name = "Debug";
  
      const effectiveLevel = level || configLevel || "error";
      this.logMessage(ctx, message, effectiveLevel, code);
    }
  
    /**
     * Проверяет, нужно ли логировать сообщение в зависимости от установленного уровня логирования.
     *
     * @param {"info" | "warn" | "error"} configLevel - Уровень логирования из конфигурации.
     * @param {"info" | "warn" | "error"} level - Уровень лога.
     * @returns {boolean} `true`, если лог должен быть выведен.
     */
    private shouldLog(configLevel: "info" | "warn" | "error", level: "info" | "warn" | "error"): boolean {
      const levels = ["info", "warn", "error"];
      return levels.indexOf(level) >= levels.indexOf(configLevel);
    }
  
    /**
     * Логирует сообщение в консоль, в `ctx.log` и `ctx.account.log`, если уровень логирования позволяет.
     *
     * @param {RichUgcCtx} ctx - Контекст, в который нужно логировать (`ctx.log`, `ctx.account.log`).
     * @param {string} message - Текст лога.
     * @param {"info" | "warn" | "error"} level - Уровень (`info`, `warn`, `error`).
     * @param {string} [code] - Код ошибки (опционально).
     */
    private logMessage(ctx: RichUgcCtx, message: string, level: "info" | "warn" | "error", code?: string) {
      const timestamp = new Date().toISOString();
      const prefix = `[${level.toUpperCase()}][${timestamp}]`;
      const logMessage = code ? `${prefix}[${code}]: ${message}` : `${prefix}: ${message}`;
      
      // Лог в дебагер VS Code
      ctx.log(logMessage);
      
      // Лог в серверные логи с префиксом
      ctx.account.log(`${Debug.logPrefix} ${logMessage}`);
    }
  
    /**
     * Устанавливает префикс для логирования в `ctx.account.log`.
     *
     * @param {string} prefix - Новый префикс.
     */
    static setLogPrefix(prefix: string) {
      this.logPrefix = prefix;
    }
  }
  