"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconMail, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"

interface Props {
  userId: string
  className?: string
}

export function ResendSetupButton({ userId, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await apiCall(`/api/admin/users/${userId}/resend-setup`, { method: "POST" })
      setSent(true)
      toast.success("Setup link resent.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading || sent}
      className={className}
    >
      {loading ? (
        <IconLoader2 className="size-3.5 mr-1.5 animate-spin" />
      ) : (
        <IconMail className="size-3.5 mr-1.5" />
      )}
      {sent ? "Sent" : "Resend setup link"}
    </Button>
  )
}
