/**
 * Обработчики для маршрутов модуля comments_n_scores
 */
import { Debug } from '../lib/debug.lib'
import { CommentsDbService } from './service'
import type { CommentScoresRecord } from '../db/comments.db'
import { decodeBase64 } from '../lib/base64.lib'

/**
 * Обработчик добавления или обновления комментария
 * @param ctx - Контекст запроса
 * @param req - Объект запроса с полем body
 * @param logLevel - Уровень логирования для Debug
 * @param requestId - Уникальный идентификатор запроса
 * @returns Объект { status: boolean }
 */
export async function addCommentHandler(
  ctx: RichUgcCtx,
  req: { body: Record<string, any> },
  logLevel: 'info' | 'warn' | 'error',
  requestId: string
): Promise<{ status: boolean }> {
  const { body } = req

  // Лог начала обработки
  new Debug(ctx, `Получен запрос ${requestId}`, logLevel, 'info')

  // Проверяем обязательные поля
  const requiredFields = ['channel', 'sender_id', 'message_id', 'message_text'] as const
  for (const field of requiredFields) {
    if (!body[field]) {
      new Debug(
        ctx,
        `Отсутствует обязательное поле "${field}" в запросе ${requestId}`,
        logLevel,
        'error',
        `MISSING_FIELD_${field.toUpperCase()}`
      )
      return { status: false }
    }
    new Debug(ctx, `Поле "${field}" присутствует: ${body[field]}`, logLevel, 'info')
  }

  // Проверка на base64 в начале message_text
  if (/^base64\(/i.test(body.message_text)) {
    new Debug(
      ctx,
      `Сообщение ${requestId} содержит только base64, текст отсутствует`,
      logLevel,
      'warn',
      'NO_TEXT'
    )
    return { status: false }
  }

  // Подробный лог входных данных
  new Debug(
    ctx,
    `Данные запроса ${requestId}: ${JSON.stringify(body, null, 2)}`,
    logLevel,
    'info'
  )

  let thread_text: string | undefined

  // Получение текста исходного поста при наличии thread_id
  if (body.thread_id) {
    const threadKey = `${body.channel}-${body.thread_id}`
    new Debug(ctx, `Обнаружен thread_id. Получаем текст поста по ключу ${threadKey}`, logLevel, 'info')
    const threadResult = await CommentsDbService.getThreadMsg(ctx, threadKey)
    if (threadResult.success) {
      thread_text = threadResult.message_text
      new Debug(ctx, `Текст поста получен: ${thread_text}`, logLevel, 'info')
    } else {
      new Debug(
        ctx,
        `Не удалось найти сохранённую запись для поста (${threadKey}): ${threadResult.error}`,
        logLevel,
        'warn',
        'THREAD_NOT_FOUND'
      )
    }
  } else {
    new Debug(ctx, 'thread_id не передан, пропускаем загрузку исходного поста', logLevel, 'info')
  }

  // Декодирование message_text из base64
  let decodedMessageText = body.message_text
  try {
    decodedMessageText = decodeBase64(body.message_text)
    new Debug(ctx, `message_text декодирован из base64: ${decodedMessageText}`, logLevel, 'info')
  } catch (decodeErr) {
    new Debug(
      ctx,
      `Ошибка декодирования base64 для message_text: ${(decodeErr as Error).message}`,
      logLevel,
      'warn',
      'DECODE_ERROR'
    )
  }

  // Подготовка параметров для сохранения
  const params: Omit<CommentScoresRecord, 'value'> & Partial<Pick<CommentScoresRecord, 'value'>> = {
    db_key: `${body.channel}-${body.message_id}`,
    channel: body.channel,
    sender_id: body.sender_id,
    message_id: body.message_id,
    message_text: decodedMessageText,
    ...(body.thread_id && { thread_id: body.thread_id }),
    ...(thread_text && { thread_text }),
    ...(body.value !== undefined && { value: body.value })
  }

  new Debug(ctx, `Формируем данные для сохранения: ${JSON.stringify(params, null, 2)}`, logLevel, 'info')

  // Сохранение данных в БД
  const result = await CommentsDbService.addMsg(ctx, params)
  if (!result.success) {
    new Debug(
      ctx,
      `Ошибка при сохранении комментария ${requestId}: ${result.error}`,
      logLevel,
      'error',
      'DB_ERROR'
    )
    return { status: false }
  }

  new Debug(ctx, `Комментарий успешно сохранён ${requestId}`, logLevel, 'info')

  return { status: true }
}

/**
 * Обработчик обновления рейтинга комментария
 * @param ctx - Контекст запроса
 * @param req - Объект запроса с полем body
 * @param logLevel - Уровень логирования для Debug
 * @param requestId - Уникальный идентификатор запроса
 * @returns Объект { status: boolean }
 */
export async function addRateHandler(
  ctx: RichUgcCtx,
  req: { body: Record<string, any> },
  logLevel: 'info' | 'warn' | 'error',
  requestId: string
): Promise<{ status: boolean }> {
  const { body } = req

  // 1) Начало обработки
  new Debug(ctx, `Получен запрос на обновление рейтинга ${requestId}`, logLevel, 'info')

  // 2) Проверка обязательных полей
  const requiredFields = ['channel', 'sender_id', 'message_id', 'value'] as const
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      new Debug(
        ctx,
        `Отсутствует обязательное поле "${field}" в запросе ${requestId}`,
        logLevel,
        'error',
        `MISSING_FIELD_${field.toUpperCase()}`
      )
      return { status: false }
    }
    new Debug(ctx, `Поле "${field}" присутствует: ${body[field]}`, logLevel, 'info')
  }

  // 3) Формирование ключа записи
  const { channel, sender_id, message_id, value } = body
  const db_key = `${channel}-${message_id}`
  new Debug(ctx, `Вычисленный db_key: ${db_key}`, logLevel, 'info')

  try {
    // 4) Вызов сервиса для обновления рейтинга
    const result = await CommentsDbService.addRate(ctx, db_key, Number(value))
    if (!result.success) {
      new Debug(
        ctx,
        `Ошибка при обновлении рейтинга ${requestId}: ${result.error}`,
        logLevel,
        'error',
        'RATE_ERROR'
      )
      return { status: false }
    }

    // 5) Успешное завершение
    new Debug(ctx, `Рейтинг успешно обновлён ${requestId}`, logLevel, 'info')
    return { status: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    new Debug(
      ctx,
      `Необработанная ошибка в addRateHandler ${requestId}: ${errorMsg}`,
      logLevel,
      'error'
    )
    return { status: false }
  }
}

// export async function testingPanel(params:type) {}

// export async function controlPanel(params:type) {}