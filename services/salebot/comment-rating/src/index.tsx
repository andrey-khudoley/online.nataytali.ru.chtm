/**
 * Модуль с роутами для обработки комментов: comments_n_scores
 */
import { Debug } from '../lib/debug.lib'
import { generateUUID } from '../lib/uuid.lib'
import { addCommentHandler, addRateHandler } from './handlers'

/** Префикс логов для всех запросов */
const BASE_LOG_PREFIX = '[comments_n_scores]'
/** Уровень логирования */
const LOG_LEVEL: 'info' | 'warn' | 'error' = 'info'

// Устанавливаем базовый префикс
Debug.setLogPrefix(BASE_LOG_PREFIX)

/**
 * Обёртка для маршрутов с генерацией requestId и установкой префикса логов
 */
function withLogging<TReq extends { body: Record<string, any> }>(
  handler: (ctx: RichUgcCtx, req: TReq, logLevel: typeof LOG_LEVEL, requestId: string) => Promise<any>
) {
  return async (ctx: RichUgcCtx, req: TReq) => {
    const requestId = generateUUID().slice(-6)
    const prefix = `${BASE_LOG_PREFIX}[${requestId}]`
    Debug.setLogPrefix(prefix)

    return handler(ctx, req, LOG_LEVEL, requestId)
  }
}

/**
 * POST /add-comment
 * Добавление или обновление комментария
 */
app.post('/add-comment', withLogging(addCommentHandler))

/**
 * POST /add-rate
 * Добавление или обновление рейтинга
 */
app.post('/add-rate', withLogging(addRateHandler))

/**
 * POST /test-panel
 * Добавление или обновление рейтинга
 */
// app.('/test-panel', withLogging(testingPanel()))

/**
 * SCREEN /
 * Панель управления
 */
// Тут будет панель управления
