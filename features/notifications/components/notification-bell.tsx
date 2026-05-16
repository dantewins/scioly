"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconBell, IconCheck, IconClock, IconReceipt2, IconSpeakerphone,
  IconForms, IconTrophy, IconLoader2,
} from "@tabler/icons-react"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"

interface Notification {
  id: string
  type:
    | "HOUR_APPROVED"
    | "HOUR_REJECTED"
    | "FORM_VERIFIED"
    | "FORM_REJECTED"
    | "INVOICE_ISSUED"
    | "ANNOUNCEMENT"
    | "COMPETITION_RESULT"
  title: string
  body: string | null
  link: string
  occurredAt: string
  isRead: boolean
}

interface FeedResponse {
  notifications: Notification[]
  unreadCount: number
}

const ICON_FOR: Record<Notification["type"], typeof IconBell> = {
  HOUR_APPROVED: IconCheck,
  HOUR_REJECTED: IconClock,
  FORM_VERIFIED: IconForms,
  FORM_REJECTED: IconForms,
  INVOICE_ISSUED: IconReceipt2,
  ANNOUNCEMENT: IconSpeakerphone,
  COMPETITION_RESULT: IconTrophy,
}

const TONE_FOR: Record<Notification["type"], string> = {
  HOUR_APPROVED: "text-[var(--success)]",
  HOUR_REJECTED: "text-[var(--danger)]",
  FORM_VERIFIED: "text-[var(--success)]",
  FORM_REJECTED: "text-[var(--danger)]",
  INVOICE_ISSUED: "text-amber-600",
  ANNOUNCEMENT: "text-azure-700",
  COMPETITION_RESULT: "text-amber-600",
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const [data, setData] = React.useState<FeedResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const fetchFeed = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiCall<FeedResponse>("/api/member/notifications", { method: "GET" })
      setData(res)
    } catch {
      // Best-effort. Could be a 403 (applicant) — just keep the bell empty.
      setData({ notifications: [], unreadCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount + every 60s.
  React.useEffect(() => {
    void fetchFeed()
    const interval = setInterval(() => void fetchFeed(), 60_000)
    return () => clearInterval(interval)
  }, [fetchFeed])

  async function handleMarkAllRead() {
    try {
      await apiCall("/api/member/notifications", { method: "POST" })
      setData((prev) => prev
        ? { unreadCount: 0, notifications: prev.notifications.map((n) => ({ ...n, isRead: true })) }
        : prev)
    } catch {
      // ignore
    }
  }

  const unread = data?.unreadCount ?? 0
  const items = data?.notifications ?? []

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) void fetchFeed() }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        >
          <IconBell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-[var(--danger)] ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-sm font-medium">
            Notifications
            {unread > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {unread} unread
              </span>
            )}
          </p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => {
                const Icon = ICON_FOR[n.type]
                return (
                  <li key={n.id}>
                    <Link
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className={
                        n.isRead
                          ? "flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40"
                          : "flex items-start gap-2 bg-azure-50/40 px-3 py-2.5 hover:bg-azure-50/60"
                      }
                    >
                      <Icon className={`size-4 mt-0.5 shrink-0 ${TONE_FOR[n.type]}`} />
                      <div className="min-w-0 flex-1">
                        <p className={n.isRead ? "text-sm text-foreground/90" : "text-sm font-medium text-foreground"}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        )}
                        <p className="mt-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                          {relativeTime(n.occurredAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--danger)]" aria-hidden />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
