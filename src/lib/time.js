/**
 * time.js — tiny relative-time helper for the feed. Words via t().
 */

import { t } from './i18n'

export function relativeTime(iso) {
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, (Date.now() - then) / 1000)
  if (seconds < 60) return t('post.timeNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('post.timeMinutes', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('post.timeHours', { n: hours })
  const days = Math.floor(hours / 24)
  return t('post.timeDays', { n: days })
}
