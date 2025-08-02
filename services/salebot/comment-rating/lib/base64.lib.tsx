/**
 * Модуль для кодирования и декодирования строк в формат Base64 с использованием node-forge
 */
// @ts-ignore
import * as forge from '@npm/node-forge'

/**
 * Преобразует UTF-8 строку в бинарную строку (Latin-1) для кодирования
 * @param str - Исходный UTF-8 текст
 * @returns Бинарная строка
 */
function utf8ToBinary(str: string): string {
  return encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  )
}

/**
 * Преобразует бинарную строку (Latin-1) в UTF-8 текст после декодирования
 * @param bin - Бинарная строка
 * @returns Декодированный UTF-8 текст
 */
function binaryToUtf8(bin: string): string {
  return decodeURIComponent(
    bin
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

/**
 * Кодирует переданную строку в Base64 URL safe
 * @param input - Исходная строка в UTF-8
 * @returns Закодированная строка в формате Base64 URL safe
 */
export function encodeBase64(input: string): string {
  const binary = utf8ToBinary(input)
  return forge.util
    .encode64(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Декодирует Base64 URL safe строку в исходный UTF-8 текст
 * @param input - Строка в формате Base64 URL safe
 * @returns Декодированная исходная строка
 */
export function decodeBase64(input: string): string {
  const normalized = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = forge.util.decode64(normalized)
  return binaryToUtf8(raw)
}
