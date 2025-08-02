import { Heap } from '@app/heap'

/**
 * Интерфейс типа записи таблицы comments_n_scores
 */
export interface CommentScoresRecord {
  /** Ключ для поиска и обновения сообщения */
  db_key: string
  /** ID группы */
  channel: string
  /** ID поста (треда) */
  thread_id?: string
  /** Текст комментируемого поста */
  thread_text?: string
  /** ID отправителя */
  sender_id: string
  /** ID сообщения */
  message_id: string
  /** Текст комментария */
  message_text: string
  /** Количество начисленных баллов */
  value?: number
}

/**
 * Репозиторий для heap-таблицы comments_n_scores
 * @type {import('@app/heap').HeapTableRepo<CommentScoresRecord>}
 */
export const CommentScores = Heap.Table('comments_n_scores', {
  db_key:      Heap.String(),
  channel:     Heap.String(),
  thread_id:   Heap.Optional(Heap.String()),
  thread_text: Heap.Optional(Heap.String()),
  sender_id:   Heap.String(),
  message_id:  Heap.String(),
  message_text:Heap.String(),
  value:       Heap.Optional(Heap.Number()),
})

/**
 * Возможные статусы работы модуля комментариев и оценок:
 * - 'disable'  — модуль выключен
 * - 'waiting'  — ожидание входящих комментариев и следующей оценки
 * - 'inwork'   — проводится оценка, см. job_id
 */
export type CommentSettingsStatus = 'disable' | 'waiting' | 'inwork'

/**
 * Конфигурация SaleBot для модуля комментариев и оценок
 */
export interface SaleBotConfig {
  /** Идентификатор проекта SaleBot */
  project_id: string
  /** API-ключ для доступа к SaleBot */
  api_key: string
}

/**
 * Интерфейс конфигурации модуля комментариев и оценок
 */
export interface CommentSettingsRecord {
  /** Активен ли модуль сейчас */
  active: boolean
  /** Статус работы модуля */
  status: CommentSettingsStatus
  /** ID запущенной задачи по оценке (только когда status='inwork') */
  job_id?: number
  /** IDs постов (тредов), комментарии к которым подлежат оценке */
  threads: number[]
  /** Время последней оценки комментариев */
  launch_time: Date
  /** Настройки подключения к SaleBot */
  salebot: SaleBotConfig
}

/**
 * Репозиторий для heap-таблицы comments_n_settings
 * @type {import('@app/heap').HeapTableRepo<CommentSettingsRecord>}
 */
export const CommentSettings = Heap.Table('comments_n_settings', {
  active:      Heap.Boolean(),
  status:      Heap.Union([
    Heap.Literal('disable'),
    Heap.Literal('waiting'),
    Heap.Literal('inwork'),
  ]),
  job_id:      Heap.Optional(Heap.Number()),
  threads:     Heap.Array(Heap.Number()),
  launch_time: Heap.Optional(Heap.DateTime()),
  salebot:     Heap.Object({
    project_id: Heap.String(),
    api_key:    Heap.String(),
  }),
})

/**
 * Интерфейс записи лидеров рейтинга комментариев
 */
export interface CommentLeaderRecord {
  /** Ключ для поиска и обновления рейтинга пользователя */
  user_key: string
  /** ID канала, в котором производится расчёт */
  channel: string
  /** ID пользователя в Telegram */
  sender_id: string
  /** Суммарное количество баллов пользователя */
  score: number
}

/**
 * Репозиторий для heap-таблицы comments_n_leaders
 * @type {import('@app/heap').HeapTableRepo<CommentLeaderRecord>}
 */
export const CommentLeaders = Heap.Table('comments_n_leaders', {
  user_key:   Heap.String(),
  channel:    Heap.String(),
  sender_id:  Heap.String(),
  score:      Heap.Number(),
})
