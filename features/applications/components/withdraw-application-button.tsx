"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconX, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { apiCall } from "@/lib/api-client"

export function WithdrawApplicationButton() {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await apiCall("/api/applicant/withdraw", { method: "POST" })
      toast.success("Application withdrawn.")
      router.replace("/login")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to withdraw.")
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        {loading ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconX className="size-4 mr-1.5" />}
        Withdraw application
      </Button>
      <ConfirmDialog
        open={showConfirm}
        title="Withdraw your application?"
        description="This permanently removes your application. You can re-apply later. You'll be signed out after withdrawing."
        confirmLabel="Withdraw"
        destructive
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
