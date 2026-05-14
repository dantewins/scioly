"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const PAYMENT_METHODS = ["CASH", "CHECK", "CARD", "ZELLE", "VENMO", "PAYPAL", "OTHER"] as const

interface PaymentFormProps {
  outstandingDollars?: string
  onSubmit: (data: {
    amountDollars: string
    method: string
    referenceNumber: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function PaymentForm({ outstandingDollars, onSubmit, loading, onCancel }: PaymentFormProps) {
  const [amountDollars, setAmountDollars] = useState("")
  const [method, setMethod] = useState("CASH")
  const [referenceNumber, setReferenceNumber] = useState("")

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ amountDollars, method, referenceNumber })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {outstandingDollars !== undefined && (
        <div className="text-sm text-muted-foreground">
          Outstanding: ${outstandingDollars}
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Amount Paid ($)</Label>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Reference Number (optional)</Label>
        <Input
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Check 1042 or Venmo transaction ID"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Recording..." : "Record Payment"}</Button>
      </DialogFooter>
    </form>
  )
}
