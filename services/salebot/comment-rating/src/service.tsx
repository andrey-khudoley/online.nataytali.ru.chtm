/**
 * Модуль для работы с данными комментариев в базе comments_n_scores
 */
import { post } from '@app/request'
import { Debug } from '../lib/debug.lib'
import { CommentSettings } from '../db/comments.db'
import { CommentScoresRecord, CommentScores } from '../db/comments.db'
import { CommentLeaders, CommentLeaderRecord } from '../db/comments.db'

/**
 * Сервис для добавления и получения сообщений в таблице comments_n_scores
 */
export class CommentsDbService {
  /**
   * Добавляет или обновляет запись комментария по ключу db_key.
   * @param ctx - Контекст запроса
   * @param params - все поля записи без value (value опционально)
   * @returns объект с результатом операции и данными или сообщением об ошибке
   */
  public static async addMsg(
    ctx: RichUgcCtx,
    params: Omit<CommentScoresRecord, 'value'> & Partial<Pick<CommentScoresRecord, 'value'>>
  ): Promise<{ success: true; data: CommentScoresRecord } | { success: false; error: string }> {
    try {
      // Атомарное создание или обновление записи по полю db_key
      const record = await CommentScores.createOrUpdateBy(
        ctx,
        'db_key',
        params as CommentScoresRecord
      )
      return { success: true, data: record }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Возвращает текст комментария по ключу db_key.
   * @param ctx - Контекст запроса
   * @param db_key - уникальный ключ записи
   * @returns объект с текстом сообщения или сообщением об ошибке
   */
  public static async getThreadMsg(
    ctx: RichUgcCtx,
    db_key: string
  ): Promise<{ success: true; message_text: string } | { success: false; error: string }> {
    try {
      // Поиск первой записи по полю db_key
      const record = await CommentScores.findOneBy(
        ctx,
        { db_key }
      )
      if (!record) {
        return { success: false, error: `Запись с ключом ${db_key} не найдена` }
      }
      return { success: true, message_text: record.message_text }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Обновляет значение оценки комментария и добавляет баллы пользователю в таблице лидеров.
   * @param ctx - Контекст запроса
   * @param db_key - уникальный ключ записи комментария
   * @param value - количество баллов для добавления
   * @returns объект с результатом и обновлённой записью комментария или ошибкой
   */
  public static async addRate(
    ctx: RichUgcCtx,
    db_key: string,
    value: number
  ): Promise<{ success: true; data: CommentScoresRecord } | { success: false; error: string }> {
    const tag = `CommentsDbService.addRate[${db_key}]`
    try {
      new Debug(ctx, `${tag}: start`, 'info', 'info')

      // 1) обновляем или создаём запись комментария с новым value
      const updatedComment = await CommentScores.createOrUpdateBy(
        ctx,
        'db_key',
        { db_key, value } as CommentScoresRecord
      )
      new Debug(ctx, `${tag}: comment updated, value=${value}`, 'info', 'info')

      // 2) формируем user_key для таблицы лидеров
      const sender_id = updatedComment.sender_id.toString()
      const channel = updatedComment.channel.toString()
      const user_key = `${channel}-${sender_id}`
      new Debug(ctx, `${tag}: computed user_key=${user_key}`, 'info', 'info')

      // 3) обновляем таблицу лидеров по user_key
      let leaderRec: CommentLeaderRecord | null = await CommentLeaders.findOneBy(
        ctx,
        { user_key }
      )
      if (leaderRec) {
        const newScore = leaderRec.score + value
        await CommentLeaders.createOrUpdateBy(
          ctx,
          'user_key',
          { user_key, channel, sender_id, score: newScore }
        )
        new Debug(ctx, `${tag}: leader updated, newScore=${newScore}`, 'info', 'info')
      } else {
        await CommentLeaders.create(
          ctx,
          { user_key, channel, sender_id, score: value }
        )
        new Debug(ctx, `${tag}: leader created, score=${value}`, 'info', 'info')
      }

      new Debug(ctx, `${tag}: done`, 'info', 'info')
      return { success: true, data: updatedComment }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      new Debug(ctx, `${tag}: error ${errorMsg}`, 'error', 'error')
      return { success: false, error: errorMsg }
    }
  }
}

/**
 * Менеджер для отправки rateMessage во внешний Salebot API.
 */
export class SalebotManager {
  /**
   * Получает или создаёт единственный конфиг из таблицы comments_n_settings.
   * @param ctx - контекст RichUgcCtx
   */
  private static async getConfig(ctx: RichUgcCtx) {
    let config = await CommentSettings.findOneBy(ctx)
    if (!config) {
      const singleton = await CommentSettings.getSingleton(ctx)
      config = await CommentSettings.create(ctx, singleton)
    }
    return config
  }

  /**
   * Отправляет запрос rateMessage в Salebot.
   * @param ctx - контекст RichUgcCtx
   * @param sender_id - идентификатор пользователя
   * @param thread_text - текст потока
   * @param message_text - текст сообщения
   * @param LOG_LEVEL - уровень логирования ('info' | 'warn' | 'error')
   * @param requestId - уникальный идентификатор запроса для трассировки
   */
  public static async rateMessage(
    ctx: RichUgcCtx,
    sender_id: string,
    channel: string,
    thread_text: string,
    message_id: number,
    message_text: string,
    LOG_LEVEL: 'info' | 'warn' | 'error',
    requestId: string
  ): Promise<void> {
    const tag = `rateMessage[${requestId}]`
    try {
      new Debug(ctx, `${tag}: start`, undefined, LOG_LEVEL)

      // 1) получаем api_key
      const cfg = await this.getConfig(ctx)
      const api_key = cfg.salebot.api_key
      new Debug(ctx, `${tag}: api_key=${api_key}`, undefined, LOG_LEVEL)

      // 2) формируем URL и тело запроса
      const url = `https://chatter.salebot.pro/api/${api_key}/tg_callback`
      const payload = {
        message: 'rateMessage',
        user_id: sender_id,
        group_id: 'natali_chatadmin_bot',
        rating_channel: channel,
        rating_thread_text: thread_text,
        rating_message_id: message_id,
        rating_message_text: message_text
      }
      new Debug(ctx, `${tag}: POST ${url} payload=${JSON.stringify(payload)}`, undefined, LOG_LEVEL)

      // 3) шлём запрос
      const res = await post(url, payload)
      new Debug(ctx, `${tag}: response.statusCode=${res.statusCode}`, undefined, LOG_LEVEL)

      // 4) проверяем статусCode
      if (res.statusCode !== 200) {
        new Debug(ctx, `${tag}: unexpected statusCode ${res.statusCode}`, undefined, 'error')
      }

      new Debug(ctx, `${tag}: success`, undefined, LOG_LEVEL)
    } catch (err) {
      new Debug(ctx, `${tag}: error ${(err as Error).message}`, undefined, 'error')
      throw err
    }
  }
}