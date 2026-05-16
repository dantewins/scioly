"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconPlus, IconEdit, IconTrash, IconLink, IconFile, IconVideo, IconTable, IconFolder,
  IconFileText, IconExternalLink,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/empty-state"
import { apiCall } from "@/lib/api-client"
import {
  ResourceEditDialog,
  type ResourceFormValues,
} from "@/features/resources/components/resource-edit-dialog"

export interface ResourceRow {
  id: string
  title: string
  description: string | null
  type: "LINK" | "FILE" | "DOC" | "VIDEO" | "SHEET" | "FOLDER" | "OTHER"
  url: string
  eventId: string | null
  competitionId: string | null
  event: { id: string; name: string; code: string | null } | null
  competition: { id: string; name: string } | null
}

interface EventOption {
  id: string
  name: string
  code: string | null
}

interface Props {
  initial: ResourceRow[]
  events: EventOption[]
  canManage: boolean
}

const TYPE_ICON: Record<ResourceRow["type"], typeof IconLink> = {
  LINK: IconLink,
  DOC: IconFileText,
  SHEET: IconTable,
  VIDEO: IconVideo,
  FOLDER: IconFolder,
  FILE: IconFile,
  OTHER: IconLink,
}

export function ResourcesManager({ initial, events, canManage }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<ResourceRow[]>(initial)
  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResourceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Group resources by event (or "Season-wide" bucket).
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: ResourceRow[] }>()
    for (const r of rows) {
      const key = r.eventId ?? "__season"
      const label = r.event ? r.event.name : r.competition ? r.competition.name : "Season-wide"
      const bucket = map.get(key) ?? { label, rows: [] }
      bucket.rows.push(r)
      map.set(key, bucket)
    }
    // Season-wide first, then alphabetical by label
    const sorted = [...map.entries()].sort(([a], [b]) => {
      if (a === "__season") return -1
      if (b === "__season") return 1
      return (map.get(a)?.label ?? "").localeCompare(map.get(b)?.label ?? "")
    })
    return sorted.map(([key, bucket]) => ({ key, ...bucket }))
  }, [rows])

  function openCreate() {
    setEditing(null)
    setShowDialog(true)
  }

  function openEdit(row: ResourceRow) {
    setEditing(row)
    setShowDialog(true)
  }

  async function handleSubmit(values: ResourceFormValues) {
    setLoading(true)
    try {
      if (editing) {
        const updated = await apiCall<ResourceRow>(`/api/admin/resources/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: values.title,
            description: values.description || null,
            type: values.type,
            url: values.url,
            eventId: values.eventId,
          }),
        })
        setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...updated, event: events.find((e) => e.id === updated.eventId) ?? null } : x)))
        toast.success("Resource updated.")
      } else {
        const created = await apiCall<ResourceRow>("/api/admin/resources", {
          method: "POST",
          body: JSON.stringify(values),
        })
        const event = events.find((e) => e.id === created.eventId) ?? null
        setRows((r) => [{ ...created, event, competition: null }, ...r])
        toast.success("Resource added.")
      }
      setShowDialog(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiCall(`/api/admin/resources/${deleteTarget.id}`, { method: "DELETE" })
      setRows((r) => r.filter((x) => x.id !== deleteTarget.id))
      toast.success("Resource removed.")
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.")
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0 && !canManage) {
    return <EmptyState icon={IconLink} title="No resources yet" description="Your admin hasn't shared any study materials yet." />
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="size-3.5 mr-1.5" />
            New resource
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={IconLink}
          title="No resources yet"
          description="Add a link to a study packet, slide deck, video, or folder. Members will see it under their assigned events."
        />
      ) : (
        groups.map((group) => (
          <SectionCard key={group.key} title={group.label} flush>
            <ul className="divide-y divide-border/60">
              {group.rows.map((r) => {
                const Icon = TYPE_ICON[r.type]
                return (
                  <li key={r.id} className="flex items-start gap-3 px-[var(--card-px)] py-3">
                    <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-sm hover:underline"
                      >
                        {r.title}
                        <IconExternalLink className="size-3 text-muted-foreground" />
                      </a>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {r.type.toLowerCase()}
                        </Badge>
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} aria-label="Edit">
                          <IconEdit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}
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
          </SectionCard>
        ))
      )}

      <ResourceEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        events={events}
        initial={editing ? {
          title: editing.title,
          description: editing.description ?? "",
          type: editing.type,
          url: editing.url,
          eventId: editing.eventId,
        } : null}
        loading={loading}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Remove "${deleteTarget.title}"?` : "Remove?"}
        description="The link is removed for everyone who sees it. The original file at the URL is unaffected."
        confirmLabel="Remove"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
