import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export const FONTS = [
  { id: 'inter',        label: 'Inter',       stack: "'Inter', sans-serif",                 googleParam: 'Inter:wght@300;400;500;600;700' },
  { id: 'system',       label: 'System UI',   stack: "system-ui, -apple-system, sans-serif",googleParam: null },
  { id: 'georgia',      label: 'Georgia',     stack: "Georgia, 'Times New Roman', serif",   googleParam: null },
  { id: 'lato',         label: 'Lato',        stack: "'Lato', sans-serif",                  googleParam: 'Lato:wght@300;400;700' },
  { id: 'merriweather', label: 'Merriweather',stack: "'Merriweather', serif",               googleParam: 'Merriweather:wght@300;400;700' },
]

export const DATE_FORMATS = [
  { id: 'relative', label: 'Relative',     example: '2 hours ago' },
  { id: 'dmy',      label: 'DD/MM/YYYY',   example: '26/02/2026' },
  { id: 'mdy',      label: 'MM/DD/YYYY',   example: '02/26/2026' },
  { id: 'ymd',      label: 'YYYY/MM/DD',   example: '2026/02/26' },
  { id: 'medium',   label: 'Feb 26, 2026', example: 'Feb 26, 2026' },
]

export const TIME_FORMATS = [
  { id: '12h', label: '12-hour', example: '2:30 PM' },
  { id: '24h', label: '24-hour', example: '14:30' },
]

export const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : ['Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','Africa/Cairo',
     'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
     'America/Sao_Paulo','Europe/London','Europe/Paris','Europe/Berlin',
     'Asia/Dubai','Asia/Singapore','Asia/Tokyo','Asia/Kolkata',
     'Australia/Sydney','Pacific/Auckland','UTC']

const DEFAULT_SETTINGS = {
  displayName: '',
  fontId: 'inter',
  dateFormat: 'relative',
  timeFormat: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi',
  compactMode: false,
  showReadingTime: true,
  showAuthor: true,
  articlesPerPage: 20,
  emailNotifications: false,
}

// ── localStorage cache — instant load, no flash ──────────────────
function loadCached() {
  try {
    const raw = localStorage.getItem('myfeed-settings')
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { return DEFAULT_SETTINGS }
}

function saveCache(s) {
  try { localStorage.setItem('myfeed-settings', JSON.stringify(s)) } catch {}
}

// ── Context ───────────────────────────────────────────────────────
const SettingsContext = createContext({})

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(loadCached)
  const [loadingSettings, setLoadingSettings] = useState(true)
  // Keep a ref so updateSettings always has the latest value without stale closures
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  // ── Load from Supabase on login ───────────────────────────────
  useEffect(() => {
    if (!user) { setLoadingSettings(false); return }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          const loaded = {
            ...DEFAULT_SETTINGS,
            displayName:      data.display_name        || '',
            fontId:           data.font_id             || 'inter',
            dateFormat:       data.date_format         || 'relative',
            timeFormat:       data.time_format         || '12h',
            timezone:         data.timezone            || DEFAULT_SETTINGS.timezone,
            compactMode:      data.compact_mode        ?? false,
            showReadingTime:  data.show_reading_time   ?? true,
            showAuthor:       data.show_author         ?? true,
            articlesPerPage:  data.articles_per_page   || 20,
            emailNotifications: data.email_notifications ?? false,
          }
          setSettings(loaded)
          saveCache(loaded)
        }
      } catch {}
      finally { setLoadingSettings(false) }
    }
    load()
  }, [user?.id]) // only re-run when user id changes, not on every render

  // ── Apply font to <body> whenever fontId changes ──────────────
  useEffect(() => {
    const font = FONTS.find(f => f.id === settings.fontId) || FONTS[0]
    if (font.googleParam && !document.getElementById(`gf-${font.id}`)) {
      const link = document.createElement('link')
      link.id   = `gf-${font.id}`
      link.rel  = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${font.googleParam}&display=swap`
      document.head.appendChild(link)
    }
    document.body.style.fontFamily = font.stack
  }, [settings.fontId])

  // ── Save — always reads from ref to avoid stale closure ───────
  const updateSettings = useCallback(async (updates) => {
    const next = { ...settingsRef.current, ...updates }
    setSettings(next)
    saveCache(next) // write to localStorage immediately

    if (!user) return
    try {
      const { error } = await supabase.from('profiles').upsert({
        id:                 user.id,
        display_name:       next.displayName,
        font_id:            next.fontId,
        date_format:        next.dateFormat,
        time_format:        next.timeFormat,
        timezone:           next.timezone,
        compact_mode:       next.compactMode,
        show_reading_time:  next.showReadingTime,
        show_author:        next.showAuthor,
        articles_per_page:  next.articlesPerPage,
        email_notifications:next.emailNotifications,
        updated_at:         new Date().toISOString(),
      })
      if (error) throw error
    } catch (err) {
      // Supabase write failed — localStorage already saved so settings
      // won't be lost for this session, but log for debugging
      console.warn('Settings save failed:', err.message)
    }
  }, [user]) // only depends on user, not settings — ref handles the rest

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loadingSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
