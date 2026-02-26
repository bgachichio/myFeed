import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('myfeed-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('myfeed-theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])

  const toggleTheme = () => setDark(d => !d)

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
