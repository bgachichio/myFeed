import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import AddFeedModal from '../components/AddFeedModal'
import SearchModal from '../components/SearchModal'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal'
import InstallPrompt from '../components/InstallPrompt'
import FeedDiscoveryModal from '../components/FeedDiscoveryModal'
import NewsletterModal from '../components/NewsletterModal'
import { UnreadProvider, useUnread } from '../contexts/UnreadContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { SettingsProvider } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts'
import { getFeeds, upsertArticles } from '../lib/feedsService'
import { fetchRSSFeed } from '../lib/rssParser'

function DashboardContent() {
  const { user } = useAuth()
  const { refreshUnreadCount } = useUnread()
  const [showAdd, setShowAdd] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [showNewsletter, setShowNewsletter] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [autoRefreshing, setAutoRefreshing] = useState(false)
  const hasAutoRefreshed = useRef(false)

  const openSearch = useCallback(() => setShowSearch(true), [])
  const openHelp = useCallback(() => setShowHelp(true), [])
  useKeyboardShortcuts({ onSearch: openSearch, onHelp: openHelp })

  useEffect(() => {
    if (hasAutoRefreshed.current) return
    hasAutoRefreshed.current = true

    const autoRefresh = async () => {
      setAutoRefreshing(true)
      try {
        const feeds = await getFeeds(user.id)
        if (!feeds.length) return

        const results = await Promise.allSettled(feeds.map(f => fetchRSSFeed(f.url)))
        const allArticles = []
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const feed = feeds[i]
            result.value.items.slice(0, 10).forEach(item => {
              allArticles.push({
                user_id: user.id, feed_id: feed.id, guid: item.guid, title: item.title,
                link: item.link, description: item.description, author: item.author,
                pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                category: feed.category,
                full_content: item.fullContent || null,
              })
            })
          }
        })
        if (allArticles.length) await upsertArticles(allArticles)
        await refreshUnreadCount()
        setRefreshKey(k => k + 1)
      } catch {} finally { setAutoRefreshing(false) }
    }
    autoRefresh()
  }, [user.id, refreshUnreadCount])

  const handleAdded = () => {
    setShowAdd(false)
    setRefreshKey(k => k + 1)
    refreshUnreadCount()
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-stone-950 flex">
      <Sidebar
        onAddFeed={() => setShowAdd(true)}
        onDiscover={() => setShowDiscover(true)}
        onNewsletter={() => setShowNewsletter(true)}
        onSearch={openSearch}
        onHelp={openHelp}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileSidebarOpen(true)} className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-lg">
            <span className="text-stone-900 dark:text-stone-100">my</span><span className="text-brand-600">Feed</span>
          </span>
          <button onClick={openSearch} className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-4xl w-full">
          {autoRefreshing && (
            <div className="fixed bottom-5 right-5 flex items-center gap-2 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 shadow-sm rounded-full px-4 py-2 text-xs text-stone-500 dark:text-stone-400 z-50">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              Refreshing feeds...
            </div>
          )}
          <Outlet context={{ refreshKey, autoRefreshing }} />
        </main>

        {/* Footer — full width, always at bottom */}
        <footer className="w-full px-4 md:px-8 py-4 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 mt-auto bg-white dark:bg-stone-900">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Made with ❤️ by{' '}
            <span className="font-medium text-stone-500 dark:text-stone-400">Brian Gachichio</span>
          </p>
          <a
            href="https://paystack.shop/pay/gachichio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            ☕ Support
          </a>
        </footer>
      </div>

      <InstallPrompt />
      {showNewsletter && <NewsletterModal onClose={() => setShowNewsletter(false)} onAdded={() => { setShowNewsletter(false); setRefreshKey(k => k + 1); refreshUnreadCount() }} />}
      {showDiscover && <FeedDiscoveryModal onClose={() => setShowDiscover(false)} onAdded={() => { setShowDiscover(false); setRefreshKey(k => k + 1); refreshUnreadCount() }} />}
      {showAdd && <AddFeedModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default function DashboardLayout() {
  return (
    <ThemeProvider>
      <UnreadProvider>
        <SettingsProvider>
          <DashboardContent />
        </SettingsProvider>
      </UnreadProvider>
    </ThemeProvider>
  )
}
