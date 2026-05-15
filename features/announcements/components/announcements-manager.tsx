"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconEdit, IconPlus, IconPinFilled, IconPin, IconTrash, IconEyeOff, IconSpeakerphone,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { formatDateCompact } from "@/lib/format"
import { apiCall } from "@/lib/api-client"
import {
  AnnouncementEditDialog,
  type AnnouncementInput,
} from "@/features/announcements/components/announcement-edit-dialog"

export interface AnnouncementRow {
  id: string
  title: string
  body: string
  isPinned: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface Props {
  initial: AnnouncementRow[]
  canManage: boolean
}

function statusFor(row: AnnouncementRow): { label: string; tone: "success" | "warning" | "neutral" } {
  if (!row.publishedAt) return { label: "Draft", tone: "neutral" }
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return { label: "Expired", tone: "warning" }
  if (new Date(row.publishedAt) > new Date()) return { label: "Scheduled", tone: "neutral" }
  return { label: "Published", tone: "success" }
}

export function AnnouncementsManager({ initial, canManage }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<AnnouncementRow[]>(initial)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<AnnouncementRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setShowDialog(true)
  }

  function openEdit(row: AnnouncementRow) {
    setEditing(row)
    setShowDialog(true)
  }

  async function handleSubmit(values: AnnouncementInput) {
    if (!values.title.trim() || !values.body.trim()) {
      toast.error("Title and body are required.")
      return
    }
    setLoading(true)
    try {
      if (editing) {
        const updated = await apiCall<AnnouncementRow>(`/api/admin/announcements/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
        setRows((current) => current.map((r) => (r.id === editing.id ? { ...r, ...updated } : r)))
        toast.success("Announcement updated.")
      } else {
        const created = await apiCall<AnnouncementRow>("/api/admin/announcements", {
          method: "POST",
          body: JSON.stringify(values),
        })
        setRows((current) => [created, ...current])
        toast.success("Announcement posted.")
      }
      setShowDialog(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.")
    } finally {
      setLoading(false)
    }
  }

  async function togglePinned(row: AnnouncementRow) {
    const optimistic = !row.isPinned
    setRows((current) => current.map((r) => (r.id === row.id ? { ...r, isPinned: optimistic } : r)))
    try {
      await apiCall(`/api/admin/announcements/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: optimistic }),
      })
      router.refresh()
    } catch (error) {
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, isPinned: row.isPinned } : r)))
      toast.error(error instanceof Error ? error.message : "Failed to update.")
    }
  }

  async function unpublish(row: AnnouncementRow) {
    try {
      await apiCall(`/api/admin/announcements/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ publishedAt: null }),
      })
      setRows((current) => current.map((r) => (r.id === row.id ? { ...r, publishedAt: null } : r)))
      toast.success("Unpublished.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unpublish.")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiCall(`/api/admin/announcements/${deleteTarget.id}`, { method: "DELETE" })
      setRows((current) => current.filter((r) => r.id !== deleteTarget.id))
      toast.success("Announcement deleted.")
      setDeleteTarget(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.")
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0 && !canManage) {
    return <EmptyState icon={IconSpeakerphone} title="No announcements" />
  }

  return (
    <>
      <SectionCard
        title={`Announcements (${rows.length})`}
        action={canManage ? (
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="mr-1.5 size-[15px]" />
            New
          </Button>
        ) : undefined}
        flush
      >
        {rows.length === 0 ? (
          <div className="px-[var(--card-px)] py-6">
            <EmptyState
              icon={IconSpeakerphone}
              title="No announcements yet"
              description="Post the first one — pinned announcements show up at the top of every member's dashboard."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => {
              const status = statusFor(row)
              return (
                <li key={row.id} className="px-[var(--card-px)] py-3 flex items-start gap-3">
                  <span className="text-muted-foreground mt-1 shrink-0">
                    {row.isPinned ? <IconPinFilled className="size-4 text-azure-600" /> : <IconSpeakerphone className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-serif text-base leading-tight tracking-tight">{row.title}</p>
                      <StatusBadge status={status.label} tone={status.tone} />
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1 line-clamp-3">{row.body}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-muted-foreground mt-1.5">
                      {row.publishedAt && <span>Published {formatDateCompact(row.publishedAt)}</span>}
                      {!row.publishedAt && <span>Not published</span>}
                      {row.expiresAt && <span>· Expires {formatDateCompact(row.expiresAt)}</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => togglePinned(row)} aria-label={row.isPinned ? "Unpin" : "Pin"}>
                        {row.isPinned ? <IconPinFilled className="size-4 text-azure-600" /> : <IconPin className="size-4" />}
                      </Button>
                      {row.publishedAt && (
                        <Button variant="ghost" size="icon-sm" onClick={() => unpublish(row)} aria-label="Unpublish">
                          <IconEyeOff className="size-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit">
                        <IconEdit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                        aria-label="Delete"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <AnnouncementEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        initial={editing ? {
          title: editing.title,
          body: editing.body,
          isPinned: editing.isPinned,
          publishedAt: editing.publishedAt,
          expiresAt: editing.expiresAt,
        } : null}
        loading={loading}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : "Delete?"}
        description="This permanently removes the announcement. Members who haven't read it will no longer see it."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
