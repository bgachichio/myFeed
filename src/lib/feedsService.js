import { supabase } from './supabase'

// ── Folders ──────────────────────────────────────────────────────

export async function getFolders(userId) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function createFolder(userId, name) {
  const { data: existing } = await supabase.from('folders').select('position').eq('user_id', userId).order('position', { ascending: false }).limit(1)
  const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0
  const { data, error } = await supabase.from('folders').insert([{ user_id: userId, name, position: nextPos }]).select().single()
  if (error) throw error
  return data
}

export async function updateFolder(folderId, updates) {
  const { data, error } = await supabase.from('folders').update(updates).eq('id', folderId).select().single()
  if (error) throw error
  return data
}

export async function deleteFolder(folderId) {
  // Feeds in this folder become unfiled (folder_id set to null via ON DELETE SET NULL)
  const { error } = await supabase.from('folders').delete().eq('id', folderId)
  if (error) throw error
}

export async function moveFeedToFolder(feedId, folderId) {
  const { data, error } = await supabase
    .from('feeds').update({ folder_id: folderId }).eq('id', feedId).select().single()
  if (error) throw error
  return data
}

// ── Feeds (sources) ──────────────────────────────────────────────

export async function getFeeds(userId) {
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addFeed({ userId, url, title, category, feedType = 'rss', folderId = null }) {
  const { data, error } = await supabase
    .from('feeds')
    .insert([{ user_id: userId, url, title, category, feed_type: feedType, folder_id: folderId }])
    .select().single()
  if (error) throw error
  return data
}

export async function deleteFeed(feedId) {
  const { error } = await supabase.from('feeds').delete().eq('id', feedId)
  if (error) throw error
}

export async function updateFeed(feedId, updates) {
  const { data, error } = await supabase
    .from('feeds').update(updates).eq('id', feedId).select().single()
  if (error) throw error
  return data
}

// Update feed health after a fetch attempt
export async function updateFeedHealth(feedId, { success, error: errorMsg, articleCount } = {}) {
  const updates = { last_fetched_at: new Date().toISOString() }
  if (success) {
    updates.last_error = null
    updates.error_count = 0
    if (articleCount != null) updates.article_count = articleCount
  } else {
    updates.last_error = errorMsg || 'Unknown error'
    // Increment error_count via RPC would be ideal but update works too
  }
  await supabase.from('feeds').update(updates).eq('id', feedId)
}

// ── Articles (cached items) ──────────────────────────────────────

const PAGE_SIZE = 20

export async function getArticles(userId, { category, limit = PAGE_SIZE, offset = 0, readFilter = 'unread' } = {}) {
  // readFilter: 'unread' (default) | 'all' | 'read'
  let query = supabase
    .from('articles')
    .select('*, feeds(title, category, url)', { count: 'exact' })
    .eq('user_id', userId)
    .order('pub_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'All') query = query.eq('category', category)
  if (readFilter === 'unread') query = query.eq('is_read', false)
  if (readFilter === 'read')   query = query.eq('is_read', true)

  const { data, error, count } = await query
  if (error) throw error
  return { articles: data, total: count, hasMore: offset + limit < count }
}

export async function markArticleUnread(articleId) {
  const { error } = await supabase.from('articles').update({ is_read: false }).eq('id', articleId)
  if (error) throw error
}

export async function markArticlesBulk(articleIds, isRead) {
  if (!articleIds.length) return
  const { error } = await supabase
    .from('articles')
    .update({ is_read: isRead })
    .in('id', articleIds)
  if (error) throw error
}

export async function upsertArticles(articles) {
  if (!articles.length) return
  // Deduplicate by user_id+guid before upserting — prevents ON CONFLICT double-hit error
  const seen = new Set()
  const unique = articles.filter(a => {
    const key = `${a.user_id}:${a.guid}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const { error } = await supabase
    .from('articles')
    .upsert(unique, { onConflict: 'user_id,guid', ignoreDuplicates: false })
  if (error) throw error
}

export async function markArticleRead(articleId) {
  const { error } = await supabase.from('articles').update({ is_read: true }).eq('id', articleId)
  if (error) throw error
}

export async function toggleBookmark(articleId, current) {
  const { error } = await supabase.from('articles').update({ is_bookmarked: !current }).eq('id', articleId)
  if (error) throw error
}

export async function toggleReadLater(articleId, current) {
  const { error } = await supabase.from('articles').update({ is_read_later: !current }).eq('id', articleId)
  if (error) throw error
}

export async function getReadLaterArticles(userId) {
  const { data, error } = await supabase
    .from('articles').select('*, feeds(title, category, url)')
    .eq('user_id', userId).eq('is_read_later', true)
    .order('pub_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getStats(userId) {
  const { data, error } = await supabase
    .from('articles')
    .select('is_read, is_bookmarked, is_read_later, category, pub_date, created_at')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

// Bulk insert multiple feeds in a single Supabase call
// Returns array of saved feeds with IDs, in same order as input
export async function addFeedsBulk(feedRows) {
  if (!feedRows.length) return []
  const { data, error } = await supabase
    .from('feeds')
    .insert(feedRows)
    .select()
  if (error) throw error
  return data
}

export async function markAllArticlesRead(userId) {
  const { error } = await supabase
    .from('articles')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}
