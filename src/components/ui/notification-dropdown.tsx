'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck, GitMerge, DollarSign, AlertTriangle, FileText, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  read_at: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  match_found: <GitMerge size={14} />,
  match_confirmed: <CheckCheck size={14} />,
  payment: <DollarSign size={14} />,
  payment_received: <DollarSign size={14} />,
  contract_ready: <FileText size={14} />,
  contract_signed: <FileText size={14} />,
  sla_warning: <Clock size={14} />,
  sla_breach: <AlertTriangle size={14} />,
}

const COLOR_MAP: Record<string, string> = {
  match_found: 'text-brand-400',
  match_confirmed: 'text-emerald-400',
  payment: 'text-yellow-400',
  payment_received: 'text-yellow-400',
  contract_ready: 'text-blue-400',
  contract_signed: 'text-emerald-400',
  sla_warning: 'text-amber-400',
  sla_breach: 'text-danger-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getRefLink(n: Notification): string | null {
  if (!n.reference_type || !n.reference_id) return null
  const map: Record<string, string> = {
    match: '/matching',
    transaction: '/transacoes',
    listing: '/marketplace',
    auction: '/matching',
    execution_plan: '/pipeline',
  }
  return map[n.reference_type] || null
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications?limit=15')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Fetch when opening dropdown
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAsRead(ids: string[]) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - ids.length))
    } catch {
      // silently fail
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }

  function handleNotificationClick(n: Notification) {
    if (!n.read) markAsRead([n.id])
    const link = getRefLink(n)
    if (link) {
      setOpen(false)
      window.location.href = link
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-500 hover:text-slate-900 transition-all border border-dark-500/50"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-danger-500 rounded-full ring-2 ring-dark-800 flex items-center justify-center">
            <span className="text-[10px] font-bold text-slate-900 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-dark-800 border border-dark-500/60 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/40">
            <h3 className="text-sm font-bold text-white">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-dark-700 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500 mt-2">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhuma notificação</p>
                <p className="text-xs text-slate-600 mt-1">Suas notificações aparecerão aqui</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-dark-700/50 transition-colors border-b border-dark-500/20 last:border-b-0',
                    !n.read && 'bg-brand-500/5'
                  )}
                >
                  {/* Icon */}
                  <span className={cn('mt-0.5 shrink-0', COLOR_MAP[n.type] || 'text-slate-500')}>
                    {ICON_MAP[n.type] || <Bell size={14} />}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-medium truncate', n.read ? 'text-slate-600' : 'text-slate-900')}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-dark-500/40 text-center">
              <a
                href="/dashboard"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                onClick={() => setOpen(false)}
              >
                Ver todas no Dashboard
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
