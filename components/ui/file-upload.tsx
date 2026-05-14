"use client"

import { useRef, useState } from "react"
import { IconCloudUpload, IconCheck, IconX, IconFile, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface UploadedAsset {
  id: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  publicUrl: string | null
}

interface FileUploadProps {
  kind: string
  seasonId?: string | null
  accept?: string
  value?: UploadedAsset | null
  onChange: (asset: UploadedAsset | null) => void
  disabled?: boolean
  className?: string
}

const DEFAULT_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp"

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  kind,
  seasonId,
  accept = DEFAULT_ACCEPT,
  value,
  onChange,
  disabled,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("kind", kind)
      if (seasonId) fd.append("seasonId", seasonId)
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? "Upload failed.")
      onChange(json as UploadedAsset)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  if (value) {
    return (
      <div className={cn("flex items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-2", className)}>
        <div className="flex items-center gap-2 min-w-0">
          <IconFile className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <a
              href={value.publicUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium truncate block hover:underline"
            >
              {value.fileName}
            </a>
            <p className="text-[11px] text-muted-foreground">
              {value.mimeType ?? "file"}{value.sizeBytes ? ` · ${formatSize(value.sizeBytes)}` : ""}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(null)}
          disabled={disabled || uploading}
          aria-label="Remove file"
        >
          <IconX className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="w-full justify-center"
      >
        {uploading ? (
          <>
            <IconLoader2 className="size-4 mr-1.5 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <IconCloudUpload className="size-4 mr-1.5" />
            Upload file
          </>
        )}
      </Button>
    </div>
  )
}

export function FilePreview({ asset, className }: { asset: UploadedAsset | null | undefined; className?: string }) {
  if (!asset || !asset.publicUrl) return null
  const isPdf = (asset.mimeType ?? "").includes("pdf") || asset.publicUrl.toLowerCase().endsWith(".pdf")
  const isImage = (asset.mimeType ?? "").startsWith("image/")
  if (isPdf) {
    return (
      <div className={cn("rounded-md overflow-hidden border bg-background", className)}>
        <iframe
          src={asset.publicUrl}
          title={asset.fileName}
          className="w-full h-[600px]"
        />
      </div>
    )
  }
  if (isImage) {
    return (
      <div className={cn("rounded-md overflow-hidden border bg-background", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.publicUrl} alt={asset.fileName} className="w-full max-h-[600px] object-contain" />
      </div>
    )
  }
  return (
    <a
      href={asset.publicUrl}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1.5 text-sm text-primary hover:underline", className)}
    >
      <IconFile className="size-4" />
      {asset.fileName}
    </a>
  )
}
